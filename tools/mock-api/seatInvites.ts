/**
 * Seat invites and the per-user stream for the in-memory API (backend-requests.md §1–§2). Kinds plug in their own
 * rules (`registerSeatKind`): Ishaara here, Spades once its tables exist. Expiry is worked out on read, as the server
 * does; a test clock (`POST /api/__mock/seat-invites/clock`) can move past the 30 minutes.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import type { Player } from '../../src/sync/types';

interface Me {
  id: string;
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
export interface SeatKit {
  on(
    method: string,
    path: string,
    h: (c: Ctx) => unknown,
    access?: 'public' | 'auth' | 'admin',
  ): void;
  err(status: number, code: string, extra?: Record<string, unknown>): Error;
  STREAM: symbol;
  players(): Player[];
  /** The account's player id, if any. */
  playerOfUser(userId: string): string | null;
  photoUrl(playerId: string | null): string | null;
  /** Every live game of every kind: who sat in it and when it last changed. */
  seatings(): { playerIds: string[]; at: number }[];
}

type Kind = 'spades-online' | 'ishaara';
type Status = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';

/** A kind's own rules for its invites. */
export interface SeatKindRules {
  /** The game's host, or null when it doesn't exist (or was deleted). */
  host(gameId: string): string | null;
  /** True once an invite to this seat can't be taken up: the game finished, started (Spades) or the seat filled. */
  closed(gameId: string, seat: string): boolean;
  table(gameId: string): { name: string; seatsTaken: number[] };
  partner(gameId: string, seat: string): { name: string } | null;
  /** What accepting does beyond recording it (Spades: take the seat); 'filled' when it can't. */
  accept?(gameId: string, seat: string, userId: string): 'ok' | 'filled';
  /** A seat is being offered: refuse a bad one with an error. */
  check?(gameId: string, seat: string, toUser: string): void;
}

interface Rec {
  id: string;
  kind: Kind;
  gameId: string;
  seat: string;
  from: string;
  to: string;
  status: Status;
  createdAt: number;
  respondedAt: number | null;
}

const TTL = 30 * 60_000;
const ONLINE_PING = 25_000;

let kit: SeatKit;
const kinds = new Map<Kind, SeatKindRules>();
let invites = new Map<string, Rec>();
let skew = 0;
/** Stamped when a user's stream opens and on each ping (§1.1 `last_seen_at`). */
let lastSeen = new Map<string, number>();
const streams = new Map<string, Set<ServerResponse>>();
const now = () => Date.now() + skew;

export const registerSeatKind = (kind: Kind, rules: SeatKindRules) => void kinds.set(kind, rules);

function frame(res: ServerResponse, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}
function tell(userId: string, event: string, data: unknown) {
  for (const res of streams.get(userId) ?? []) frame(res, event, data);
}

function card(userId: string) {
  const pid = kit.playerOfUser(userId);
  const p = pid ? kit.players().find((x) => x.id === pid) : undefined;
  return {
    userId,
    name: p?.displayName ?? 'Someone',
    emoji: p?.emoji ?? '🙂',
    color: p?.color ?? '#888888',
    photoUrl: kit.photoUrl(pid),
  };
}

function out(r: Rec) {
  const k = kinds.get(r.kind);
  return {
    id: r.id,
    kind: r.kind,
    gameId: r.gameId,
    seat: r.seat,
    status: r.status,
    createdAt: r.createdAt,
    from: card(r.from),
    table: k?.table(r.gameId) ?? { name: '', seatsTaken: [] },
    partner: k?.partner(r.gameId, r.seat) ?? null,
  };
}

/** Moves an invite on and tells both sides (the invitee: gone or new; the host: an update). */
function settle(r: Rec, status: Status) {
  r.status = status;
  r.respondedAt = now();
  tell(r.to, 'seat-invite-gone', { id: r.id, status });
  tell(r.from, 'seat-invite-update', { id: r.id, status, gameId: r.gameId, seat: r.seat });
}

/** Expiry, worked out on read: 30 minutes, or the kind says the seat can't be taken up any more. */
function fresh(r: Rec): Rec {
  if (r.status !== 'pending') return r;
  const k = kinds.get(r.kind);
  if (now() - r.createdAt > TTL || !k || !k.host(r.gameId) || k.closed(r.gameId, r.seat))
    settle(r, 'expired');
  return r;
}

/** Adds a pending invite, first expiring that person's earlier ones for the game (the partial unique index). */
export function inviteSeat(kind: Kind, gameId: string, seat: string, from: string, to: string) {
  for (const r of invites.values())
    if (r.gameId === gameId && r.to === to && r.status === 'pending') settle(r, 'expired');
  const r: Rec = {
    id: randomUUID(),
    kind,
    gameId,
    seat,
    from,
    to,
    status: 'pending',
    createdAt: now(),
    respondedAt: null,
  };
  invites.set(r.id, r);
  tell(to, 'seat-invite', out(r));
  tell(from, 'seat-invite-update', { id: r.id, status: 'pending', gameId, seat });
  return r;
}

