/**
 * Spades table mode's routes for the in-memory API (`/api/spades/*`, kind `spades`), with Kaali Teeri's upload
 * semantics. Uploads are checked with the app's domain and the boards come from domain/boards.ts, the same rules
 * as the server's stats. Online tables (`spades-online`) are not here.
 */
import { createHash } from 'node:crypto';
import { sweepMilestones } from './milestones';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  STANDARD_RULES,
  dealerFor,
  gameResult,
  scoresOf,
  tableHand,
  teamOf,
  totals,
  validate,
  type Seat,
  type SpGame,
  type SpHand,
} from '../../src/games/spades/domain/index';
import {
  SP_PERIODS,
  SP_SORTS,
  spHeadToHead,
  spLeaderboard,
  spPlayerStats,
  type SpPeriod,
  type SpSort,
} from '../../src/games/spades/domain/boards';
import type { SpGameSummary } from '../../src/games/spades/table/sync/types';
import type { Player, PlayerSummary } from '../../src/sync/types';

interface Me {
  id: string;
  role: 'admin' | 'member';
  playerId: string | null;
}
interface Ctx {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  body: Record<string, unknown>;
  me: Me | null;
  m: string[];
}

/** A stored table-mode game: the same row shape as the server module's games, so share links work on it. */
export interface SpRec {
  kind: 'spades';
  key: string;
  payload: SpGame;
  ownerId: string;
  rev: number;
  hash: string;
  updatedAt: number;
  deletedAt: number | null;
  links: Partial<Record<'live' | 'recap', string>>;
  scorerSeenAt: number;
}

/** What the server module lends this one. */
export interface SpadesKit {
  on(
    method: string,
    path: string,
    h: (c: Ctx) => unknown,
    access?: 'public' | 'auth' | 'admin',
  ): void;
  err(status: number, code: string, extra?: Record<string, unknown>): Error;
  players(): Player[];
  summaryOf(playerId: string): PlayerSummary;
  userName(userId: string | null): string;
  photoUrl(playerId: string | null): string | null;
  page<T>(items: T[], cursor: unknown, limit?: number): { items: T[]; nextCursor: string | null };
  /** A merged player's id followed to the one it became. */
  resolve(playerId: string): string;
  /** 'YYYY-MM-DD' of an instant in the server's timezone. */
  dayOf(t: number): string;
  /** Another kind of game is stored under this id. */
  otherKind(id: string): boolean;
  /** Soft delete as every kind's: links revoked, viewers told, the data version bumped. */
  drop(r: SpRec): void;
  /** A stored game changed: the data version bumps and live viewers get the new body. */
  changed(r: SpRec): void;
  dataVersion(): number;
}

let kit: SpadesKit;
let games = new Map<string, SpRec>();

const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const live = () => [...games.values()].filter((r) => !r.deletedAt);
const done = (g: SpGame) => g.hands.filter((h) => h.phase === 'done');

/** Seats keyed by registry id, merged ids followed, as the server's derived rows are. */
const resolved = (g: SpGame): SpGame => ({
  ...g,
  players: g.players.map((p) => ({ ...p, playerId: p.playerId && kit.resolve(p.playerId) })),
});

/** The stored game under an id, deleted ones included (the server module's share links and kind checks). */
export const spadesGame = (id: string): SpRec | undefined => games.get(id);

/** When a game ended (finished or cancelled), as the server's ended_at; null while active. */
export const spEndedAt = (r: SpRec): number | null =>
  r.payload.status === 'active' ? null : (r.payload.finishedAt ?? r.updatedAt);

export function spSummary(r: SpRec, pub = false): SpGameSummary {
  const g = r.payload;
  return {
    id: r.key,
    kind: 'spades',
    owner: { id: pub ? null : r.ownerId, name: kit.userName(r.ownerId) },
    createdAt: g.createdAt,
    finishedAt: g.finishedAt ?? null,
    updatedAt: r.updatedAt,
    status: g.status,
    hands: done(g).length,
    target: g.rules.target,
    players: g.players.map((p, i) => ({
      playerId: p.playerId ?? null,
      name: p.name,
      emoji: p.emoji,
      color: p.color,
      photoUrl: kit.photoUrl(p.playerId ?? null),
      team: teamOf(i as Seat),
    })),
    scores: scoresOf(totals(g.hands)),
    result: g.status === 'finished' ? (g.result ?? null) : null,
    live: !!r.links.live,
  };
}

/** Every stored game, not deleted, merged players followed: what achievements and awards are worked out from. */
export const spadesStored = (): SpGame[] => live().map((r) => resolved(r.payload));

/** A player as the server's feed items carry them. */
export const spPlayerSummary = (playerId: string): PlayerSummary => kit.summaryOf(playerId);

/** Every live game's seats, for the seat invites' circle. */
export const spadesSeatings = () =>
  live().map((r) => ({
    playerIds: r.payload.players.flatMap((p) => (p.playerId ? [kit.resolve(p.playerId)] : [])),
    at: r.updatedAt,
  }));

