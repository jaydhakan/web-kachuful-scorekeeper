/**
 * Ishaara's routes for the in-memory API (backend-requests.md §3–§5): the server runs the game, so this module holds
 * each game's key apart from its public state and runs every action through the app's domain. Its clock can be moved
 * on (`POST /api/__mock/ishaara/clock`) so e2e can pass the timer, undo and skip windows without waiting.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomInt } from 'node:crypto';
import {
  applyAction,
  dealKey,
  headToHead,
  join,
  leaderboard,
  newGame,
  other,
  playerRows,
  tallies,
  validateNew,
  wordsLeft,
  type Action,
  type ActionType,
  type Actor,
  type BoardRow,
  type Identity,
  type IshaaraPublic,
  type IshaaraRules,
  type IshaaraSort,
  type Seated,
  type Team,
} from '../../src/games/ishaara/domain/index';
import type { IshaaraGameOut, IshaaraSummaryOut } from '../../src/games/ishaara/sync/types';
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

/** What the server module lends this one: its router, errors, players and boards' periods. */
export interface IshaaraKit {
  on(
    method: string,
    path: string,
    h: (c: Ctx) => unknown,
    access?: 'public' | 'auth' | 'admin',
  ): void;
  err(status: number, code: string, extra?: Record<string, unknown>): Error;
  STREAM: symbol;
  RAW: symbol;
  players(): Player[];
  summaryOf(playerId: string): PlayerSummary;
  userName(userId: string): string;
  page<T>(items: T[], cursor: unknown, limit?: number): { items: T[]; nextCursor: string | null };
  /** Whether epoch ms `t` falls in a board period (`today`, `week`, `season`, `all`); null for an unknown one. */
  inPeriod(period: string, t: number): boolean | null;
}

interface IshRec {
  hostId: string;
  game: IshaaraPublic;
  key: Identity[];
  /** Applied action ids: a resend changes nothing. */
  actions: Set<string>;
  deletedAt: number | null;
}

let kit: IshaaraKit;
const NO_GAMES = {
  games: 0,
  wins: 0,
  winRate: 0,
  wordsFound: 0,
  wrongPicks: 0,
  trapHits: 0,
  clueGames: 0,
  clueWins: 0,
  cluesGiven: 0,
  avgClueNumber: null,
  penalties: 0,
};
let games = new Map<string, IshRec>();
let skew = 0;
const streams = new Map<string, Set<ServerResponse>>();
const now = () => Date.now() + skew;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TABLE_ACTIONS: ActionType[] = ['guess', 'endTurn', 'timeout', 'undoLast', 'resign', 'skip'];
const CLUE_ACTIONS: ActionType[] = ['clue', 'notAllowed', 'penaltyReveal'];

const live = () => [...games.values()].filter((r) => !r.deletedAt);
const playerOf = (id: string) => kit.players().find((p) => p.id === id);
const userOfSeat = (s: Seated) =>
  s.playerId ? (playerOf(s.playerId)?.linkedUserId ?? null) : null;

/** The team this account gives clues for in a game, if any. */
function teamOf(r: IshRec, me: Me): Team | null {
  const s = r.game.players.find((p) => p.role === 'clue-giver' && userOfSeat(p) === me.id);
  return s?.team ?? null;
}
const isMember = (r: IshRec, me: Me) =>
  r.hostId === me.id ||
  r.game.players.some((p) => p.playerId === me.playerId || userOfSeat(p) === me.id);

function find(id: string, me: Me): IshRec {
  const r = games.get(id);
  if (!r || r.deletedAt || (!isMember(r, me) && me.role !== 'admin'))
    throw kit.err(404, 'not_found');
  return r;
}

const out = (r: IshRec, me: Me): IshaaraGameOut => ({
  game: r.game,
  me: { host: r.hostId === me.id, team: teamOf(r, me) },
  serverNow: now(),
});

function frame(res: ServerResponse, event: string, data: unknown, id?: number) {
  res.write(`event: ${event}\n${id ? `id: ${id}\n` : ''}data: ${JSON.stringify(data)}\n\n`);
}
function notify(r: IshRec, event: string, data: unknown) {
  for (const res of streams.get(r.game.id) ?? []) frame(res, event, data);
}
/** Saves a new public state and tells every follower; a finish also sends `ended`. */
function save(r: IshRec, next: IshaaraPublic) {
  const was = r.game.status;
  r.game = next;
  for (const res of streams.get(next.id) ?? [])
    frame(res, 'state', { game: next, serverNow: now() }, next.rev);
  if (was !== 'finished' && next.status === 'finished')
    notify(r, 'ended', { winner: next.winner, endedBy: next.endedBy });
}

