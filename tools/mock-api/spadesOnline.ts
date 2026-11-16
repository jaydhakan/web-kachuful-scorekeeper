/**
 * Spades online tables for the in-memory API (backend-requests.md §4): the server runs the game, so this module holds
 * each table's private hands apart from its public state and runs every action through the app's domain. Each
 * follower gets its own frame (only its own hand). Test controls: `POST /api/__mock/spades/seed` makes the shuffles
 * repeatable, and `POST /api/__mock/spades/clock` moves the clock on so a turn timer can pass at once.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomInt } from 'node:crypto';
import {
  applyAction,
  dealSeeded,
  deck,
  isOver,
  isSeat,
  newTable,
  partnerOf,
  rematchTable,
  scoresOf,
  seatOf,
  seeded,
  setRules,
  sit,
  totalsOf,
  viewFor,
  type Action,
  type Card,
  type Refusal,
  type Seat,
  type SeatResult,
  type SpPublic,
  type SpRules,
  type SpWho,
} from '../../src/games/spades/domain/index';
import type { SpTableSummary, SpViewOut } from '../../src/games/spades/online/sync/types';
import type { Player } from '../../src/sync/types';
import { pendingSeatInvites, type SeatKindRules } from './seatInvites';

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

/** What the server module lends this one. */
export interface SpadesKit {
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
  photoUrl(playerId: string | null): string | null;
  page<T>(items: T[], cursor: unknown, limit?: number): { items: T[]; nextCursor: string | null };
}

