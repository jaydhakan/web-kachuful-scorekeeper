/**
 * The whole API contract (plan-backend §6) in memory, for building and testing the app before the backend exists.
 * Dev and e2e only. It reuses the app's domain for every number, so boards and achievements match the app; the real
 * server must match the golden fixtures instead. Not covered: OG images, real QR codes, persistence across restarts.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  allAchievements,
  buildFacts,
  dailyAwards,
  dayOf,
  earnedKey,
  gameEndedAt,
  headToHead,
  leaderboard,
  minRoundsFor,
  monthOf,
  nameKey,
  profileStats,
  calendar,
  season,
  summaryPlayers,
  validate,
  wrapped,
  doneRounds,
  type Earned,
  type Facts,
  type Game,
  type Metric,
} from '../../src/domain/index';
import { kitGame, rows } from '../../src/domain/__fixtures__/kit';
import type {
  Achievement,
  Activity,
  GameSummary,
  Player,
  PlayerSummary,
  User,
  WireGame,
} from '../../src/sync/types';

const TZ = 'Asia/Kolkata';
const ORIGIN = 'https://play.vectanix.com';
const DAY = 864e5;

interface UserRec extends User {
  password: string | null;
  active: boolean;
  lastSeenAt: number | null;
}
interface GameRec {
  payload: WireGame;
  ownerId: string;
  rev: number;
  hash: string;
  updatedAt: number;
  deletedAt: number | null;
  links: Partial<Record<'live' | 'recap', string>>;
  scorerSeenAt: number;
}

interface Db {
  users: Map<string, UserRec>;
  sessions: Map<string, string>;
  invites: Map<
    string,
    { email: string; playerId: string | null; expiresAt: number; done: boolean }
  >;
  resets: Map<string, { userId: string; expiresAt: number; done: boolean }>;
  players: Map<string, Player>;
  games: Map<string, GameRec>;
  achievements: Map<string, Achievement>;
  activity: Activity[];
  links: Map<string, { gameId: string; kind: 'live' | 'recap'; revoked: boolean }>;
  failed: Map<string, number[]>;
  version: number;
}

let db: Db;
const sse = new Map<string, Set<ServerResponse>>();

const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const token = () => randomBytes(16).toString('base64url');

function newPlayer(
  p: Partial<Player> & { displayName: string; emoji: string; color: string },
  by: string | null,
  at: number,
): Player {
  return {
    id: p.id ?? randomUUID(),
    displayName: p.displayName,
    firstName: p.firstName ?? null,
    lastName: p.lastName ?? null,
    emoji: p.emoji,
    color: p.color,
    createdBy: by,
    linkedUserId: p.linkedUserId ?? null,
    mergedInto: null,
    createdAt: at,
    updatedAt: at,
  };
}

/** Two accounts, six players and a week of games, so every screen has something to show. */
export function seed(now = Date.now()) {
  db = {
    users: new Map(),
    sessions: new Map(),
    invites: new Map(),
    resets: new Map(),
    players: new Map(),
    games: new Map(),
    achievements: new Map(),
    activity: [],
    links: new Map(),
    failed: new Map(),
    version: 1,
  };
  const admin: UserRec = {
    id: randomUUID(),
    email: 'jaydhakan11@gmail.com',
    role: 'admin',
    playerId: null,
    createdAt: now - 30 * DAY,
    password: 'kachuful',
    active: true,
    lastSeenAt: null,
  };
  const riya: UserRec = {
    id: randomUUID(),
    email: 'riya@example.com',
    role: 'member',
    playerId: null,
    createdAt: now - 20 * DAY,
    password: 'riya',
    active: true,
    lastSeenAt: null,
  };
  db.users.set(admin.id, admin);
  db.users.set(riya.id, riya);
  const look: [string, string, string, string?][] = [
    ['Jay', '🦁', '#f59e0b', admin.id],
    ['Riya', '🦊', '#f87171', riya.id],
    ['Kabir', '🐯', '#60a5fa'],
    ['Meera', '🐼', '#34d399'],
    ['Aarav', '🐸', '#a78bfa'],
    ['Dev', '🐙', '#f472b6'],
  ];
  const ps = look.map(([n, e, c, u]) => {
    const p = newPlayer(
      { displayName: n, emoji: e, color: c, linkedUserId: u ?? null },
      admin.id,
      now - 25 * DAY,
    );
    db.players.set(p.id, p);
    if (u) db.users.get(u)!.playerId = p.id;
    return p;
  });
  for (let k = 0; k < 8; k++) {
    const seats = ps.filter((_, i) => (i + k) % 6 < 4);
    const g = kitGame({
      id: randomUUID(),
      players: seats.map((p) => p.id),
      names: seats.map((p) => p.displayName),
      start: now - (8 - k) * DAY + 3600e3 * 2,
      rounds: rows(seats.length, 10 + (k % 4), (i) =>
        i % 3 ? [(i + k) % seats.length] : [0, (i + 1) % seats.length],
      ),
      finished: true,
    });
    g.players.forEach((p, i) => ((p.emoji = seats[i].emoji), (p.color = seats[i].color)));
    store(toWire(g), admin.id, now);
  }
  recompute(now);
}