/** A key with `starting` holding the 9: the domain deals the team at random, so swap if it drew the other. */
function keyFor(starting: Team): Identity[] {
  const d = dealKey(randomInt(2 ** 31));
  if (d.starting === starting) return d.key;
  return d.key.map((x) => (x === 'sun' ? 'moon' : x === 'moon' ? 'sun' : x));
}

function seatsFrom(raw: unknown): Seated[] {
  if (!Array.isArray(raw)) throw kit.err(422, 'invalid_game', { reason: 'players' });
  return raw.map((p: Partial<Seated>) => {
    const pl = typeof p?.playerId === 'string' ? playerOf(p.playerId) : undefined;
    return {
      id: String(p?.id ?? p?.playerId ?? ''),
      name: String(p?.name ?? pl?.displayName ?? ''),
      emoji: String(p?.emoji ?? pl?.emoji ?? '🙂'),
      color: String(p?.color ?? pl?.color ?? '#888888'),
      playerId: p?.playerId,
      team: p?.team as Team,
      role: p?.role as Seated['role'],
    };
  });
}

/** Everything validateNew checks, plus: every seat a known player, clue-givers two different accounts. */
function check(players: Seated[], words: unknown, rules: unknown) {
  const problem = validateNew(players, words as string[], rules as IshaaraRules);
  if (problem) throw kit.err(422, 'invalid_game', { reason: problem });
  const unknown = players.map((p) => p.playerId!).filter((id) => !playerOf(id));
  if (unknown.length) throw kit.err(409, 'unknown_player', { playerIds: unknown });
  const givers = players.filter((p) => p.role === 'clue-giver').map(userOfSeat);
  if (givers.some((u) => !u) || givers[0] === givers[1])
    throw kit.err(422, 'invalid_game', { reason: 'clue-giver-account' });
}

function create(
  id: string,
  hostId: string,
  players: Seated[],
  words: string[],
  rules: IshaaraRules,
  starting: Team,
  match?: IshaaraPublic['match'],
): IshRec {
  const t = now();
  const r: IshRec = {
    hostId,
    game: newGame({ id, players, words, rules, starting, now: t, match }),
    key: keyFor(starting),
    actions: new Set(),
    deletedAt: null,
  };
  games.set(id, r);
  return r;
}

function summary(r: IshRec, me: Me): IshaaraSummaryOut {
  const g = r.game;
  return {
    id: g.id,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
    finishedAt: g.finishedAt ?? null,
    status: g.status,
    turn: g.turn,
    starting: g.starting,
    winner: g.winner,
    endedBy: g.endedBy,
    match: g.match,
    wordsLeft: { sun: wordsLeft(g, 'sun'), moon: wordsLeft(g, 'moon') },
    revealed: g.revealed.filter((x) => x !== null).length,
    host: { name: kit.userName(r.hostId) },
    players: g.players.map((p) => ({
      playerId: p.playerId ?? '',
      name: p.name,
      emoji: p.emoji,
      color: p.color,
      team: p.team,
      role: p.role,
    })),
    myTeam: teamOf(r, me),
  };
}

/** Rows of finished, non-abandoned games: what the server's ishaara_game_players holds. */
const boardRows = (): BoardRow[] =>
  live()
    .filter((r) => r.game.status === 'finished' && r.game.endedBy !== 'abandoned')
    .flatMap((r) =>
      playerRows(r.game).map((row) => ({
        ...row,
        gameId: r.game.id,
        finishedAt: r.game.finishedAt ?? r.game.updatedAt,
      })),
    );

function actionOf(body: Record<string, unknown>): Action {
  const type = body.type as ActionType;
  if (![...TABLE_ACTIONS, ...CLUE_ACTIONS].includes(type))
    throw kit.err(422, 'invalid', { fields: { type: 'unknown' } });
  const a = { ...body };
  delete a.actionId;
  delete a.rev;
  return a as unknown as Action;
}