interface Rec {
  state: SpPublic;
  hands: Card[][] | null;
  /** Applied action ids: a resend changes nothing. */
  actions: Set<string>;
  deletedAt: number | null;
}
interface Follower {
  res: ServerResponse;
  userId: string;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REACT_GAP_MS = 2000;
const ABSENT_MS = 60_000;

let kit: SpadesKit;
let tables = new Map<string, Rec>();
let skew = 0;
/** A seeded shuffle for tests; each draw and deal takes the next number. */
let seed: number | null = null;
const streams = new Map<string, Set<Follower>>();
/** Per table and user: when their stream last opened, pinged or closed. */
const lastSeen = new Map<string, number>();
const reacted = new Map<string, number>();
const now = () => Date.now() + skew;

const live = () => [...tables.values()].filter((r) => !r.deletedAt);
const playerOf = (id: string | null) => (id ? kit.players().find((p) => p.id === id) : undefined);

function find(id: string): Rec {
  const r = tables.get(id);
  if (!r || r.deletedAt) throw kit.err(404, 'not_found');
  return r;
}

function whoOf(me: Me): SpWho {
  const p = playerOf(me.playerId);
  if (!p) throw kit.err(409, 'no_player');
  return {
    userId: me.id,
    playerId: p.id,
    name: p.displayName,
    emoji: p.emoji,
    color: p.color,
    photoUrl: kit.photoUrl(p.id),
  };
}

function invitesOf(id: string): SpViewOut['invites'] {
  const out: SpViewOut['invites'] = [null, null, null, null];
  for (const i of pendingSeatInvites('spades-online', id)) {
    const p = kit.players().find((x) => x.linkedUserId === i.to && !x.mergedInto);
    out[Number(i.seat)] = {
      id: i.id,
      userId: i.to,
      name: p?.displayName ?? 'Someone',
      emoji: p?.emoji ?? '🙂',
      color: p?.color ?? '#888888',
      photoUrl: kit.photoUrl(p?.id ?? null),
    };
  }
  return out;
}

const viewOf = (r: Rec, userId: string): SpViewOut => ({
  ...viewFor(r.state, r.hands, seatOf(r.state, userId), now()),
  invites: invitesOf(r.state.id),
});

function frame(res: ServerResponse, event: string, data: unknown, id?: number) {
  res.write(`event: ${event}\n${id ? `id: ${id}\n` : ''}data: ${JSON.stringify(data)}\n\n`);
}

/** Who is connected, by seat: a seat is here while its account has the table's stream open. */
function presence(r: Rec): boolean[] {
  const open = new Set([...(streams.get(r.state.id) ?? [])].map((f) => f.userId));
  return r.state.seats.map((x) => !!x.who && open.has(x.who.userId));
}

/** Every follower gets its own view of the table (only its own hand), and the seats' presence. */
function broadcast(r: Rec) {
  const set = streams.get(r.state.id);
  if (!set) return;
  const seats = presence(r);
  for (const f of set) {
    frame(f.res, 'state', viewOf(r, f.userId), r.state.rev);
    frame(f.res, 'seat-presence', { seats });
  }
}

function save(r: Rec, state: SpPublic, hands: Card[][] | null = r.hands) {
  const was = r.state.status;
  r.state = state;
  r.hands = hands;
  broadcast(r);
  if (!isOver({ status: was }) && isOver(state))
    for (const f of streams.get(state.id) ?? []) frame(f.res, 'ended', { result: state.result });
}

function newCode(): string {
  const taken = new Set(
    live()
      .filter((r) => !isOver(r.state))
      .map((r) => r.state.code),
  );
  for (;;) {
    const c = Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join(
      '',
    );
    if (!taken.has(c)) return c;
  }
}

function shuffled(): Card[] {
  const d = deck();
  const rnd = seed === null ? () => randomInt(1 << 30) / (1 << 30) : seeded(seed++);
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}
function deal(): Card[][] {
  if (seed !== null) return dealSeeded(seed++);
  const d = shuffled();
  return [0, 1, 2, 3].map((s) => d.slice(s * 13, s * 13 + 13));
}

function refused(r: Rec, me: Me, e: Refusal): Error {
  return e.code === 'not_your_turn'
    ? kit.err(403, 'not_your_turn', { game: viewOf(r, me.id) })
    : kit.err(422, 'invalid_action', { reason: e.reason, game: viewOf(r, me.id) });
}

/** The join route and an accepted seat invite share the domain's `sit`. */
function seatResult(r: Rec, me: Me, res: SeatResult): SpViewOut {
  if (!res.ok) {
    if (res.error.code === 'invalid_action' && res.error.reason === 'full')
      throw kit.err(409, 'full', { game: viewOf(r, me.id) });
    throw refused(r, me, res.error);
  }
  if (res.state !== r.state) save(r, res.state);
  return viewOf(r, me.id);
}

function rulesOf(x: unknown): SpRules {
  const o = (x ?? {}) as Record<string, unknown>;
  return {
    target: o.target as number | null,
    timerSec: o.timerSec as 30 | 60 | null,
    nil: o.nil as boolean,
    blindNil: o.blindNil as boolean,
    minTeamBid: o.minTeamBid as number | null,
    mercy: o.mercy as number | null,
  };
}

/** Runs one action as the server does (§4.3–§4.4). */
function act(r: Rec, me: Me, body: Record<string, unknown>): SpViewOut {
  const actionId = body.actionId;
  if (typeof actionId !== 'string' || !UUID.test(actionId))
    throw kit.err(422, 'invalid', { fields: { actionId: 'must be a uuid' } });
  if (!Number.isInteger(body.rev)) throw kit.err(422, 'invalid', { fields: { rev: 'required' } });
  const rev = body.rev as number;
  const action = Object.fromEntries(
    Object.entries(body).filter(([k]) => k !== 'actionId' && k !== 'rev'),
  ) as unknown as Action;
  if (r.actions.has(actionId)) return viewOf(r, me.id);
  const seat = seatOf(r.state, me.id);
  // A timeout from an older rev is judged by the domain (a no-op once its turn is settled), not as stale.
  if (action.type !== 'timeout' && action.type !== 'react' && rev !== r.state.rev)
    throw kit.err(409, 'stale', { game: viewOf(r, me.id) });
  if (action.type === 'react' && seat !== null) {
    const key = `${r.state.id}:${seat}`;
    if (now() - (reacted.get(key) ?? 0) < REACT_GAP_MS)
      throw kit.err(429, 'rate_limited', { retryAfter: 2 });
  }
  const turnUser = r.state.turn !== null ? r.state.seats[r.state.turn]?.who?.userId : undefined;
  const open = turnUser
    ? [...(streams.get(r.state.id) ?? [])].some((f) => f.userId === turnUser)
    : false;
  const res = applyAction(r.state, action, seat, {
    now: now(),
    hands: r.hands,
    rev,
    ...(action.type === 'drawForDeal' && { draw: shuffled().slice(0, 4) }),
    ...(action.type === 'deal' && { deal: deal() }),
    ...(action.type === 'timeout' && {
      lastSeenAt: open ? now() : (lastSeen.get(`${r.state.id}:${turnUser}`) ?? now() - ABSENT_MS),
    }),
  });
  if (!res.ok) throw refused(r, me, res.error);
  r.actions.add(actionId);
  if (action.type === 'react') {
    reacted.set(`${r.state.id}:${seat}`, now());
    for (const f of streams.get(r.state.id) ?? [])
      frame(f.res, 'reaction', { seat, emoji: action.emoji });
    return viewOf(r, me.id);
  }
  if (res.noop) return viewOf(r, me.id);
  save(r, res.state, res.hands);
  if (action.type === 'rematch' && !tables.has(action.id)) {
    const next = rematchTable(res.state, {
      id: action.id,
      code: newCode(),
      now: now(),
      swap: action.swap,
    });
    tables.set(next.id, { state: next, hands: null, actions: new Set(), deletedAt: null });
  }
  return viewOf(r, me.id);
}

function summary(r: Rec, me: Me): SpTableSummary {
  const s = r.state;
  const mySeat = seatOf(s, me.id);
  return {
    id: s.id,
    kind: 'spades-online',
    code: s.code,
    name: s.name,
    status: s.status,
    phase: s.phase,
    paused: s.paused,
    rules: s.rules,
    host: s.host,
    seats: s.seats.map((x) =>
      x.who
        ? {
            playerId: x.who.playerId,
            name: x.who.name,
            emoji: x.who.emoji,
            color: x.who.color,
            photoUrl: x.who.photoUrl ?? null,
          }
        : null,
    ),
    scores: scoresOf(totalsOf(s)),
    hands: s.history.length,
    result: s.result,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    finishedAt: s.finishedAt ?? null,
    mySeat,
    isHost: mySeat !== null && mySeat === s.host,
    turn: s.turn,
  };
}

/** A small stand-in for the server's QR (any valid SVG): the join code, framed. */
function qrSvg(code: string): string {
  const rnd = seeded([...code].reduce((n, c) => n * 31 + c.charCodeAt(0), 7));
  const cells: string[] = [];
  for (let y = 0; y < 21; y++)
    for (let x = 0; x < 21; x++) {
      const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
      const on = finder
        ? x % 6 === 0 ||
          y % 6 === 0 ||
          x === 20 ||
          y === 20 ||
          (x % 7 > 1 && x % 7 < 5 && y % 7 > 1 && y % 7 < 5)
        : rnd() > 0.5;
      if (on) cells.push(`M${x + 2} ${y + 2}h1v1h-1z`);
    }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25" shape-rendering="crispEdges"><title>Join ${code}</title><rect width="25" height="25" fill="#fff"/><path d="${cells.join('')}" fill="#000"/></svg>`;
}

/** Seat invites to Spades seats: lobby only, a free seat, someone not already at the table. */
export const spadesSeatKind: SeatKindRules = {
  host: (id) => {
    const r = tables.get(id);
    if (!r || r.deletedAt) return null;
    return r.state.seats[r.state.host].who?.userId ?? null;
  },
  closed: (id, seat) => {
    const r = tables.get(id);
    if (!r || r.deletedAt || isOver(r.state)) return true;
    const open = r.state.status === 'lobby' || r.state.paused === 'replace';
    return !open || !!r.state.seats[Number(seat)]?.who;
  },
  table: (id) => {
    const r = tables.get(id);
    return {
      name: r?.state.name ?? '',
      seatsTaken: (r?.state.seats ?? []).flatMap((x, i) => (x.who ? [i] : [])),
    };
  },
  partner: (id, seat) => {
    const r = tables.get(id);
    const s = Number(seat);
    if (!r || !isSeat(s)) return null;
    const p = r.state.seats[partnerOf(s)]?.who;
    return p ? { name: p.name } : null;
  },
  accept: (id, seat, userId) => {
    const r = tables.get(id);
    const s = Number(seat);
    if (!r || r.deletedAt || !isSeat(s)) return 'filled';
    const p = kit.players().find((x) => x.linkedUserId === userId && !x.mergedInto);
    if (!p) return 'filled';
    const who: SpWho = {
      userId,
      playerId: p.id,
      name: p.displayName,
      emoji: p.emoji,
      color: p.color,
      photoUrl: kit.photoUrl(p.id),
    };
    const res = sit(r.state, who, s, now());
    if (!res.ok) return 'filled';
    save(r, res.state);
    return 'ok';
  },
  check: (id, seat, toUser) => {
    const r = find(id);
    if (r.state.status !== 'lobby' && r.state.paused !== 'replace')
      throw kit.err(409, 'seat_taken');
    if (r.state.seats[Number(seat)]?.who) throw kit.err(409, 'seat_taken');
    if (seatOf(r.state, toUser) !== null) throw kit.err(409, 'already_seated');
  },
  changed: (id) => {
    const r = tables.get(id);
    if (r && !r.deletedAt) broadcast(r);
  },
};

export function spadesOnlineRoutes(k: SpadesKit) {
  kit = k;
  const { on, err } = k;

  on('POST', '/api/spades/tables', ({ body, me }) => {
    const id = body.id;
    if (typeof id !== 'string' || !UUID.test(id))
      throw err(422, 'invalid', { fields: { id: 'must be a uuid' } });
    if (tables.has(id)) throw err(409, 'id_conflict');
    const host = whoOf(me!);
    const name =
      typeof body.name === 'string' && body.name.trim() ? body.name.trim() : `${host.name}'s table`;
    const rules = rulesOf(body.rules);
    const state = newTable({ id, code: newCode(), name, rules, host, now: now() });
    const ok = setRules(state, 0, rules, name, now());
    if (!ok.ok) throw err(422, 'invalid_action', { reason: 'bad-rules' });
    const r: Rec = { state, hands: null, actions: new Set(), deletedAt: null };
    tables.set(id, r);
    return [201, viewOf(r, me!.id)];
  });

  on('GET', '/api/spades/tables', ({ url, me }) => {
    const status = url.searchParams.get('status') ?? 'active';
    const items = live()
      .filter((r) => seatOf(r.state, me!.id) !== null)
      .filter((r) => (status === 'finished' ? isOver(r.state) : !isOver(r.state)))
      .sort((a, b) => b.state.updatedAt - a.state.updatedAt)
      .map((r) => summary(r, me!));
    return k.page(items, url.searchParams.get('cursor'));
  });

  on('GET', '/api/spades/tables/by-code/:code', ({ m }) => {
    const code = decodeURIComponent(m[0]).toUpperCase();
    const r = live().find((x) => x.state.code === code && !isOver(x.state));
    if (!r) throw err(404, 'not_found');
    return { id: r.state.id };
  });

  on('GET', '/api/spades/tables/:id', ({ m, me }) => viewOf(find(m[0]), me!.id));

  on('POST', '/api/spades/tables/:id/join', ({ m, me, body }) => {
    const r = find(m[0]);
    const seat = body.seat === undefined || body.seat === null ? undefined : (body.seat as Seat);
    return seatResult(r, me!, sit(r.state, whoOf(me!), seat, now()));
  });

  on('PATCH', '/api/spades/tables/:id/rules', ({ m, me, body }) => {
    const r = find(m[0]);
    const name = typeof body.name === 'string' ? body.name : undefined;
    const res = setRules(r.state, seatOf(r.state, me!.id), rulesOf(body.rules), name, now());
    if (!res.ok) throw refused(r, me!, res.error);
    save(r, res.state);
    return viewOf(r, me!.id);
  });

  on('POST', '/api/spades/tables/:id/actions', ({ m, me, body }) => act(find(m[0]), me!, body));

  on('GET', '/api/spades/tables/:id/qr.svg', ({ m, res }) => {
    const r = find(m[0]);
    res.writeHead(200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'private, max-age=300',
    });
    res.end(qrSvg(r.state.code));
    return k.RAW;
  });