export function spadesRoutes(k: SpadesKit) {
  kit = k;
  const { on, err } = k;

  on('PUT', '/api/spades/games/:id', ({ m, body, me }) => {
    const w = body as unknown as SpGame;
    if (w.kind !== 'spades' || !Array.isArray(w.players) || !Array.isArray(w.hands))
      throw err(422, 'invalid', { fields: { body: 'not a Spades game' } });
    if (w.syncId !== m[0]) throw err(422, 'invalid_game', { reason: 'id', handIndex: null });
    if (k.otherKind(m[0])) throw err(409, 'kind_mismatch');
    const prev = games.get(m[0]);
    if (prev?.deletedAt) throw err(410, 'gone');
    if (prev && prev.ownerId !== me!.id && me!.role !== 'admin') throw err(403, 'forbidden');
    // A game with no hand done leaves no trace: nothing stored, and an older copy goes.
    if (!done(w).length) {
      if (prev) k.drop(prev);
      return { rev: w.rev, earned: [] };
    }
    const h = hash(JSON.stringify(w));
    if (prev?.hash === h) return { rev: prev.rev, earned: [] };
    if (prev && w.rev <= prev.rev) throw err(409, 'stale', { server: prev.payload });
    if (w.players.some((p) => !p.playerId))
      throw err(422, 'invalid_game', { reason: 'players', handIndex: null });
    const players = k.players();
    const unknown = w.players
      .map((p) => p.playerId!)
      .filter((id) => !players.some((p) => p.id === id));
    if (unknown.length) throw err(422, 'unknown_player', { playerIds: unknown });
    const remap: Record<string, string> = {};
    for (const p of w.players) {
      const r = k.resolve(p.playerId!);
      if (r !== p.playerId) [remap[p.playerId!], p.playerId] = [r, r];
    }
    const bad = validate(w, Date.now());
    if (bad) throw err(422, 'invalid_game', { ...bad });
    const rec = put(w, prev?.ownerId ?? me!.id, h, prev);
    k.changed(rec);
    // The mock moves no Spades titles on a write; milestones it does (backend-requests §1, §6).
    const status = { changes: [], bounties: [], milestones: sweepMilestones() };
    return { rev: w.rev, earned: [], status, ...(Object.keys(remap).length && { remap }) };
  });

  on('GET', '/api/spades/games', ({ url, me }) => {
    const since = Number(url.searchParams.get('updatedSince')) || 0;
    const mine = url.searchParams.get('mine') === 'true';
    const involving = url.searchParams.get('involving') === 'true';
    const status = url.searchParams.get('status');
    if (status !== null && status !== 'active')
      throw err(422, 'invalid', { fields: { status: 'must be active' } });
    // Scored, or sat in: matched on the stored seats, so deleted games still come back as tombstones.
    const sat = (g: SpRec) =>
      g.ownerId === me!.id ||
      (!!me!.playerId &&
        g.payload.players.some((p) => p.playerId && k.resolve(p.playerId) === me!.playerId));
    const list = [...games.values()]
      .filter(
        (g) =>
          g.updatedAt > since &&
          (involving ? sat(g) : !mine || g.ownerId === me!.id) &&
          (!g.deletedAt || since > 0) &&
          (!status || (!g.deletedAt && g.payload.status === 'active')),
      )
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((g) =>
        g.deletedAt ? { id: g.key, deleted: true as const, updatedAt: g.updatedAt } : spSummary(g),
      );
    return k.page(
      list,
      url.searchParams.get('cursor'),
      Number(url.searchParams.get('limit')) || 50,
    );
  });

  on('GET', '/api/spades/games/:id', ({ m }) => {
    const r = games.get(m[0]);
    if (!r || r.deletedAt) throw err(404, 'not_found');
    return { game: r.payload, summary: spSummary(r) };
  });

  on('DELETE', '/api/spades/games/:id', ({ m, me }) => {
    const r = games.get(m[0]);
    if (!r || r.deletedAt) throw err(404, 'not_found');
    if (r.ownerId !== me!.id && me!.role !== 'admin') throw err(403, 'forbidden');
    k.drop(r);
    return null;
  });

  on('GET', '/api/spades/bootstrap', ({ me }) => ({
    myGames: live()
      .filter((g) => g.ownerId === me!.id)
      .map((g) => spSummary(g)),
    dataVersion: k.dataVersion(),
  }));

  const counted = () => live().map((r) => resolved(r.payload));

  on('GET', '/api/spades/leaderboard', ({ url }) => {
    const period = (url.searchParams.get('period') ?? 'all') as SpPeriod;
    const sort = (url.searchParams.get('sort') ?? 'wins') as SpSort;
    if (!SP_PERIODS.includes(period)) throw err(422, 'invalid', { fields: { period: 'unknown' } });
    if (!SP_SORTS.includes(sort)) throw err(422, 'invalid', { fields: { sort: 'unknown' } });
    const board = spLeaderboard(counted(), { period, sort, dayOf: k.dayOf });
    return {
      period,
      sort,
      rows: board.rows.map(({ rank, player, value, totals: t }) => ({
        ...t,
        rank,
        player: k.summaryOf(player),
        value,
      })),
      pairs: board.pairs.map(({ a, b, ...rest }) => ({
        ...rest,
        a: k.summaryOf(a),
        b: k.summaryOf(b),
      })),
      generatedAt: Date.now(),
    };
  });

  const player = (id: string) => {
    if (!k.players().some((p) => p.id === id)) throw err(404, 'not_found');
    return k.resolve(id);
  };
  on('GET', '/api/spades/players/:id/stats', ({ m }) => {
    const { partners, ...rest } = spPlayerStats(counted(), player(m[0]));
    return {
      ...rest,
      partners: partners.map(({ player: playerId, ...p }) => ({ playerId, ...p })),
    };
  });
  on('GET', '/api/spades/players/:id/games', ({ m, url }) => {
    const id = player(m[0]);
    const list = live()
      .filter((r) => resolved(r.payload).players.some((p) => p.playerId === id))
      .sort((a, b) => b.payload.createdAt - a.payload.createdAt)
      .map((r) => spSummary(r));
    return k.page(
      list,
      url.searchParams.get('cursor'),
      Number(url.searchParams.get('limit')) || 50,
    );
  });
  on('GET', '/api/spades/players/:a/vs/:b', ({ m }) => {
    const [a, b] = [player(m[0]), player(m[1])];
    return { a: k.summaryOf(a), b: k.summaryOf(b), ...spHeadToHead(counted(), a, b) };
  });
}