/** Runs one action as the server does (§3, Action rules). */
function act(r: IshRec, me: Me, body: Record<string, unknown>): IshaaraGameOut {
  const actionId = body.actionId;
  if (typeof actionId !== 'string' || !UUID.test(actionId))
    throw kit.err(422, 'invalid', { fields: { actionId: 'must be a uuid' } });
  if (!Number.isInteger(body.rev)) throw kit.err(422, 'invalid', { fields: { rev: 'required' } });
  const action = actionOf(body);
  if (r.actions.has(actionId)) return out(r, me);
  if (body.rev !== r.game.rev) throw kit.err(409, 'stale', { game: out(r, me) });
  let actor: Actor | null = null;
  if (TABLE_ACTIONS.includes(action.type) && r.hostId === me.id) actor = { kind: 'table' };
  const team = teamOf(r, me);
  if (CLUE_ACTIONS.includes(action.type) && team) actor = { kind: 'clue-giver', team };
  if (!actor) throw kit.err(403, 'not_your_turn', { game: out(r, me) });
  const res = applyAction(r.game, r.key, action, actor, now());
  if (!res.ok) {
    // An overdue timer still ends the turn, even when the action itself fails.
    if (res.state !== r.game) save(r, res.state);
    const e = res.error;
    throw e.code === 'not_your_turn'
      ? kit.err(403, 'not_your_turn', { game: out(r, me) })
      : kit.err(422, 'invalid_action', { reason: e.reason, game: out(r, me) });
  }
  r.actions.add(actionId);
  save(r, res.state);
  return out(r, me);
}

/** The clue-giver for a rematch: the body's pick, else the next linked seat on the team after the current one. */
function nextGiver(g: IshaaraPublic, team: Team, pick: unknown): string {
  const seats = g.players.filter((p) => p.team === team);
  if (typeof pick === 'string') {
    const s = seats.find((p) => p.playerId === pick);
    if (!s || !userOfSeat(s)) throw kit.err(422, 'invalid_game', { reason: 'clue-giver-account' });
    return pick;
  }
  const at = seats.findIndex((p) => p.role === 'clue-giver');
  for (let k = 1; k <= seats.length; k++) {
    const s = seats[(at + k) % seats.length];
    if (userOfSeat(s)) return s.playerId!;
  }
  return seats[at].playerId!;
}

function rematch(r: IshRec, me: Me, body: Record<string, unknown>): [number, IshaaraGameOut] {
  const g = r.game;
  if (g.status !== 'finished') throw kit.err(422, 'invalid_action', { reason: 'not-finished' });
  if (g.next && games.has(g.next)) return [200, out(games.get(g.next)!, me)];
  if (typeof body.id !== 'string' || !UUID.test(body.id))
    throw kit.err(422, 'invalid', { fields: { id: 'must be a uuid' } });
  if (games.has(body.id)) throw kit.err(409, 'id_conflict');
  const picks = (body.clueGivers ?? {}) as Partial<Record<Team, unknown>>;
  const givers = { sun: nextGiver(g, 'sun', picks.sun), moon: nextGiver(g, 'moon', picks.moon) };
  const players = g.players.map((p) => ({
    ...p,
    role: p.playerId === givers[p.team] ? ('clue-giver' as const) : ('guesser' as const),
  }));
  check(players, body.words, g.rules);
  const m = g.match;
  const match =
    g.rules.bestOf === 3 && m.sunWins < 2 && m.moonWins < 2
      ? { game: m.game + 1, sunWins: m.sunWins, moonWins: m.moonWins }
      : { game: 1, sunWins: 0, moonWins: 0 };
  const n = create(
    body.id,
    r.hostId,
    players,
    body.words as string[],
    g.rules,
    other(g.starting),
    match,
  );
  save(r, { ...g, next: n.game.id, rev: g.rev + 1, updatedAt: now() });
  return [201, out(n, me)];
}

