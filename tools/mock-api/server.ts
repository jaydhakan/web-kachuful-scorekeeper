/**
 * The API as built (the backend's HANDOFF.md §6) in memory, for building and testing the app without the backend.
 * Dev and e2e only; its seed has the backend's demo accounts and players (HANDOFF §3), so the same tests run against
 * either. It reuses the app's domain for every number. Not covered: OG images, real QR codes, photo re-encoding,
 * rate limits other than login, persistence across restarts.
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
  emailKey,
  emailOk,
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
  AdminUserRow,
  Player,
  PlayerSummary,
  User,
  WireGame,
} from '../../src/sync/types';

type Seen = Omit<Activity, 'id'>;

const TZ = 'Asia/Kolkata';
const ORIGIN = 'https://play.vectanix.com';
const DAY = 864e5;

interface UserRec extends User {
  password: string | null;
  active: boolean;
  lastSeenAt: number | null;
}
interface GameRec {
  /** The key it is stored under: the game's `syncId`, else its `id`. */
  key: string;
  payload: WireGame;
  ownerId: string;
  rev: number;
  hash: string;
  updatedAt: number;
  deletedAt: number | null;
  links: Partial<Record<'live' | 'recap', string>>;
  scorerSeenAt: number;
}

interface Photo {
  bytes: Buffer;
  type: string;
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
  photos: Map<string, Photo>;
  /** Bumped by every upload and delete, so each photo has its own URL. */
  photoRev: Map<string, number>;
  games: Map<string, GameRec>;
  achievements: Map<string, Achievement>;
  activity: Activity[];
  nextActivity: number;
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
    email: p.email ? emailKey(p.email) : null,
    photoUrl: null,
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

const account = (email: string, password: string, role: User['role'], at: number): UserRec => ({
  id: randomUUID(),
  email,
  role,
  playerId: null,
  createdAt: at,
  password,
  active: true,
  lastSeenAt: null,
});

/**
 * The backend's demo seed (HANDOFF §3): three accounts, nine players with `<name>@kachuful.test` emails, a pending
 * invite for new.player@kachuful.test, and a week of games so every screen has something to show.
 */
export function seed(now = Date.now()) {
  db = {
    users: new Map(),
    sessions: new Map(),
    invites: new Map(),
    resets: new Map(),
    players: new Map(),
    photos: new Map(),
    photoRev: new Map(),
    games: new Map(),
    achievements: new Map(),
    activity: [],
    nextActivity: 1,
    links: new Map(),
    failed: new Map(),
    version: 1,
  };
  const admin = account('admin@kachuful.test', 'admin-demo', 'admin', now - 30 * DAY);
  const riya = account('riya@kachuful.test', 'riya-demo', 'member', now - 20 * DAY);
  const kabir = account('kabir@kachuful.test', 'kabir-demo', 'member', now - 20 * DAY);
  for (const u of [admin, riya, kabir]) db.users.set(u.id, u);
  const look: [string, string, string, string?][] = [
    ['Jay', '🦊', '#ff8a65', admin.id],
    ['Riya', '🐯', '#60a5fa', riya.id],
    ['Kabir', '🐼', '#34d399', kabir.id],
    ['Asha', '🐸', '#f472b6'],
    ['Om', '🦁', '#facc15'],
    ['Neha', '🐙', '#a78bfa'],
    ['Dev', '🐵', '#f87171'],
    ['Zoya', '🦉', '#2dd4bf'],
    ['Ishan', '🐳', '#38bdf8'],
  ];
  const ps = look.map(([n, e, c, u]) => {
    const p = newPlayer(
      {
        displayName: n,
        emoji: e,
        color: c,
        linkedUserId: u ?? null,
        email: `${n.toLowerCase()}@kachuful.test`,
      },
      riya.id,
      now - 25 * DAY,
    );
    db.players.set(p.id, p);
    if (u) db.users.get(u)!.playerId = p.id;
    return p;
  });
  db.invites.set(token(), {
    email: 'new.player@kachuful.test',
    playerId: null,
    expiresAt: now + 7 * DAY,
    done: false,
  });
  // Two games a day for two weeks, four or five at each table, so the boards have ranked players.
  for (let k = 0; k < 28; k++) {
    const seats = ps.filter((_, i) => (i + k) % 9 < 4 + (k % 2));
    const g = kitGame({
      id: randomUUID(),
      players: seats.map((p) => p.id),
      names: seats.map((p) => p.displayName),
      start: now - (14 - Math.floor(k / 2)) * DAY + 3600e3 * (2 + 4 * (k % 2)),
      rounds: rows(seats.length, 10 + (k % 4), (i) =>
        i % 3 ? [(i + k) % seats.length] : [0, (i + 1) % seats.length],
      ),
      finished: true,
    });
    g.players.forEach((p, i) => ((p.emoji = seats[i].emoji), (p.color = seats[i].color)));
    store(g, admin.id, now);
  }
  recompute(now);
  // The feed a real server would have written while these games were played.
  for (const r of [...liveGames()].reverse()) {
    const sum = gameSummary(r, now);
    if (sum.endedAt)
      feed({ kind: 'game_finished', game: sum, player: null, data: {}, createdAt: sum.endedAt });
  }
  db.activity.sort((a, b) => b.createdAt - a.createdAt);
}

/** Adds to the activity feed (newest first), numbered as the server numbers it. */
function feed(item: Seen) {
  db.activity.unshift({ ...item, id: db.nextActivity++ } as Activity);
}

const keyOf = (w: WireGame) => w.syncId ?? w.id;
const fromWire = (r: GameRec): Game => ({ ...r.payload, syncId: r.key });

function store(w: WireGame, ownerId: string, now: number) {
  const key = keyOf(w);
  const prev = db.games.get(key);
  db.games.set(key, {
    key,
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
      const g = fromWire(r);
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
  // Summaries reach everyone, so they never carry the email.
  return {
    ...p,
    email: null,
    photoUrl: photoUrl(p.id),
    games: mine.length,
    lastPlayedAt: last || null,
    createdByName: userName(p.createdBy),
  };
}

const photoUrl = (id: string | null) => {
  const r = id ? resolve(id) : '';
  return db.photos.has(r) ? `/api/players/${r}/photo?v=${db.photoRev.get(r) ?? 0}` : null;
};

function gameSummary(r: GameRec, now = Date.now(), pub = false): GameSummary {
  const g = fromWire(r);
  const end = gameEndedAt(g, now).at;
  return {
    id: r.key,
    owner: { id: pub ? null : r.ownerId, name: userName(r.ownerId) },
    createdAt: g.createdAt,
    updatedAt: r.updatedAt,
    endedAt: end,
    status: g.status,
    players: summaryPlayers(g, end != null).map((p) => ({
      ...p,
      playerId: p.playerId ?? '',
      photoUrl: photoUrl(p.playerId),
    })),
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

function readBytes(req: IncomingMessage, max: number): Promise<Buffer> {
  return new Promise((ok, no) => {
    const parts: Buffer[] = [];
    let n = 0;
    req.on('data', (c: Buffer) => {
      n += c.length;
      if (n > max) no(err(413, 'too_large'));
      else parts.push(c);
    });
    req.on('end', () => ok(Buffer.concat(parts)));
  });
}

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

const livePlayers = (exceptId?: string) =>
  [...db.players.values()].filter((p) => !p.mergedInto && p.id !== exceptId);

/** HANDOFF §5.7: the same player is name AND email of one live player; a partial match names nobody. */
function identify(name: string, email: string): 'match' | 'email_taken' | 'name_taken' | 'new' {
  const live = livePlayers();
  const byEmail = email ? live.find((p) => p.email === emailKey(email)) : undefined;
  const byName = live.find((p) => nameKey(p.displayName) === nameKey(name));
  if (byEmail && byEmail === byName) return 'match';
  if (byEmail) return 'email_taken';
  if (byName) return 'name_taken';
  return 'new';
}

/** Name and email rules for a new or renamed player; `exceptId` is the player being edited. */
function checkPlayer(
  body: Record<string, unknown>,
  exceptId?: string,
  need = { name: true, email: true },
) {
  const live = livePlayers(exceptId);
  if (need.email) {
    const email = body.email;
    if (typeof email !== 'string' || !emailOk(email))
      throw err(422, 'invalid', { fields: { email: 'must look like x@y.z' } });
    if (live.some((p) => p.email === emailKey(email))) throw err(409, 'email_taken');
  }
  if (need.name) {
    const name = String(body.displayName ?? '').trim();
    if (!name || name.length > 14)
      throw err(422, 'invalid', { fields: { displayName: 'must be 1-14 characters' } });
    if (live.some((p) => nameKey(p.displayName) === nameKey(name))) throw err(409, 'name_taken');
  }
}

/** A player as `me` may see it: the email only for the admin, its creator and its linked user. */
const view = (p: Player, me: User | null): Player => ({
  ...p,
  photoUrl: photoUrl(p.id),
  email:
    me && (me.role === 'admin' || p.createdBy === me.id || p.linkedUserId === me.id)
      ? p.email
      : null,
});

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
    return { user: userOut(u), player: u.playerId ? view(db.players.get(u.playerId)!, u) : null };
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
  player: me!.playerId ? view(db.players.get(me!.playerId)!, me) : null,
}));
on('GET', '/api/bootstrap', ({ me }) => {
  return {
    user: userOut(me!),
    player: me!.playerId ? view(db.players.get(me!.playerId)!, me) : null,
    players: [...db.players.values()].map((p) => view(p, me)),
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
    const byEmail = [...db.players.values()].find(
      (p) => !p.mergedInto && !p.linkedUserId && p.email === inv.email,
    );
    const pid = inv.playerId ?? byEmail?.id;
    return { email: inv.email, player: pid ? summaryOf(pid) : null };
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
      if (inv.playerId && inv.playerId !== p.id) throw err(422, 'invalid');
      if (p.email && p.email !== inv.email && inv.playerId !== p.id) throw err(409, 'email_taken');
      p.email ??= inv.email;
      player = p;
    } else {
      // A new player takes the invite's email, whatever was sent.
      checkPlayer({ ...(pl ?? {}), email: inv.email });
      if (db.players.has(String(pl?.id))) throw err(409, 'id_conflict');
      player = newPlayer({ ...(pl as unknown as Player), email: inv.email }, null, Date.now());
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
    feed({
      kind: 'player_joined',
      player: summaryOf(player.id),
      game: null,
      data: {},
      createdAt: Date.now(),
    });
    signIn(res, u);
    return { user: userOut(u), player: view(player, u) };
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
    if (!u.active) throw err(403, 'inactive');
    u.password = String(body.password);
    r.done = true;
    for (const [t, id] of db.sessions) if (id === u.id) db.sessions.delete(t);
    signIn(res, u);
    return { user: userOut(u), player: u.playerId ? view(db.players.get(u.playerId)!, u) : null };
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
  ({ me }) => {
    const pending = [...db.invites.values()].filter((i) => !i.done && i.expiresAt > Date.now());
    const rows: AdminUserRow[] = [...db.users.values()].map((u) => {
      const inv = pending.find((i) => i.email === u.email);
      return {
        user: userOut(u),
        player: u.playerId ? view(db.players.get(u.playerId)!, me) : null,
        active: u.active,
        lastSeenAt: u.lastSeenAt,
        invite: inv ? { email: inv.email, expiresAt: inv.expiresAt } : null,
      };
    });
    // Then invites nobody has accepted yet; their links are only shown once, when made.
    for (const i of pending)
      if (![...db.users.values()].some((u) => u.email === i.email))
        rows.push({
          user: null,
          player: i.playerId ? view(db.players.get(i.playerId)!, me) : null,
          active: false,
          lastSeenAt: null,
          invite: { email: i.email, expiresAt: i.expiresAt },
        });
    return rows;
  },
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
    const pid = typeof body.playerId === 'string' ? body.playerId : null;
    if (pid && !db.players.has(pid)) throw err(422, 'unknown_player', { playerIds: [pid] });
    if (pid && db.players.get(pid)!.linkedUserId) throw err(409, 'player_linked');
    for (const [t, i] of db.invites) if (i.email === email) db.invites.delete(t);
    const t = token(),
      expiresAt = Date.now() + 7 * DAY;
    db.invites.set(t, {
      email,
      playerId: pid,
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
    // Two players at one table are two people.
    const together = liveGames().some(
      (g) =>
        g.payload.players.some((p) => p.playerId === a.id) &&
        g.payload.players.some((p) => p.playerId === b.id),
    );
    if (together) throw err(422, 'invalid', { fields: { intoId: 'they played at one table' } });
    a.mergedInto = b.id;
    b.email ??= a.email;
    if (!db.photos.has(b.id) && db.photos.has(a.id)) db.photos.set(b.id, db.photos.get(a.id)!);
    a.email = null;
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
    return { player: view(b, null) };
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

on('GET', '/api/players', ({ url, me }) => {
  const since = Number(url.searchParams.get('updatedSince')) || 0;
  return page(
    [...db.players.values()]
      .filter((p) => p.updatedAt > since)
      .sort((a, b) => a.updatedAt - b.updatedAt)
      .map((p) => view(p, me)),
    url.searchParams.get('cursor'),
    200,
  );
});
on('GET', '/api/players/check', ({ url }) => {
  const name = url.searchParams.get('name') ?? '';
  const email = url.searchParams.get('email') ?? '';
  if (email && !emailOk(email))
    throw err(422, 'invalid', { fields: { email: 'must look like x@y.z' } });
  const status = identify(name, email);
  if (status !== 'match') return { status, player: null };
  const p = livePlayers().find((x) => x.email === emailKey(email))!;
  return { status, player: summaryOf(p.id) };
});
on('POST', '/api/players', ({ body, me }) => {
  const prev = db.players.get(String(body.id));
  if (prev) {
    // Idempotent by id: the same body again is fine, a different one is a conflict.
    if (prev.displayName === body.displayName && prev.email === emailKey(String(body.email ?? '')))
      return view(prev, me);
    throw err(409, 'id_conflict');
  }
  if (typeof body.email === 'string' && emailOk(body.email) && typeof body.displayName === 'string')
    if (identify(body.displayName, body.email) === 'match') {
      const p = livePlayers().find((x) => x.email === emailKey(String(body.email)))!;
      throw err(409, 'same_player', { player: summaryOf(p.id) });
    }
  checkPlayer(body);
  const p = newPlayer(body as unknown as Player, me!.id, Date.now());
  db.players.set(p.id, p);
  feed({
    kind: 'player_joined',
    player: summaryOf(p.id),
    game: null,
    data: {},
    createdAt: Date.now(),
  });
  return [201, view(p, me)];
});
on('PATCH', '/api/players/:id', ({ m, body, me }) => {
  const p = db.players.get(m[0]);
  if (!p) throw err(404, 'not_found');
  const admin = me!.role === 'admin',
    linked = p.linkedUserId === me!.id,
    creator = p.createdBy === me!.id;
  if (body.displayName !== undefined && !admin && !linked) throw err(403, 'forbidden');
  if (!admin && !linked && !creator) throw err(403, 'forbidden');
  if (body.email === null) throw err(422, 'invalid', { fields: { email: "can't be cleared" } });
  checkPlayer(body, p.id, {
    name: body.displayName !== undefined,
    email: body.email !== undefined,
  });
  for (const k of ['displayName', 'email', 'firstName', 'lastName', 'emoji', 'color'] as const)
    if (body[k] !== undefined)
      (p as unknown as Record<string, unknown>)[k] =
        k === 'email' ? emailKey(String(body[k])) : body[k];
  p.updatedAt = Date.now();
  db.version++;
  return view(p, me);
});
/** Who may change a player's photo or email: the admin, its creator and its linked user. */
function mayEdit(p: Player | undefined, me: UserRec) {
  if (!p || p.mergedInto) throw err(404, 'not_found');
  if (me.role !== 'admin' && p.createdBy !== me.id && p.linkedUserId !== me.id)
    throw err(403, 'forbidden');
  return p;
}
const PHOTO_TYPES = ['image/webp', 'image/jpeg', 'image/png'];
on('PUT', '/api/players/:id/photo', async ({ m, me, req }) => {
  const p = mayEdit(db.players.get(m[0]), me!);
  const type = String(req.headers['content-type'] ?? '').split(';')[0];
  const bytes = await readBytes(req, 2 * 1024 * 1024);
  if (!PHOTO_TYPES.includes(type) || !bytes.length)
    throw err(415, 'unsupported_media_type', {
      message: 'Send a WebP, JPEG or PNG image (at most 2 MB).',
    });
  // The real server re-encodes to a 256×256 WebP; the mock keeps the bytes as sent.
  db.photos.set(p.id, { bytes, type });
  db.photoRev.set(p.id, (db.photoRev.get(p.id) ?? 0) + 1);
  p.updatedAt = Date.now();
  db.version++;
  return { photoUrl: photoUrl(p.id) };
});
on('DELETE', '/api/players/:id/photo', ({ m, me }) => {
  const p = mayEdit(db.players.get(m[0]), me!);
  db.photos.delete(p.id);
  db.photoRev.set(p.id, (db.photoRev.get(p.id) ?? 0) + 1);
  p.updatedAt = Date.now();
  db.version++;
  return null;
});
on(
  'GET',
  '/api/players/:id/photo',
  ({ m, res }) => {
    const ph = db.photos.get(resolve(m[0]));
    if (!ph) throw err(404, 'not_found');
    res.writeHead(200, {
      'Content-Type': ph.type,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    res.end(ph.bytes);
    return RAW;
  },
  'public',
);
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
    biggestWin: h.biggestWin && {
      by: h.biggestWin.by,
      game: sum(h.biggestWin.gameId),
      winner: h.biggestWin.winner,
    },
  };
});

// ——— §6.4 games ———

on('PUT', '/api/games/:id', ({ m, body, me }) => {
  const w = body as unknown as WireGame;
  const key = keyOf(w);
  if (key !== m[0]) throw err(422, 'invalid_game', { reason: 'id', roundIndex: null });
  const prev = db.games.get(key);
  if (prev?.deletedAt) throw err(410, 'gone');
  const h = hash(JSON.stringify(w));
  if (prev) {
    if (prev.ownerId !== me!.id && me!.role !== 'admin') throw err(403, 'forbidden');
    if (prev.hash === h) return { rev: prev.rev, earned: [] };
    if (w.rev <= prev.rev) throw err(409, 'stale', { server: prev.payload });
  }
  if (w.players.some((p) => !p.playerId))
    throw err(422, 'invalid_game', { reason: 'players', roundIndex: null });
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
  const v = validate({ ...w, syncId: key }, Date.now());
  if (!v.ok) throw err(422, 'invalid_game', { reason: v.reason, roundIndex: v.roundIndex ?? null });
  const wasEnded = prev ? gameEndedAt(fromWire(prev), Date.now()).at != null : false;
  store(w, me!.id, Date.now());
  const earned = recompute();
  const rec = db.games.get(key)!;
  const sum = gameSummary(rec);
  if (!wasEnded && sum.endedAt)
    feed({ kind: 'game_finished', player: null, game: sum, data: {}, createdAt: Date.now() });
  // The server feeds every achievement, round moments included (HANDOFF §10).
  for (const e of earned)
    feed({
      kind: 'achievement',
      player: summaryOf(e.playerId),
      game: sum,
      data: { code: e.code, ...e.data },
      createdAt: e.earnedAt,
    });
  notify(
    key,
    'game',
    {
      game: w,
      summary: gameSummary(rec, Date.now(), true),
      updatedAt: rec.updatedAt,
      scorerSeenAt: rec.scorerSeenAt,
    },
    w.rev,
  );
  return { rev: w.rev, earned, ...(Object.keys(remap).length && { remap }) };
});
on('GET', '/api/games', ({ url, me }) => {
  const since = Number(url.searchParams.get('updatedSince')) || 0;
  const mine = url.searchParams.get('mine') === 'true';
  const list = [...db.games.values()]
    .filter(
      (g) => g.updatedAt > since && (!mine || g.ownerId === me!.id) && (!g.deletedAt || since > 0),
    )
    .sort((a, b) => b.updatedAt - a.updatedAt)
    // Deleted games come back only to a caller catching up, as tombstones.
    .map((g) =>
      g.deletedAt ? { id: g.key, deleted: true as const, updatedAt: g.updatedAt } : gameSummary(g),
    );
  return page(list, url.searchParams.get('cursor'), Number(url.searchParams.get('limit')) || 50);
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
  r.deletedAt = r.updatedAt = Date.now();
  for (const k of ['live', 'recap'] as const)
    if (r.links[k]) {
      db.links.get(r.links[k]!)!.revoked = true;
      if (k === 'live') notify(r.key, 'revoked', {});
      delete r.links[k];
    }
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
const awardsOut = (
  f: Facts,
  list: { code: string; playerId: string; value: number; gameId?: string; roundIndex?: number }[],
) =>
  list.map(({ playerId, gameId, roundIndex, ...a }) => ({
    ...a,
    player: summaryOf(playerId, f),
    gameId: gameId ?? null,
    roundIndex: roundIndex ?? null,
  }));
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
on('GET', '/api/wrapped/:y/:id', ({ m }) => {
  const id = resolve(m[1]);
  if (!db.players.has(id)) throw err(404, 'not_found');
  const f = facts();
  const w = wrapped(f, id, Number(m[0]), TZ);
  return {
    ...w,
    player: summaryOf(id, f),
    totals: statsOut(f, id, 0, Infinity),
    nemesis: w.nemesis && { ...w.nemesis, player: summaryOf(w.nemesis.playerId, f) },
    partner: w.partner && { ...w.partner, player: summaryOf(w.partner.playerId, f) },
  };
});
on('GET', '/api/activity', ({ url }) =>
  page(db.activity, url.searchParams.get('cursor'), Number(url.searchParams.get('limit')) || 50),
);
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
  const r = db.games.get(l.gameId);
  if (l.revoked || !r || r.deletedAt) throw err(410, 'gone');
  return r;
}
const pub = (r: GameRec) => gameSummary(r, Date.now(), true);
on(
  'GET',
  '/api/public/live/:t',
  ({ m }) => {
    const r = linkGame(m[0], 'live');
    return {
      game: r.payload,
      summary: pub(r),
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
    const id = r.key;
    const set = sse.get(id) ?? new Set();
    set.add(res);
    sse.set(id, set);
    if (req.headers['last-event-id'] !== String(r.rev))
      res.write(
        `event: game\nid: ${r.rev}\ndata: ${JSON.stringify({ game: r.payload, summary: pub(r), updatedAt: r.updatedAt, scorerSeenAt: r.scorerSeenAt })}\n\n`,
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
      summary: pub(r),
      achievements: [...db.achievements.values()].filter((a) => a.gameId === r.key),
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
  const rawBody = req.method === 'PUT' && url.pathname.endsWith('/photo');
  const send = (status: number, body: unknown) => {
    if (res.headersSent) return;
    if (status === 204 || status === 304 || body === null) {
      res.statusCode = status;
      return res.end();
    }
    const json = JSON.stringify(body);
    // Every signed-in read answers If-None-Match, as the server's ETag reads do.
    if (req.method === 'GET' && status === 200 && !url.pathname.startsWith('/api/public')) {
      const etag = (res.getHeader('ETag') as string | undefined) ?? `W/"${hash(json)}"`;
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'private, no-cache');
      if (req.headers['if-none-match'] === etag) {
        res.statusCode = 304;
        return res.end();
      }
    }
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(json);
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
      req.method === 'GET' || req.method === 'DELETE' || rawBody
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