export const toWire = (g: Game): WireGame => {
  const { syncId, ...rest } = g;
  return { ...rest, id: syncId, localId: g.id };
};
const fromWire = (w: WireGame): Game => ({
  ...(w as unknown as Game),
  id: w.localId ?? w.id,
  syncId: w.id,
});

function store(w: WireGame, ownerId: string, now: number) {
  const prev = db.games.get(w.id);
  db.games.set(w.id, {
    payload: w,
    ownerId: prev?.ownerId ?? ownerId,
    rev: w.rev,
    hash: hash(JSON.stringify(w)),
    updatedAt: now,
    deletedAt: null,
    links: prev?.links ?? {},
    scorerSeenAt: now,
  });
  db.version++;
}

const resolve = (id: string) => {
  let cur = id;
  for (let i = 0; i < 20 && db.players.get(cur)?.mergedInto; i++)
    cur = db.players.get(cur)!.mergedInto!;
  return cur;
};

const liveGames = () => [...db.games.values()].filter((g) => !g.deletedAt);

function facts(now = Date.now()): Facts {
  return buildFacts(
    liveGames().map((r) => {
      const g = fromWire(r.payload);
      return {
        ...g,
        players: g.players.map((p) => ({ ...p, playerId: p.playerId && resolve(p.playerId) })),
      };
    }),
    now,
  );
}

/** Keeps achievement rows stable (id, earnedAt) across recomputes; returns the rows new this time. */
function recompute(now = Date.now()): Achievement[] {
  const all = allAchievements(facts(now), TZ);
  const keys = new Set(all.map(earnedKey));
  for (const k of [...db.achievements.keys()]) if (!keys.has(k)) db.achievements.delete(k);
  const added: Achievement[] = [];
  for (const e of all) {
    const k = earnedKey(e);
    if (db.achievements.has(k)) continue;
    const row: Achievement = { id: randomUUID(), ...e };
    db.achievements.set(k, row);
    added.push(row);
  }
  return added;
}

const userName = (id: string | null) => {
  const u = id ? db.users.get(id) : null;
  const p = u?.playerId ? db.players.get(u.playerId) : null;
  return p?.displayName ?? u?.email.split('@')[0] ?? 'Someone';
};

function summaryOf(id: string, f?: Facts): PlayerSummary {
  const p =
    db.players.get(resolve(id)) ??
    newPlayer({ id, displayName: '?', emoji: '🙂', color: '#888' }, null, 0);
  const mine = (f ?? facts()).players.filter((x) => x.playerId === p.id);
  const last = Math.max(0, ...mine.map((x) => x.endedAt ?? 0));
  return {
    ...p,
    games: mine.length,
    lastPlayedAt: last || null,
    createdByName: userName(p.createdBy),
  };
}

function gameSummary(r: GameRec, now = Date.now()): GameSummary {
  const g = fromWire(r.payload);
  const end = gameEndedAt(g, now).at;
  return {
    id: r.payload.id,
    owner: { id: r.ownerId, name: userName(r.ownerId) },
    createdAt: g.createdAt,
    endedAt: end,
    status: g.status,
    players: summaryPlayers(g, end != null),
    rounds: doneRounds(g).length,
    lengthMode: g.lengthMode,
    live: !!r.links.live,
  };
}

// ——— HTTP plumbing ———

class Http extends Error {
  constructor(
    readonly status: number,
    readonly body: Record<string, unknown> = {},
  ) {
    super(String(body.code ?? status));
  }
}
const err = (status: number, code: string, extra: Record<string, unknown> = {}) =>
  new Http(status, { code, message: code.replace(/_/g, ' '), ...extra });

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((ok, no) => {
    let s = '';
    req.on('data', (c) => {
      s += c;
      if (s.length > 1e6) no(err(413, 'too_large'));
    });
    req.on('end', () => {
      try {
        ok(s ? JSON.parse(s) : {});
      } catch {
        no(err(422, 'invalid'));
      }
    });
  });
}

const cookieOf = (req: IncomingMessage) =>
  /(?:^|;\s*)kf_session=([^;]+)/.exec(req.headers.cookie ?? '')?.[1] ?? null;

function sessionUser(req: IncomingMessage): UserRec | null {
  const t = cookieOf(req);
  const id = t ? db.sessions.get(t) : null;
  const u = id ? db.users.get(id) : null;
  if (!u || !u.active) return null;
  u.lastSeenAt = Date.now();
  return u;
}

const strong = (pw: unknown) =>
  typeof pw === 'string' && pw.length >= 3 && pw.length <= 128 && !/\s/.test(pw);