export function ishaaraRoutes(k: IshaaraKit) {
  kit = k;
  const { on, err } = k;

  on('POST', '/api/ishaara/games', ({ body, me }) => {
    if (typeof body.id !== 'string' || !UUID.test(body.id))
      throw err(422, 'invalid', { fields: { id: 'must be a uuid' } });
    const was = games.get(body.id);
    if (was) {
      if (was.hostId !== me!.id || was.deletedAt) throw err(409, 'id_conflict');
      return [200, out(was, me!)];
    }
    const players = seatsFrom(body.players);
    check(players, body.words, body.rules);
    const starting: Team = randomInt(2) ? 'sun' : 'moon';
    const r = create(
      body.id,
      me!.id,
      players,
      body.words as string[],
      body.rules as IshaaraRules,
      starting,
    );
    return [201, out(r, me!)];
  });

  on('GET', '/api/ishaara/games', ({ url, me }) => {
    const q = url.searchParams;
    const role = q.get('role');
    const status = q.get('status');
    const involving = q.get('involving');
    if (role && role !== 'clue-giver') throw err(422, 'invalid', { fields: { role: 'unknown' } });
    if (status && status !== 'active' && status !== 'finished')
      throw err(422, 'invalid', { fields: { status: 'unknown' } });
    const list = live()
      .filter((r) =>
        involving && me!.role === 'admin'
          ? r.game.players.some((p) => p.playerId === involving)
          : isMember(r, me!),
      )
      .filter((r) => role !== 'clue-giver' || !!teamOf(r, me!))
      .filter((r) => !status || (status === 'finished') === (r.game.status === 'finished'))
      .sort((a, b) => b.game.updatedAt - a.game.updatedAt)
      .map((r) => summary(r, me!));
    return kit.page(list, q.get('cursor'), Number(q.get('limit')) || 50);
  });

  on('GET', '/api/ishaara/games/:id', ({ m, me }) => out(find(m[0], me!), me!));

  on('GET', '/api/ishaara/games/:id/key', ({ m, me, res }) => {
    const r = games.get(m[0]);
    if (!r || r.deletedAt) throw err(404, 'not_found');
    const team = teamOf(r, me!);
    if (!team) throw err(403, 'forbidden');
    const joined = join(r.game, team, now());
    if (joined !== r.game) {
      save(r, joined);
      notify(r, 'joined', { team });
    }
    // Written here rather than by the router, which would mark it cacheable.
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ key: r.key, team }));
    return k.RAW;
  });

  on('POST', '/api/ishaara/games/:id/actions', ({ m, me, body }) =>
    act(find(m[0], me!), me!, body),
  );

  on('GET', '/api/ishaara/games/:id/events', ({ m, me, req, res }) => {
    const r = find(m[0], me!);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    });
    const set = streams.get(r.game.id) ?? new Set();
    set.add(res);
    streams.set(r.game.id, set);
    frame(res, 'state', { game: r.game, serverNow: now() }, r.game.rev);
    const ping = setInterval(() => frame(res, 'ping', {}), 25e3);
    req.on('close', () => {
      clearInterval(ping);
      set.delete(res);
    });
    return k.STREAM;
  });

  on('DELETE', '/api/ishaara/games/:id', ({ m, me }) => {
    const r = find(m[0], me!);
    if (r.hostId !== me!.id && me!.role !== 'admin') throw err(403, 'forbidden');
    r.deletedAt = now();
    for (const res of streams.get(r.game.id) ?? []) res.end();
    streams.delete(r.game.id);
    return null;
  });

  on('POST', '/api/ishaara/games/:id/rematch', ({ m, me, body }) => {
    const r = find(m[0], me!);
    if (r.hostId !== me!.id) throw err(403, 'forbidden');
    return rematch(r, me!, body);
  });

  on('GET', '/api/ishaara/leaderboard', ({ url }) => {
    const period = url.searchParams.get('period') ?? 'all';
    const sort = (url.searchParams.get('sort') ?? 'wins') as IshaaraSort;
    if (k.inPeriod(period, 0) === null)
      throw err(422, 'invalid', { fields: { period: 'unknown' } });
    if (!['wins', 'rate', 'found'].includes(sort))
      throw err(422, 'invalid', { fields: { sort: 'unknown' } });
    const rows = boardRows().filter((x) => k.inPeriod(period, x.finishedAt));
    return {
      period,
      sort,
      rows: leaderboard(rows, sort).map(({ playerId, ...t }) => ({
        ...t,
        player: k.summaryOf(playerId),
      })),
      generatedAt: now(),
    };
  });

  const known = (id: string) => {
    if (!playerOf(id)) throw err(404, 'not_found');
    return id;
  };
  on('GET', '/api/ishaara/players/:id/stats', ({ m }) => {
    const id = known(m[0]);
    const t = tallies(boardRows().filter((x) => x.playerId === id))[0];
    if (!t) return { ...NO_GAMES };
    return Object.fromEntries(Object.entries(t).filter(([f]) => f !== 'playerId'));
  });
  on('GET', '/api/ishaara/players/:a/vs/:b', ({ m }) => {
    const [a, b] = [known(m[0]), known(m[1])];
    return { a: k.summaryOf(a), b: k.summaryOf(b), ...headToHead(boardRows(), a, b) };
  });

  // Test control: moves Ishaara's clock on, so a timer, the undo window or the skip wait can pass at once.
  on(
    'POST',
    '/api/__mock/ishaara/clock',
    ({ body }) => {
      const ms = Number(body.advanceMs);
      if (!Number.isFinite(ms) || ms < 0)
        throw err(422, 'invalid', { fields: { advanceMs: 'ms' } });
      skew += ms;
      return { serverNow: now() };
    },
    'public',
  );
}