  on('GET', '/api/spades/tables/:id/events', ({ m, me, req, res }) => {
    const r = find(m[0]);
    const userId = me!.id;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    });
    const id = r.state.id;
    const set = streams.get(id) ?? new Set();
    const me2: Follower = { res, userId };
    set.add(me2);
    streams.set(id, set);
    lastSeen.set(`${id}:${userId}`, now());
    frame(res, 'state', viewOf(r, userId), r.state.rev);
    // Everyone hears that this seat is here now.
    for (const f of set) frame(f.res, 'seat-presence', { seats: presence(r) });
    const ping = setInterval(() => {
      lastSeen.set(`${id}:${userId}`, now());
      frame(res, 'ping', {});
    }, 25e3);
    req.on('close', () => {
      clearInterval(ping);
      set.delete(me2);
      lastSeen.set(`${id}:${userId}`, now());
      const cur = tables.get(id);
      if (cur) for (const f of set) frame(f.res, 'seat-presence', { seats: presence(cur) });
    });
    return k.STREAM;
  });

  on('DELETE', '/api/spades/tables/:id', ({ m, me }) => {
    const r = find(m[0]);
    if (seatOf(r.state, me!.id) !== r.state.host) throw err(403, 'not_host');
    if (!isOver(r.state)) throw err(409, 'not_finished');
    r.deletedAt = now();
    for (const f of streams.get(r.state.id) ?? []) f.res.end();
    streams.delete(r.state.id);
    return null;
  });

  // Test control: the next draws and deals come from this seed (null goes back to random).
  on(
    'POST',
    '/api/__mock/spades/seed',
    ({ body }) => {
      const s = body.seed;
      if (s !== null && !Number.isInteger(s))
        throw err(422, 'invalid', { fields: { seed: 'int' } });
      seed = s as number | null;
      return { seed };
    },
    'public',
  );

  // Test control: moves Spades' clock on, so a turn timer or the 15 s deal wait can pass at once.
  on(
    'POST',
    '/api/__mock/spades/clock',
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

/** Who sat at which table, for the seat invites' circle. */
export const spadesSeatings = () =>
  live().map((r) => ({
    playerIds: r.state.seats.flatMap((x) => (x.who ? [x.who.playerId] : [])),
    at: r.state.updatedAt,
  }));

/** Forgets every table, stream, the seed and the clock skew (the server's seed()). */
export function resetSpadesOnline() {
  for (const set of streams.values()) for (const f of set) f.res.end();
  streams.clear();
  tables = new Map();
  lastSeen.clear();
  reacted.clear();
  seed = null;
  skew = 0;
}