const userOut = (u: UserRec): User => ({
  id: u.id,
  email: u.email,
  role: u.role,
  playerId: u.playerId,
  createdAt: u.createdAt,
});

function signIn(res: ServerResponse, u: UserRec) {
  const t = token();
  db.sessions.set(t, u.id);
  res.setHeader(
    'Set-Cookie',
    `kf_session=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${180 * 86400}`,
  );
}

function page<T>(items: T[], cursor: unknown, limit = 50) {
  const at = Number(cursor) || 0;
  const n = Math.min(200, limit);
  return {
    items: items.slice(at, at + n),
    nextCursor: at + n < items.length ? String(at + n) : null,
  };
}

function checkPlayer(body: Record<string, unknown>, exceptId?: string) {
  const name = String(body.displayName ?? '').trim();
  if (!name || name.length > 14) throw err(422, 'invalid', { fields: { displayName: 'required' } });
  const clash = [...db.players.values()].find(
    (p) => !p.mergedInto && p.id !== exceptId && nameKey(p.displayName) === nameKey(name),
  );
  if (clash) throw err(409, 'name_taken', { existing: summaryOf(clash.id) });
}

function notify(gameId: string, event: string, data: unknown, id?: number) {
  for (const res of sse.get(gameId) ?? [])
    res.write(`event: ${event}\n${id ? `id: ${id}\n` : ''}data: ${JSON.stringify(data)}\n\n`);
}

type Ctx = {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  body: Record<string, unknown>;
  me: UserRec | null;
  m: string[];
};
type Handler = (c: Ctx) => unknown | Promise<unknown>;
const routes: [string, RegExp, Handler, 'public' | 'auth' | 'admin'][] = [];
const on = (
  method: string,
  path: string,
  h: Handler,
  access: 'public' | 'auth' | 'admin' = 'auth',
) => routes.push([method, new RegExp('^' + path.replace(/:\w+/g, '([^/]+)') + '$'), h, access]);

// ——— §6.1 auth ———