function put(w: SpGame, ownerId: string, h: string, prev?: SpRec): SpRec {
  const now = Date.now();
  const rec: SpRec = {
    kind: 'spades',
    key: w.syncId,
    payload: w,
    ownerId,
    rev: w.rev,
    hash: h,
    updatedAt: now,
    deletedAt: null,
    links: prev?.links ?? {},
    scorerSeenAt: now,
  };
  games.set(w.syncId, rec);
  return rec;
}

const MIN = 60e3;
// Team a's tricks per hand, cycled; one hand in each game has a Nil, so every column of the board has numbers.
const TRICKS = [7, 5, 8, 6, 4, 9, 6, 7];
const BIDS: number[][] = [
  [3, 3, 4, 3],
  [2, 4, 3, 3],
  [4, 3, 3, 2],
  [0, 4, 5, 3],
];

/** A finished game played hand by hand until the domain says it is over; null if the seed's numbers never end it. */
function seedGame(n: number, seats: Player[], start: number): SpGame | null {
  const g: SpGame = {
    kind: 'spades',
    schemaVersion: 1,
    id: `seed-sp-${n}`,
    syncId: `5eed5bad-0000-4000-8000-00000000000${n}`,
    rev: 1,
    createdAt: start,
    updatedAt: start,
    players: seats.map((p, i) => ({
      id: `p${i}`,
      name: p.displayName,
      emoji: p.emoji,
      color: p.color,
      playerId: p.id,
    })),
    firstDealerIndex: n % 4,
    direction: 'cw',
    rules: { ...STANDARD_RULES },
    hands: [],
    status: 'active',
  };
  for (let i = 0; i < 40; i++) {
    const bids = BIDS[(i + n) % BIDS.length];
    const teamA = TRICKS[(i + n) % TRICKS.length];
    const hand: SpHand = tableHand({
      index: i,
      dealer: dealerFor(g, i),
      bids,
      teamA,
      nilTricks: bids.map((b) => (b === 0 ? 0 : null)),
      doneAt: start + (i + 1) * 8 * MIN,
    });
    g.hands.push(hand);
    g.rev++;
    g.updatedAt = hand.doneAt!;
    const r = gameResult(g);
    if (r && r !== 'tie') {
      Object.assign(g, { status: 'finished', result: r, finishedAt: g.updatedAt });
      return validate(g, g.updatedAt) ? null : g;
    }
  }
  return null;
}

/**
 * Forgets every table-mode game, then seeds three finished ones (Jay and Riya score; the demo players sit) so the
 * Spades boards have rows. Called from the server's seed().
 */
export function resetSpades(at = Date.now()) {
  games = new Map();
  if (!kit) return;
  const by = (name: string) => kit.players().find((p) => p.displayName === name);
  const tables = [
    ['Jay', 'Riya', 'Kabir', 'Asha'],
    ['Riya', 'Om', 'Neha', 'Kabir'],
    ['Jay', 'Dev', 'Riya', 'Zoya'],
  ].map((names) => names.map(by));
  tables.forEach((seats, i) => {
    if (seats.some((p) => !p)) return;
    const g = seedGame(i + 1, seats as Player[], at - (3 - i) * 864e5);
    // The first seat scores: Jay's account for two, Riya's for one.
    const owner = seats[0]!.linkedUserId;
    if (!g || !owner) return;
    put(g, owner, hash(JSON.stringify(g)));
  });
}