/** The host's circle (§1.2): players they made, played with, and their own, linked to an account, not them. */
function circle(me: Me) {
  const mine = me.playerId;
  const played = new Map<string, number>();
  for (const g of kit.seatings())
    if (mine && g.playerIds.includes(mine))
      for (const p of g.playerIds) played.set(p, Math.max(played.get(p) ?? 0, g.at));
  return kit
    .players()
    .filter(
      (p) =>
        !p.mergedInto &&
        p.linkedUserId &&
        p.linkedUserId !== me.id &&
        (p.createdBy === me.id || played.has(p.id) || p.id === mine),
    )
    .map((p) => ({
      userId: p.linkedUserId!,
      playerId: p.id,
      name: p.displayName,
      emoji: p.emoji,
      color: p.color,
      photoUrl: kit.photoUrl(p.id),
      lastSeenAt: lastSeen.get(p.linkedUserId!) ?? null,
      lastPlayedAt: played.get(p.id) || null,
    }))
    .sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0));
}

function mineToAnswer(id: string, me: Me): Rec {
  const r = invites.get(id);
  if (!r || r.to !== me.id) throw kit.err(404, 'not_found');
  return fresh(r);
}

export function seatInviteRoutes(k: SeatKit) {
  kit = k;
  const { on, err } = k;

  on('GET', '/api/me/circle', ({ me }) => ({ items: circle(me!) }));

  on('GET', '/api/seat-invites', ({ me }) => ({
    items: [...invites.values()]
      .filter((r) => r.to === me!.id)
      .map(fresh)
      .filter((r) => r.status === 'pending')
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(out),
    serverNow: now(),
  }));

  on('POST', '/api/spades/tables/:id/seat-invites', ({ m, me, body }) => {
    const rules = kinds.get('spades-online');
    const host = rules?.host(m[0]);
    if (!rules || !host) throw err(404, 'not_found');
    if (host !== me!.id) throw err(403, 'not_host');
    const to = String(body.userId ?? '');
    const seat = String(body.seat ?? '');
    if (!/^[0-3]$/.test(seat)) throw err(422, 'invalid', { fields: { seat: 'must be 0-3' } });
    const target = kit.players().find((p) => p.linkedUserId === to);
    if (!target) throw err(409, 'no_account');
    if (!circle(me!).some((c) => c.userId === to)) throw err(409, 'not_in_circle');
    rules.check?.(m[0], seat, to);
    if (
      [...invites.values()].some(
        (r) => r.gameId === m[0] && r.seat === seat && fresh(r).status === 'pending',
      )
    )
      throw err(409, 'seat_taken');
    return [201, out(inviteSeat('spades-online', m[0], seat, me!.id, to))];
  });

  on('POST', '/api/seat-invites/:id/accept', ({ m, me }) => {
    const r = mineToAnswer(m[0], me!);
    if (r.status === 'expired') throw err(410, 'expired');
    if (r.status !== 'pending') throw err(409, 'filled');
    const done = kinds.get(r.kind)?.accept?.(r.gameId, r.seat, me!.id) ?? 'ok';
    if (done === 'filled') {
      settle(r, 'expired');
      throw err(409, 'filled');
    }
    settle(r, 'accepted');
    return out(r);
  });

  on('POST', '/api/seat-invites/:id/decline', ({ m, me }) => {
    const r = mineToAnswer(m[0], me!);
    if (r.status === 'expired') throw err(410, 'expired');
    if (r.status === 'pending') settle(r, 'declined');
    return out(r);
  });

  on('DELETE', '/api/seat-invites/:id', ({ m, me }) => {
    const r = invites.get(m[0]);
    if (!r || r.from !== me!.id) throw err(404, 'not_found');
    if (fresh(r).status === 'pending') settle(r, 'cancelled');
    return null;
  });

  on('GET', '/api/me/events', ({ me, req, res }) => {
    const id = me!.id;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    });
    const set = streams.get(id) ?? new Set();
    set.add(res);
    streams.set(id, set);
    lastSeen.set(id, now());
    frame(res, 'hello', { serverNow: now() });
    const ping = setInterval(() => {
      lastSeen.set(id, now());
      frame(res, 'ping', {});
    }, ONLINE_PING);
    req.on('close', () => {
      clearInterval(ping);
      set.delete(res);
    });
    return k.STREAM;
  });

  // Test control: moves the invites' clock on, so the 30 minutes can pass at once.
  on(
    'POST',
    '/api/__mock/seat-invites/clock',
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

/** Forgets every invite, presence stamp, stream and the clock skew (the server's seed()). */
export function resetSeatInvites() {
  for (const set of streams.values()) for (const res of set) res.end();
  streams.clear();
  invites = new Map();
  lastSeen = new Map();
  skew = 0;
}