on(
  'POST',
  '/api/auth/login',
  ({ body, res }) => {
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase();
    const now = Date.now();
    const fails = (db.failed.get(email) ?? []).filter((t) => now - t < 600e3);
    if (fails.length >= 10)
      throw err(429, 'rate_limited', { retryAfter: Math.ceil((fails[0] + 600e3 - now) / 1000) });
    const u = [...db.users.values()].find((x) => x.email === email);
    if (!u || !u.password || u.password !== body.password) {
      db.failed.set(email, [...fails, now]);
      throw err(401, 'bad_credentials');
    }
    if (!u.active) throw err(403, 'inactive');
    signIn(res, u);
    return { user: userOut(u) };
  },
  'public',
);
on(
  'POST',
  '/api/auth/logout',
  ({ req, res }) => {
    const t = cookieOf(req);
    if (t) db.sessions.delete(t);
    res.setHeader('Set-Cookie', 'kf_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
    return null;
  },
  'public',
);
on('GET', '/api/auth/me', ({ me }) => ({
  user: userOut(me!),
  player: me!.playerId ? (db.players.get(me!.playerId) ?? null) : null,
}));
on('GET', '/api/bootstrap', ({ me }) => {
  return {
    user: userOut(me!),
    player: me!.playerId ? (db.players.get(me!.playerId) ?? null) : null,
    players: [...db.players.values()],
    myGames: liveGames()
      .filter((g) => g.ownerId === me!.id)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((g) => gameSummary(g)),
    myAchievements: me!.playerId
      ? [...db.achievements.values()].filter((a) => a.playerId === me!.playerId)
      : [],
    dataVersion: db.version,
  };
});
on(
  'GET',
  '/api/auth/invites/:t',
  ({ m }) => {
    const inv = db.invites.get(m[0]);
    if (!inv || inv.done || inv.expiresAt < Date.now()) throw err(410, 'gone');
    return { email: inv.email, player: inv.playerId ? summaryOf(inv.playerId) : null };
  },
  'public',
);
on(
  'POST',
  '/api/auth/invites/:t',
  ({ m, body, res }) => {
    const inv = db.invites.get(m[0]);
    if (!inv || inv.done || inv.expiresAt < Date.now()) throw err(410, 'gone');
    if (!strong(body.password)) throw err(422, 'weak_password');
    const pl = body.player as Record<string, unknown>;
    let player: Player;
    if (pl && typeof pl.id === 'string' && !('displayName' in pl)) {
      const p = db.players.get(resolve(pl.id));
      if (!p) throw err(422, 'unknown_player', { playerIds: [pl.id] });
      if (p.linkedUserId) throw err(409, 'player_linked');
      player = p;
    } else {
      checkPlayer(pl ?? {});
      player = newPlayer(pl as unknown as Player, null, Date.now());
      db.players.set(player.id, player);
    }
    const u: UserRec = {
      id: randomUUID(),
      email: inv.email,
      role: 'member',
      playerId: player.id,
      createdAt: Date.now(),
      password: String(body.password),
      active: true,
      lastSeenAt: Date.now(),
    };
    db.users.set(u.id, u);
    player.linkedUserId = u.id;
    player.createdBy ??= u.id;
    player.updatedAt = Date.now();
    inv.done = true;
    db.activity.unshift({
      id: randomUUID(),
      kind: 'player_joined',
      player: summaryOf(player.id),
      data: {},
      createdAt: Date.now(),
    });
    signIn(res, u);
    return { user: userOut(u), player };
  },
  'public',
);
on(
  'GET',
  '/api/auth/resets/:t',
  ({ m }) => {
    const r = db.resets.get(m[0]);
    if (!r || r.done || r.expiresAt < Date.now()) throw err(410, 'gone');
    return { email: db.users.get(r.userId)!.email };
  },
  'public',
);
on(
  'POST',
  '/api/auth/resets/:t',
  ({ m, body, res }) => {
    const r = db.resets.get(m[0]);
    if (!r || r.done || r.expiresAt < Date.now()) throw err(410, 'gone');
    if (!strong(body.password)) throw err(422, 'weak_password');
    const u = db.users.get(r.userId)!;
    u.password = String(body.password);
    r.done = true;
    for (const [t, id] of db.sessions) if (id === u.id) db.sessions.delete(t);
    signIn(res, u);
    return { user: userOut(u), player: u.playerId ? (db.players.get(u.playerId) ?? null) : null };
  },
  'public',
);
on('POST', '/api/me/password', ({ me, body, req }) => {
  if (me!.password !== body.current) throw err(401, 'bad_credentials');
  if (!strong(body.password)) throw err(422, 'weak_password');
  me!.password = String(body.password);
  const keep = cookieOf(req);
  for (const [t, id] of db.sessions) if (id === me!.id && t !== keep) db.sessions.delete(t);
  return null;
});

// ——— §6.2 admin ———

on(
  'GET',
  '/api/admin/users',
  () =>
    [...db.users.values()]
      .map((u) => {
        const inv = [...db.invites.entries()].find(([, i]) => i.email === u.email && !i.done);
        return {
          user: userOut(u),
          player: u.playerId ? (db.players.get(u.playerId) ?? null) : null,
          active: u.active,
          lastSeenAt: u.lastSeenAt,
          invite: inv ? { expiresAt: inv[1].expiresAt, url: `${ORIGIN}/?invite=${inv[0]}` } : null,
        };
      })
      .concat(
        [...db.invites.entries()]
          .filter(([, i]) => !i.done && ![...db.users.values()].some((u) => u.email === i.email))
          .map(([t, i]) => ({
            user: {
              id: 'invite:' + i.email,
              email: i.email,
              role: 'member' as const,
              playerId: i.playerId,
              createdAt: 0,
            },
            player: i.playerId ? (db.players.get(i.playerId) ?? null) : null,
            active: false,
            lastSeenAt: null,
            invite: { expiresAt: i.expiresAt, url: `${ORIGIN}/?invite=${t}` },
          })),
      ),
  'admin',
);
on(
  'POST',
  '/api/admin/invites',
  ({ body }) => {
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      throw err(422, 'invalid', { fields: { email: 'invalid' } });
    if ([...db.users.values()].some((u) => u.email === email)) throw err(409, 'user_exists');
    for (const [t, i] of db.invites) if (i.email === email) db.invites.delete(t);
    const t = token(),
      expiresAt = Date.now() + 7 * DAY;
    db.invites.set(t, {
      email,
      playerId: typeof body.playerId === 'string' ? body.playerId : null,
      expiresAt,
      done: false,
    });
    return [201, { inviteUrl: `${ORIGIN}/?invite=${t}`, expiresAt }];
  },
  'admin',
);
on(
  'DELETE',
  '/api/admin/invites/:email',
  ({ m }) => {
    for (const [t, i] of db.invites) if (i.email === decodeURIComponent(m[0])) db.invites.delete(t);
    return null;
  },
  'admin',
);
on(
  'POST',
  '/api/admin/users/:id/reset-link',
  ({ m }) => {
    if (!db.users.has(m[0])) throw err(404, 'not_found');
    const t = token(),
      expiresAt = Date.now() + DAY;
    db.resets.set(t, { userId: m[0], expiresAt, done: false });
    return [201, { resetUrl: `${ORIGIN}/?reset=${t}`, expiresAt }];
  },
  'admin',
);
on(
  'PATCH',
  '/api/admin/users/:id',
  ({ m, body }) => {
    const u = db.users.get(m[0]);
    if (!u) throw err(404, 'not_found');
    if (
      body.active === false &&
      u.role === 'admin' &&
      [...db.users.values()].filter((x) => x.role === 'admin' && x.active).length === 1
    )
      throw err(409, 'last_admin');
    if (typeof body.active === 'boolean') u.active = body.active;
    if (!u.active) for (const [t, id] of db.sessions) if (id === u.id) db.sessions.delete(t);
    return { user: userOut(u) };
  },
  'admin',
);
on(
  'POST',
  '/api/admin/players/:id/merge',
  ({ m, body }) => {
    const a = db.players.get(m[0]),
      b = db.players.get(resolve(String(body.intoId)));
    if (!a || !b || a.id === b.id) throw err(404, 'not_found');
    if (a.linkedUserId && b.linkedUserId) throw err(409, 'both_linked');
    a.mergedInto = b.id;
    a.updatedAt = b.updatedAt = Date.now();
    if (a.linkedUserId) {
      b.linkedUserId = a.linkedUserId;
      db.users.get(a.linkedUserId)!.playerId = b.id;
      a.linkedUserId = null;
    }
    for (const g of db.games.values())
      g.payload.players.forEach((p) => p.playerId === a.id && (p.playerId = b.id));
    db.version++;
    recompute();
    return { player: b };
  },
  'admin',
);
on(
  'GET',
  '/api/admin/overview',
  () => ({
    users: db.users.size,
    players: [...db.players.values()].filter((p) => !p.mergedInto).length,
    games: liveGames().length,
    rounds: facts().games.reduce((a, g) => a + g.rounds, 0),
    lastBackupAt: null,
  }),
  'admin',
);

// ——— §6.3 players ———

on('GET', '/api/players', ({ url }) => {
  const since = Number(url.searchParams.get('updatedSince')) || 0;
  return page(
    [...db.players.values()]
      .filter((p) => p.updatedAt > since)
      .sort((a, b) => a.updatedAt - b.updatedAt),
    url.searchParams.get('cursor'),
    200,
  );
});
on('GET', '/api/players/check', ({ url }) => {
  const k = nameKey(url.searchParams.get('name') ?? '');
  const p = [...db.players.values()].find((x) => !x.mergedInto && nameKey(x.displayName) === k);
  return p ? { available: false, existing: summaryOf(p.id) } : { available: true };
});
on('POST', '/api/players', ({ body, me }) => {
  const prev = db.players.get(String(body.id));
  if (prev) {
    if (prev.displayName === body.displayName) return prev;
    throw err(409, 'name_taken', { existing: summaryOf(prev.id) });
  }
  checkPlayer(body);
  const p = newPlayer(body as unknown as Player, me!.id, Date.now());
  db.players.set(p.id, p);
  db.activity.unshift({
    id: randomUUID(),
    kind: 'player_joined',
    player: summaryOf(p.id),
    data: {},
    createdAt: Date.now(),
  });
  return [201, p];
});
on('PATCH', '/api/players/:id', ({ m, body, me }) => {
  const p = db.players.get(m[0]);
  if (!p) throw err(404, 'not_found');
  const admin = me!.role === 'admin',
    linked = p.linkedUserId === me!.id,
    creator = p.createdBy === me!.id;
  if (body.displayName !== undefined && !admin && !linked) throw err(403, 'forbidden');
  if (!admin && !linked && !creator) throw err(403, 'forbidden');
  if (body.displayName !== undefined) checkPlayer(body, p.id);
  for (const k of ['displayName', 'firstName', 'lastName', 'emoji', 'color'] as const)
    if (body[k] !== undefined) (p as unknown as Record<string, unknown>)[k] = body[k];
  p.updatedAt = Date.now();
  db.version++;
  return p;
});
on('GET', '/api/players/:id', ({ m }) => {
  const id = resolve(m[0]);
  if (!db.players.has(id)) throw err(404, 'not_found');
  const f = facts();
  const b = leaderboard(f, { from: 0, to: Date.now() + DAY, minRounds: 50 });
  return {
    player: summaryOf(id, f),
    totals: statsOut(f, id, 0, Infinity),
    achievements: [...db.achievements.values()].filter((a) => a.playerId === id),
    rank: {
      global: b.rows.find((r) => r.playerId === id)?.rank ?? null,
      outOf: b.rows.filter((r) => r.qualified).length,
    },
  };
});
function statsOut(f: Facts, id: string, from: number, to: number) {
  const s = profileStats(f, id, from, to);
  const best = s.bestGame && db.games.get(s.bestGame.gameId);
  return { ...s, bestGame: best ? gameSummary(best) : null };
}
on('GET', '/api/players/:id/stats', ({ m, url }) =>
  statsOut(
    facts(),
    resolve(m[0]),
    Number(url.searchParams.get('from')) || 0,
    Number(url.searchParams.get('to')) || Infinity,
  ),
);
on('GET', '/api/players/:id/games', ({ m, url }) => {
  const id = resolve(m[0]);
  const list = liveGames()
    .filter((g) => g.payload.players.some((p) => p.playerId && resolve(p.playerId) === id))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((g) => gameSummary(g));
  return page(list, url.searchParams.get('cursor'));
});
on('GET', '/api/players/:id/calendar', ({ m, url }) => {
  const y = url.searchParams.get('year') ?? String(new Date().getFullYear());
  const days = calendar(facts(), resolve(m[0]), TZ);
  return { days: Object.fromEntries(Object.entries(days).filter(([d]) => d.startsWith(y))) };
});
on('GET', '/api/players/:a/vs/:b', ({ m, url }) => {
  const f = facts();
  const a = resolve(m[0]),
    b = resolve(m[1]);
  const h = headToHead(
    f,
    a,
    b,
    Number(url.searchParams.get('from')) || 0,
    Number(url.searchParams.get('to')) || Infinity,
  );
  const sum = (id: string) => gameSummary(db.games.get(id)!);
  return {
    ...h,
    a: summaryOf(a, f),
    b: summaryOf(b, f),
    lastGames: h.lastGames.map(sum),
    biggestWin: h.biggestWin && { by: h.biggestWin.by, game: sum(h.biggestWin.gameId) },
  };
});

// ——— §6.4 games ———

on('PUT', '/api/games/:id', ({ m, body, me }) => {
  const w = body as unknown as WireGame;
  if (w.id !== m[0]) throw err(422, 'invalid', { fields: { id: 'mismatch' } });
  const prev = db.games.get(w.id);
  const h = hash(JSON.stringify(w));
  if (prev && !prev.deletedAt) {
    if (prev.ownerId !== me!.id && me!.role !== 'admin') throw err(403, 'forbidden');
    if (prev.hash === h) return { rev: prev.rev, earned: [] };
    if (w.rev <= prev.rev) throw err(409, 'stale', { server: prev.payload });
  }
  const unknown = w.players.map((p) => p.playerId ?? '').filter((id) => !db.players.has(id));
  if (unknown.length) throw err(422, 'unknown_player', { playerIds: unknown });
  const remap: Record<string, string> = {};
  for (const p of w.players) {
    const r = resolve(p.playerId!);
    if (r !== p.playerId) {
      remap[p.playerId!] = r;
      p.playerId = r;
    }
  }
  const v = validate(fromWire(w), Date.now());
  if (!v.ok) throw err(422, 'invalid_game', { reason: v.reason, roundIndex: v.roundIndex ?? null });
  const wasEnded = prev ? gameEndedAt(fromWire(prev.payload), Date.now()).at != null : false;
  store(w, me!.id, Date.now());
  const earned = recompute();
  const rec = db.games.get(w.id)!;
  const sum = gameSummary(rec);
  if (!wasEnded && sum.endedAt)
    db.activity.unshift({
      id: randomUUID(),
      kind: 'game_finished',
      game: sum,
      data: {},
      createdAt: Date.now(),
    });
  for (const e of earned.filter((x) => !x.code.startsWith('hot_3') && !x.code.startsWith('cold_')))
    db.activity.unshift({
      id: randomUUID(),
      kind: 'achievement',
      player: summaryOf(e.playerId),
      game: sum,
      data: { code: e.code, ...e.data },
      createdAt: e.earnedAt,
    });
  notify(
    w.id,
    'game',
    { game: w, summary: sum, updatedAt: rec.updatedAt, scorerSeenAt: rec.scorerSeenAt },
    w.rev,
  );
  return { rev: w.rev, earned, ...(Object.keys(remap).length && { remap }) };
});
on('GET', '/api/games', ({ url, me }) => {
  const since = Number(url.searchParams.get('updatedSince')) || 0;
  const mine = url.searchParams.get('mine') === '1';
  const list = liveGames()
    .filter((g) => g.updatedAt > since && (!mine || g.ownerId === me!.id))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((g) => gameSummary(g));
  return page(list, url.searchParams.get('cursor'));
});
on('GET', '/api/games/:id', ({ m }) => {
  const r = db.games.get(m[0]);
  if (!r || r.deletedAt) throw err(404, 'not_found');
  return {
    game: r.payload,
    summary: gameSummary(r),
    achievements: [...db.achievements.values()].filter((a) => a.gameId === m[0]),
  };
});
on('DELETE', '/api/games/:id', ({ m, me }) => {
  const r = db.games.get(m[0]);
  if (!r || r.deletedAt) throw err(404, 'not_found');
  if (r.ownerId !== me!.id && me!.role !== 'admin') throw err(403, 'forbidden');
  r.deletedAt = Date.now();
  db.version++;
  recompute();
  return null;
});
on('POST', '/api/games/:id/links', ({ m, body, me }) => {
  const r = db.games.get(m[0]);
  if (!r || r.deletedAt) throw err(404, 'not_found');
  if (r.ownerId !== me!.id && me!.role !== 'admin') throw err(403, 'forbidden');
  const kind = body.kind === 'live' ? 'live' : 'recap';
  let t = r.links[kind];
  if (!t) {
    t = randomBytes(16).toString('base64url').slice(0, 22);
    r.links[kind] = t;
    db.links.set(t, { gameId: m[0], kind, revoked: false });
  }
  return [
    201,
    {
      token: t,
      url: `${ORIGIN}/${kind === 'live' ? 'l' : 'r'}/${t}`,
      qrSvgUrl: `/api/games/${m[0]}/links/${kind}/qr.svg`,
    },
  ];
});
on('DELETE', '/api/games/:id/links/:kind', ({ m }) => {
  const r = db.games.get(m[0]);
  const t = r?.links[m[1] as 'live' | 'recap'];
  if (r && t) {
    db.links.get(t)!.revoked = true;
    delete r.links[m[1] as 'live' | 'recap'];
    if (m[1] === 'live') notify(m[0], 'revoked', {});
  }
  return null;
});
on('GET', '/api/games/:id/links/:kind/qr.svg', ({ m, res }) => {
  const t = db.games.get(m[0])?.links[m[1] as 'live' | 'recap'];
  if (!t) throw err(404, 'not_found');
  return raw(res, 'image/svg+xml', fakeQr(t));
});

/** Not a real QR code: a fixed pattern from the token, sized like one, so the layout can be built. */
function fakeQr(t: string) {
  const bits = createHash('sha256').update(t).digest();
  let cells = '';
  for (let y = 0; y < 21; y++)
    for (let x = 0; x < 21; x++) {
      const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
      const on = finder
        ? !(x % 6 && y % 6) || (x % 14 > 1 && x % 14 < 5 && y % 14 > 1 && y % 14 < 5)
        : (bits[(x * 21 + y) % 32] >> ((x + y) % 8)) & 1;
      if (on) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 25 25" shape-rendering="crispEdges"><rect x="-2" y="-2" width="25" height="25" fill="#fff"/><g fill="#000">${cells}</g></svg>`;
}

// ——— §6.5 boards ———

on('GET', '/api/leaderboard', ({ url, req, res }) => {
  const from = Number(url.searchParams.get('from')) || 0,
    to = Number(url.searchParams.get('to')) || Date.now() + DAY;
  const metric = (url.searchParams.get('metric') ?? 'avgPerRound') as Metric;
  const min = url.searchParams.get('minRounds');
  const etag = `"${db.version}-${hash(url.search)}"`;
  res.setHeader('ETag', etag);
  if (req.headers['if-none-match'] === etag) return [304, null];
  const f = facts();
  const b = leaderboard(f, {
    from,
    to,
    metric,
    minRounds: min ? Number(min) : minRoundsFor(from, to),
  });
  return {
    minRounds: b.minRounds,
    generatedAt: Date.now(),
    rows: b.rows.map((r) => ({ ...r, player: summaryOf(r.playerId, f) })),
  };
});
const awardsOut = (f: Facts, list: { code: string; playerId: string; value: number }[]) =>
  list.map(({ playerId, ...a }) => ({ ...a, player: summaryOf(playerId, f) }));
on('GET', '/api/awards/daily', ({ url }) => {
  const date = url.searchParams.get('date') ?? dayOf(Date.now(), TZ);
  const f = facts();
  return {
    date,
    final: date < dayOf(Date.now(), TZ),
    awards: awardsOut(f, dailyAwards(f, date, TZ)),
  };
});
on('GET', '/api/seasons/:m', ({ m }) => {
  const f = facts();
  const s = season(f, m[0], TZ);
  return {
    season: m[0],
    final: m[0] < monthOf(Date.now(), TZ),
    standings: s.standings.map((r) => ({ ...r, player: summaryOf(r.playerId, f) })),
    awards: awardsOut(f, s.awards),
  };
});
on('GET', '/api/seasons', () => {
  const f = facts();
  const months = [...new Set(f.rounds.map((r) => monthOf(r.doneAt, TZ)))].sort().reverse();
  return months.map((mo) => {
    const ch = season(f, mo, TZ).awards.find((a) => a.code === 'season_champion');
    return { season: mo, champion: ch ? summaryOf(ch.playerId, f) : null };
  });
});
on('GET', '/api/wrapped/:y/:id', ({ m }) => wrapped(facts(), resolve(m[1]), Number(m[0]), TZ));
on('GET', '/api/activity', ({ url }) => page(db.activity, url.searchParams.get('cursor')));
on('GET', '/api/achievements', ({ url }) => {
  const pid = url.searchParams.get('playerId');
  const list = [...db.achievements.values()]
    .filter((a) => !pid || a.playerId === resolve(pid))
    .sort((a, b) => b.earnedAt - a.earnedAt);
  return page(list, url.searchParams.get('cursor'), 200);
});

// ——— §6.6 public ———

function linkGame(t: string, kind: 'live' | 'recap') {
  const l = db.links.get(t);
  if (!l || l.kind !== kind) throw err(404, 'not_found');
  if (l.revoked) throw err(410, 'gone');
  const r = db.games.get(l.gameId);
  if (!r || r.deletedAt) throw err(404, 'not_found');
  return r;
}
const pub = (s: GameSummary) => s;
on(
  'GET',
  '/api/public/live/:t',
  ({ m }) => {
    const r = linkGame(m[0], 'live');
    return {
      game: r.payload,
      summary: pub(gameSummary(r)),
      updatedAt: r.updatedAt,
      scorerSeenAt: r.scorerSeenAt,
    };
  },
  'public',
);
on(
  'GET',
  '/api/public/live/:t/events',
  ({ m, res, req }) => {
    const r = linkGame(m[0], 'live');
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    const id = r.payload.id;
    const set = sse.get(id) ?? new Set();
    set.add(res);
    sse.set(id, set);
    res.write(
      `event: game\nid: ${r.rev}\ndata: ${JSON.stringify({ game: r.payload, summary: gameSummary(r), updatedAt: r.updatedAt, scorerSeenAt: r.scorerSeenAt })}\n\n`,
    );
    const ping = setInterval(() => res.write('event: ping\ndata: {}\n\n'), 25e3);
    req.on('close', () => {
      clearInterval(ping);
      set.delete(res);
    });
    return STREAM;
  },
  'public',
);
on(
  'GET',
  '/api/public/recap/:t',
  ({ m }) => {
    const r = linkGame(m[0], 'recap');
    return {
      game: r.payload,
      summary: pub(gameSummary(r)),
      achievements: [...db.achievements.values()].filter((a) => a.gameId === r.payload.id),
    };
  },
  'public',
);
for (const [p, kind] of [
  ['/r/:t', 'recap'],
  ['/l/:t', 'live'],
] as const)
  on(
    'GET',
    p,
    ({ m, res }) => {
      const title = 'Kachuful';
      return raw(
        res,
        'text/html',
        `<!doctype html><meta charset="utf-8"><title>${title}</title><meta property="og:title" content="${title}"><meta http-equiv="refresh" content="0;url=/?${kind}=${encodeURIComponent(m[0])}">`,
      );
    },
    'public',
  );

// ——— mock-only helpers for tests ———

on('POST', '/api/__mock/reset', () => (seed(), null), 'public');
on(
  'POST',
  '/api/__mock/invite',
  ({ body }) => {
    const t = token();
    db.invites.set(t, {
      email: String(body.email),
      playerId: (body.playerId as string) ?? null,
      expiresAt: Date.now() + 7 * DAY,
      done: false,
    });
    return { token: t };
  },
  'public',
);
on(
  'POST',
  '/api/__mock/reset-link',
  ({ body }) => {
    const u = [...db.users.values()].find((x) => x.email === body.email);
    if (!u) throw err(404, 'not_found');
    const t = token();
    db.resets.set(t, { userId: u.id, expiresAt: Date.now() + DAY, done: false });
    return { token: t };
  },
  'public',
);

const STREAM = Symbol('stream');
const RAW = Symbol('raw');
function raw(res: ServerResponse, type: string, body: string) {
  res.writeHead(200, { 'Content-Type': type });
  res.end(body);
  return RAW;
}

/** Connect-style middleware for Vite's dev and preview servers. */
export function mockApi(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const url = new URL(req.url ?? '/', 'http://local');
  if (!/^\/(api|r|l)\//.test(url.pathname)) return next();
  if (!db) seed();
  const route = routes.find(([m, re]) => m === req.method && re.test(url.pathname));
  const send = (status: number, body: unknown) => {
    if (res.headersSent) return;
    res.statusCode = status;
    if (status === 204 || status === 304 || body === null) return res.end();
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  };
  if (!route)
    return url.pathname.startsWith('/api/')
      ? send(404, { code: 'not_found', message: 'not found' })
      : next();
  (async () => {
    if (
      req.method !== 'GET' &&
      !url.pathname.startsWith('/api/__mock') &&
      req.headers['x-kachuful'] !== '1'
    )
      throw err(403, 'csrf');
    const me = sessionUser(req);
    if (route[3] !== 'public' && !me) throw err(401, 'unauthenticated');
    if (route[3] === 'admin' && me!.role !== 'admin') throw err(403, 'forbidden');
    const body =
      req.method === 'GET' || req.method === 'DELETE'
        ? {}
        : ((await readBody(req)) as Record<string, unknown>);
    const out = await route[2]({
      req,
      res,
      url,
      body,
      me,
      m: (route[1].exec(url.pathname) ?? []).slice(1),
    });
    if (out === STREAM || out === RAW) return;
    if (Array.isArray(out) && typeof out[0] === 'number') return send(out[0], out[1]);
    send(out === null ? 204 : 200, out);
  })().catch((e: unknown) => {
    if (e instanceof Http) send(e.status, e.body);
    else {
      console.error('[mock-api]', e);
      send(500, { code: 'server', message: 'mock server error' });
    }
  });
}

export type { Earned };
