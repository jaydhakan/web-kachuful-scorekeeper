/**
 * App-wide milestones for the in-memory API (backend-requests.md §6): group counts of finished games (all kinds and
 * per game) and the one first the mock can see (a Kachuful game of 10+). Derived from the finished games after every
 * write; the seed's are there silently. Test control: `POST /api/__mock/milestone` makes one now, or with
 * `{ next: true }` on the next finished game, so an upload's `status.milestones` carries it.
 */
import type { MilestoneOut } from '../../src/sync/types';
import type { GameId } from '../../src/progression/types';
import type { KtGame } from '../../src/games/kaali-teeri/domain/types';
import { tableAsGame } from '../../src/games/spades/domain/achievements';
import { ishaaraFinished } from './ishaara';
import { tell } from './seatInvites';
import { spadesStored } from './spades';
import { spadesTablesStored } from './spadesOnline';
import type { Finished, RewardsKit } from './wardrobe';

interface Rec {
  key: string;
  kind: 'group' | 'first';
  game: GameId | null;
  gameId: string | null;
  n: number | null;
  players: string[];
  at: number;
}

const ALL = [100, 250, 500, 1000, 2500, 5000];
const PER_GAME = [50, 100, 250, 500, 1000];
const GAMES: GameId[] = ['kachuful', 'spades', 'kaali-teeri', 'ishaara'];

let kit: RewardsKit;
let known = new Map<string, Rec>();
/** Made by the test control: kept whatever the games say. */
let forced = new Set<string>();
/** Armed by `{ next: true }`: the finished-game count it was armed at. */
let armedAt: number | null = null;

type Seats = { id: string; status: string; finishedAt?: number; updatedAt: number };
const seated = (game: GameId, g: Seats, players: { playerId?: string }[]): Finished => ({
  game,
  gameId: g.id,
  endedAt: g.finishedAt ?? g.updatedAt,
  playerIds: players.flatMap((p) => (p.playerId ? [p.playerId] : [])),
});

/** Every finished game of every kind: Kachuful's and Kaali Teeri's come from the server module. */
export function finishedOf(kachuful: Finished[], kt: KtGame[]): Finished[] {
  const sp = [...spadesStored(), ...spadesTablesStored().map(tableAsGame)];
  return [
    ...kachuful,
    ...kt.filter((g) => g.status === 'finished').map((g) => seated('kaali-teeri', g, g.players)),
    ...sp.filter((g) => g.status === 'finished').map((g) => seated('spades', g, g.players)),
    ...ishaaraFinished().map((g) => seated('ishaara', g, g.players)),
  ];
}

const at = (g: Finished, r: Omit<Rec, 'gameId' | 'players' | 'at'>): Rec => ({
  ...r,
  gameId: g.gameId,
  players: g.playerIds,
  at: g.endedAt,
});

/** Every milestone the finished games make, by key. */
function derive(): Map<string, Rec> {
  const done = kit.finished().sort((a, b) => a.endedAt - b.endedAt);
  const out = new Map<string, Rec>();
  const put = (r: Rec) => out.set(r.key, r);
  for (const n of ALL)
    if (done[n - 1]) put(at(done[n - 1]!, { key: `group:all:${n}`, kind: 'group', game: null, n }));
  for (const game of GAMES) {
    const mine = done.filter((g) => g.game === game);
    for (const n of PER_GAME)
      if (mine[n - 1]) put(at(mine[n - 1]!, { key: `group:${game}:${n}`, kind: 'group', game, n }));
  }
  const ten = done.find((g) => g.game === 'kachuful' && g.playerIds.length >= 10);
  if (ten)
    put(at(ten, { key: 'first:kachuful:ten_players', kind: 'first', game: 'kachuful', n: null }));
  return out;
}

const out = (r: Rec): MilestoneOut => ({
  ...r,
  players: r.players.map((id) => kit.summaryOf(id)),
});

/** Tells every seated player's account and posts the feed item. */
function announce(r: Rec) {
  const m = out(r);
  for (const p of kit.players())
    if (p.linkedUserId && r.players.includes(p.id))
      tell(p.linkedUserId, 'milestone', { milestone: m });
  kit.feed({
    kind: 'milestone',
    gameKind: r.game ?? undefined,
    player: null,
    game: null,
    data: { key: r.key, n: r.n, gameId: r.gameId },
    createdAt: r.at,
  });
  return m;
}

/** Brings the table up to date with the games: the milestones this write created, announced. */
export function sweepMilestones(): MilestoneOut[] {
  const now = derive();
  const created: MilestoneOut[] = [];
  // A deleted game can move a milestone to a later one, or take it away.
  for (const k of [...known.keys()]) if (!forced.has(k) && !now.has(k)) known.delete(k);
  for (const [k, r] of now) {
    const had = known.get(k);
    known.set(k, r);
    if (!had) created.push(announce(r));
  }
  const done = kit.finished();
  if (armedAt != null && done.length > armedAt) {
    armedAt = null;
    const last = done.sort((a, b) => b.endedAt - a.endedAt)[0]!;
    created.push(force(`group:all:${done.length}`, last));
  }
  return created;
}

function force(key: string, g: Finished | undefined): MilestoneOut {
  const [kind, game, n] = key.split(':');
  const r: Rec = {
    key,
    kind: kind === 'first' ? 'first' : 'group',
    game: GAMES.includes(game as GameId) ? (game as GameId) : null,
    gameId: g?.gameId ?? null,
    n: kind === 'first' ? null : Number(n) || null,
    players: g?.playerIds ?? [],
    at: Date.now(),
  };
  known.set(key, r);
  forced.add(key);
  return announce(r);
}

export function milestoneRoutes(k: RewardsKit) {
  kit = k;
  const { on } = k;
  on('GET', '/api/milestones', ({ url }) =>
    kit.page(
      [...known.values()].sort((a, b) => b.at - a.at).map(out),
      url.searchParams.get('cursor'),
      Number(url.searchParams.get('limit') ?? 50),
    ),
  );
  on(
    'POST',
    '/api/__mock/milestone',
    ({ body }) => {
      const done = kit.finished().sort((a, b) => b.endedAt - a.endedAt);
      if (body.next === true) {
        armedAt = done.length;
        return { armed: true };
      }
      const key = typeof body.key === 'string' ? body.key : `group:all:${done.length}`;
      return force(key, done[0]);
    },
    'public',
  );
}

/** Takes the seed's milestones as already there, without announcing them (the server's seed()). */
export function resetMilestones() {
  known = kit ? derive() : new Map();
  forced = new Set();
  armedAt = null;
}