/** Plays a seeded game to its end through the domain, so History and the boards have something to show. */
function playOut(r: IshRec, how: 'all-found' | 'trap' | 'resign', at: number) {
  let t = at;
  const step = (action: Action, actor: Actor) => {
    t += 20_000;
    const res = applyAction(r.game, r.key, action, actor, t);
    if (res.ok) r.game = res.state;
    return res.ok;
  };
  for (const team of ['sun', 'moon'] as Team[]) r.game = join(r.game, team, (t += 1000));
  for (let turn = 0; r.game.status === 'active' && turn < 30; turn++) {
    const team = r.game.turn;
    step({ type: 'clue', word: null, number: 2 }, { kind: 'clue-giver', team });
    const free = (id: Identity) =>
      r.key.findIndex((x, i) => x === id && r.game.revealed[i] === null);
    if (how === 'resign' && turn === 3) step({ type: 'resign', team }, { kind: 'table' });
    else if (how === 'trap' && turn === 2)
      step({ type: 'guess', card: free('trap') }, { kind: 'table' });
    else {
      step({ type: 'guess', card: free(team) }, { kind: 'table' });
      if (r.game.status === 'active' && r.game.turn === team)
        step({ type: 'guess', card: turn % 3 ? free(team) : free('blank') }, { kind: 'table' });
      if (r.game.status === 'active' && r.game.turn === team)
        step({ type: 'endTurn' }, { kind: 'table' });
    }
  }
}

const SEED_WORDS = [
  [
    'river',
    'kite',
    'train',
    'cricket',
    'mango',
    'bridge',
    'mirror',
    'ghost',
    'wedding',
    'rocket',
    'temple',
    'pepper',
    'lion',
    'ocean',
    'film',
    'market',
    'needle',
    'crown',
    'shadow',
    'clock',
    'garden',
    'dosa',
    'thunder',
    'pilot',
    'chai',
  ],
  [
    'monsoon',
    'auto',
    'ladder',
    'paneer',
    'comb',
    'violin',
    'desert',
    'saree',
    'magnet',
    'tiger',
    'kettle',
    'pillow',
    'castle',
    'rain',
    'ticket',
    'island',
    'mustard',
    'feather',
    'cloud',
    'drum',
    'jungle',
    'samosa',
    'button',
    'circus',
    'anchor',
  ],
  [
    'peacock',
    'bucket',
    'lantern',
    'cinema',
    'parrot',
    'rocket',
    'umbrella',
    'honey',
    'glacier',
    'kite',
    'scooter',
    'mirror',
    'lassi',
    'statue',
    'compass',
    'wallet',
    'palace',
    'thread',
    'bamboo',
    'engine',
    'spinach',
    'tunnel',
    'candle',
    'whistle',
    'coconut',
  ],
];

/**
 * Forgets every Ishaara game, the clock skew and open streams, then seeds three finished games (Jay hosts, Riya and
 * Kabir give clues) so History and the boards have rows. Called from the server's seed().
 */
export function resetIshaara(at = Date.now()) {
  for (const set of streams.values()) for (const res of set) res.end();
  streams.clear();
  games = new Map();
  skew = 0;
  if (!kit) return;
  const by = (name: string) => kit.players().find((p) => p.displayName === name);
  const host = by('Jay')?.linkedUserId;
  const seats = ['Riya', 'Asha', 'Om', 'Kabir', 'Neha', 'Dev'].map(by);
  if (!host || seats.some((p) => !p)) return;
  const players: Seated[] = seats.map((p, i) => ({
    id: p!.id,
    name: p!.displayName,
    emoji: p!.emoji,
    color: p!.color,
    playerId: p!.id,
    team: i < 3 ? 'sun' : 'moon',
    role: i % 3 === 0 ? 'clue-giver' : 'guesser',
  }));
  const rules: IshaaraRules = {
    timerSec: null,
    clueEntry: 'spoken',
    packs: ['everyday'],
    bestOf: 1,
  };
  const ends = ['all-found', 'trap', 'resign'] as const;
  ends.forEach((how, i) => {
    const t0 = at - (3 - i) * 864e5;
    skew = t0 - Date.now();
    const r = create(
      `5eed0000-0000-4000-8000-00000000000${i + 1}`,
      host,
      players,
      SEED_WORDS[i],
      rules,
      i % 2 ? 'moon' : 'sun',
    );
    playOut(r, how, t0);
  });
  skew = 0;
}
