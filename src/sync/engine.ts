/**
 * The push/pull loop (plan-frontend §7): players first, then games; pulls the registry and this account's games;
 * settles stale uploads with a conflict copy (nothing is ever dropped). It runs only while signed in. Screens never
 * wait for it: they read the archive, which this keeps up to date.
 */
import { doneRounds, emailKey, nameKey, type Game } from '@/domain';
import { uuid } from '@/lib/ids';
import { archive, type GameRec, type InboxItem, type PlayerRec } from '@/state/archive';
import type { Session } from '@/state/persistence';
import { idOf } from '@/state/registry';
import type { Route } from '@/state/types';
import { ApiError } from './api';
import { sessionOf } from './account';
import { ep } from './endpoints';
import { setSyncStatus } from './status';
import type { Achievement, Player, WireGame } from './types';

/** What the engine needs from the app; bound by the provider. */
export interface EngineCtx {
  session(): Session | null;
  game(): Game;
  setSession(s: Session | null): void;
  /** Replaces the current game in place (same game, new content); `fresh` also clears Undo. */
  syncGame(g: Game, fresh: boolean): void;
  open(r: Route): void;
}

let ctx: EngineCtx | null = null;
export const bindEngine = (c: EngineCtx | null) => (ctx = c);

const PULL_EVERY = 10 * 60e3;
const MAX_BACKOFF = 5 * 60e3;
let running: Promise<void> | null = null;
let again = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let failures = 0;
let lastPull = 0;

export const toWire = (g: Game): WireGame => {
  const { syncId, id, ...rest } = g;
  return {
    ...rest,
    id: syncId,
    localId: id,
    players: g.players.map((p) => ({ ...p, playerId: idOf(p) })),
  };
};
export const fromWire = (w: WireGame): Game => {
  const { localId, ...rest } = w;
  return { ...(rest as unknown as Game), id: localId ?? 'r-' + w.id, syncId: w.id };
};

const cacheGet = <T>(k: string): T | undefined => archive.get('cache', k)?.value as T | undefined;
const cacheSet = (k: string, value: unknown, etag?: string | null) =>
  archive.put('cache', { key: k, value, etag, fetchedAt: Date.now() });

/** Games that sync to this account and have changes the server hasn't accepted. */
export const pendingGames = (userId: string): GameRec[] =>
  archive
    .games()
    .filter(
      (r) =>
        r.account === userId &&
        !r.conflictOf &&
        r.game.id !== 'demo' &&
        r.syncedRev !== r.game.rev &&
        !archive.get('outbox', 'put:' + r.syncId)?.blocked,
    );

const inbox = (kind: InboxItem['kind'], key: string, data: Record<string, unknown>) =>
  archive.put('inbox', { id: `${kind}:${key}`, kind, key, data, createdAt: Date.now() });

function report(phase?: 'idle' | 'offline' | 'attention') {
  const s = ctx?.session();
  if (!s) return setSyncStatus({ phase: 'signedOut', waiting: 0, attention: 0 });
  const waiting = pendingGames(s.user.id).length;
  const attention = archive.all('inbox').length + (s.stale ? 1 : 0);
  setSyncStatus({
    phase: phase ?? (attention ? 'attention' : 'idle'),
    waiting,
    attention,
  });
}

/** Runs a sync soon (debounced); `ms` is how soon. */
export function scheduleSync(ms = 1500) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), ms);
}

/** Syncs now; a call while one runs makes it go round once more. */
export function syncNow(o: { full?: boolean } = {}): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = run(o.full ?? false).finally(() => {
    running = null;
    if (again) {
      again = false;
      scheduleSync(50);
    }
  });
  return running;
}

async function run(full: boolean) {
  const s = ctx?.session();
  if (!ctx || !s || s.stale) return report();
  await archive.ready;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return report('offline');
  setSyncStatus({ phase: 'syncing' });
  try {
    if (full || Date.now() - lastPull > PULL_EVERY) await pullAll();
    await pushPlayers();
    await pushDeletes();
    await pushGames(s.user.id);
    failures = 0;
    setSyncStatus({ lastSyncAt: Date.now() });
    report();
    if (pendingGames(s.user.id).some((r) => !waitsForPlayers(r))) scheduleSync(60e3);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return report('attention');
    failures++;
    report(e instanceof ApiError && e.offline ? 'offline' : undefined);
    scheduleSync(Math.min(MAX_BACKOFF, 2000 * 2 ** failures));
  }
}

// ——— pull ———

const toRec = (p: Player, prev?: PlayerRec): PlayerRec => ({
  ...prev,
  id: p.id,
  displayName: p.displayName,
  nameKey: nameKey(p.displayName),
  // The server hides other people's emails; keep one this device already had.
  email: p.email ?? prev?.email ?? null,
  firstName: p.firstName,
  lastName: p.lastName,
  emoji: p.emoji,
  color: p.color,
  createdBy: p.createdBy,
  linkedUserId: p.linkedUserId,
  mergedInto: p.mergedInto,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
  local: false,
  pendingCreate: false,
});

function upsertPlayers(list: Player[]) {
  archive.put('players', ...list.map((p) => toRec(p, archive.get('players', p.id))));
}

async function pullAll() {
  const prev = archive.get('cache', 'bootstrap');
  const r = await ep.bootstrap({ etag: prev?.etag });
  if (r.status !== 304 && r.data) {
    const b = r.data;
    upsertPlayers(b.players);
    const next = sessionOf(b.user, b.player);
    if (JSON.stringify(next) !== JSON.stringify(ctx!.session())) ctx!.setSession(next);
    cacheSet('bootstrap', { dataVersion: b.dataVersion }, r.etag);
    cacheSet('myAchievements', b.myAchievements);
    cacheSet('myGames', b.myGames);
    cacheSet('players:since', Math.max(0, ...b.players.map((p) => p.updatedAt)));
  } else {
    const since = cacheGet<number>('players:since') ?? 0;
    let cursor: string | null = null;
    let max = since;
    do {
      const page = await ep.players(since, cursor);
      upsertPlayers(page.items);
      max = Math.max(max, ...page.items.map((p) => p.updatedAt));
      cursor = page.nextCursor;
    } while (cursor);
    cacheSet('players:since', max);
  }
  await pullMyGames();
  lastPull = Date.now();
}

/** This account's games from other devices: new ones are added, ones not changed here take the server's copy. */
async function pullMyGames() {
  const me = ctx!.session()!.user.id;
  const since = cacheGet<number>('games:since') ?? 0;
  const started = Date.now();
  let cursor: string | null = null;
  do {
    const page = await ep.games({ mine: true, updatedSince: since, cursor });
    for (const sum of page.items) {
      const rec = archive.get('games', sum.id);
      const dirty = rec && rec.syncedRev !== rec.game.rev;
      if (dirty) continue;
      if (rec && doneRounds(rec.game).length === sum.rounds && rec.game.status === sum.status)
        continue;
      const full = await ep.game(sum.id);
      const g = fromWire(full.game);
      archive.put('games', {
        ...rec,
        syncId: sum.id,
        game: g,
        updatedAt: g.updatedAt,
        endedAt: sum.endedAt,
        origin: rec?.origin ?? 'remote',
        account: me,
        syncedRev: g.rev,
        earned: full.achievements,
      });
      if (ctx!.game().syncId === g.syncId && ctx!.game().rev < g.rev) ctx!.syncGame(g, true);
    }
    cursor = page.nextCursor;
  } while (cursor);
  cacheSet('games:since', started - 60e3);
}

// ——— push ———

async function pushPlayers() {
  for (const p of archive.all('players').filter((x) => x.pendingCreate && !x.mergedInto)) {
    // A player goes up with its email; one without waits for someone to add it (the inbox asks).
    if (!p.email) {
      inbox('nameMatch', p.id, {
        name: p.displayName,
        playerId: p.id,
        field: 'email',
        missing: true,
      });
      archive.put('players', { ...p, pendingCreate: false });
      continue;
    }
    try {
      const out = await ep.createPlayer({
        id: p.id,
        displayName: p.displayName,
        email: p.email,
        emoji: p.emoji,
        color: p.color,
        ...(p.firstName && { firstName: p.firstName }),
        ...(p.lastName && { lastName: p.lastName }),
      });
      archive.put('players', toRec(out, p));
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 409) throw e;
      // Someone else has this name: the person decides whether it's the same player (the games wait).
      archive.put('players', { ...p, pendingCreate: false });
      inbox('nameMatch', p.id, {
        name: p.displayName,
        playerId: p.id,
        field: e.code === 'email_taken' ? 'email' : 'name',
        existing: e.body.existing,
      });
    }
  }
}

async function pushDeletes() {
  for (const o of archive.all('outbox').filter((x) => x.kind === 'deleteGame' && !x.blocked)) {
    try {
      await ep.deleteGame(o.key);
    } catch (e) {
      if (!(e instanceof ApiError) || (e.status !== 404 && e.status !== 403)) throw e;
    }
    archive.del('outbox', o.id);
  }
}

/** A game uploads only once every seat is a player the server knows. */
const waitsForPlayers = (r: GameRec) =>
  r.game.players.some((p) => {
    const rec = archive.get('players', idOf(p));
    return !rec || rec.local;
  });

async function pushGames(userId: string) {
  for (const r of pendingGames(userId)) {
    if (r.game.players.length < 3 || waitsForPlayers(r)) continue;
    const g = r.game;
    try {
      const out = await ep.putGame(toWire(g));
      const now = archive.get('games', r.syncId)!;
      archive.put('games', {
        ...now,
        syncedRev: out.rev,
        earned: [...((now.earned as Achievement[] | undefined) ?? []), ...out.earned],
      });
      if (out.remap) remap(out.remap);
      archive.del('outbox', 'put:' + r.syncId);
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      if (e.status === 409 && e.code === 'stale')
        settleStale(r, fromWire(e.body.server as WireGame));
      else if (e.status === 422 && e.code === 'invalid_game') {
        block(r, String(e.body.reason ?? 'invalid_game'));
        inbox('rejected', r.syncId, { reason: e.body.reason, roundIndex: e.body.roundIndex });
      } else if (e.status === 422 && e.code === 'unknown_player') {
        // The server doesn't know these players yet: create them first, the game goes next time.
        for (const id of (e.body.playerIds as string[]) ?? []) {
          const p = archive.get('players', id);
          if (p) archive.put('players', { ...p, pendingCreate: true, local: true });
        }
      } else if (e.status === 403) {
        block(r, 'forbidden');
        inbox('rejected', r.syncId, { reason: 'forbidden' });
      } else throw e;
    }
  }
}

function block(r: GameRec, why: string) {
  archive.put('outbox', {
    id: 'put:' + r.syncId,
    kind: 'putGame',
    key: r.syncId,
    attempts: 1,
    nextAt: 0,
    createdAt: Date.now(),
    blocked: why,
  });
}

/** Rewrites player ids the server merged, in the archive and the current game. */
function remap(map: Record<string, string>) {
  const fix = (g: Game): Game => ({
    ...g,
    players: g.players.map((p) =>
      p.playerId && map[p.playerId] ? { ...p, playerId: map[p.playerId] } : p,
    ),
  });
  for (const r of archive.games())
    if (r.game.players.some((p) => p.playerId && map[p.playerId]))
      archive.put('games', { ...r, game: fix(r.game) });
  const cur = ctx!.game();
  if (cur.players.some((p) => p.playerId && map[p.playerId])) ctx!.syncGame(fix(cur), false);
}

/**
 * Two devices changed the same game. The copy with more finished rounds wins (on a tie, the newer); the other is
 * kept as a conflict copy in History so nothing is lost, and the inbox says so.
 */
export function settleStale(r: GameRec, server: Game) {
  const mine = r.game;
  const keepMine =
    doneRounds(mine).length > doneRounds(server).length ||
    (doneRounds(mine).length === doneRounds(server).length && mine.updatedAt > server.updatedAt);
  const loser = keepMine ? server : mine;
  const copyId = uuid();
  archive.put('games', {
    syncId: copyId,
    game: { ...loser, syncId: copyId, id: loser.id + '-copy' },
    updatedAt: loser.updatedAt,
    endedAt: r.endedAt,
    origin: 'local',
    conflictOf: r.syncId,
  });
  if (keepMine) {
    // Overwrite the server: our content with a revision past its own.
    const g = { ...mine, rev: server.rev + 1 };
    archive.put('games', { ...r, game: g, syncedRev: server.rev });
    if (ctx!.game().syncId === g.syncId) ctx!.syncGame(g, false);
  } else {
    archive.put('games', {
      ...r,
      game: server,
      updatedAt: server.updatedAt,
      syncedRev: server.rev,
    });
    if (ctx!.game().syncId === server.syncId) ctx!.syncGame(server, true);
  }
  inbox('conflict', r.syncId, { copy: copyId });
}

/** Keeps a conflict copy's content as the game (it then syncs), or drops the copy. */
export function resolveConflict(copyId: string, keepCopy: boolean) {
  const copy = archive.get('games', copyId);
  if (!copy?.conflictOf) return;
  const main = archive.get('games', copy.conflictOf);
  if (keepCopy && main) {
    const g = { ...copy.game, syncId: main.syncId, id: main.game.id, rev: main.game.rev + 1 };
    archive.put('games', { ...main, game: g, updatedAt: Date.now() });
    if (ctx?.game().syncId === g.syncId) ctx.syncGame(g, true);
  }
  archive.del('games', copyId);
  archive.del('inbox', 'conflict:' + copy.conflictOf);
  scheduleSync(200);
}

/** Settles a name clash from the inbox: the same person (games move to them) or a new name. */
export function resolveNameMatch(
  localId: string,
  same: { existingId: string } | { rename: string } | { email: string },
) {
  const p = archive.get('players', localId);
  if (!p) return;
  if ('existingId' in same) {
    archive.put('players', { ...p, mergedInto: same.existingId, pendingCreate: false });
    remap({ [localId]: same.existingId });
  } else if ('email' in same)
    archive.put('players', { ...p, email: emailKey(same.email), pendingCreate: true });
  else
    archive.put('players', {
      ...p,
      displayName: same.rename,
      nameKey: nameKey(same.rename),
      pendingCreate: true,
    });
  archive.del('inbox', 'nameMatch:' + localId);
  scheduleSync(200);
}

/** Whether anything is waiting to go up (the archive listener only wakes the engine for real work). */
export const hasWork = (userId: string) =>
  archive.all('players').some((p) => p.pendingCreate && !p.mergedInto) ||
  archive.all('outbox').some((o) => o.kind === 'deleteGame') ||
  pendingGames(userId).some((r) => !waitsForPlayers(r));

/** Marks a deleted game for removal on the server (owner or admin). */
export function queueDelete(syncId: string) {
  const r = archive.get('games', syncId);
  if (!r?.account || r.syncedRev === undefined) return;
  archive.put('outbox', {
    id: 'del:' + syncId,
    kind: 'deleteGame',
    key: syncId,
    attempts: 0,
    nextAt: 0,
    createdAt: Date.now(),
  });
  scheduleSync(200);
}

/** Games scored here before signing in that the account doesn't have yet. */
export const importable = (): GameRec[] =>
  archive
    .games()
    .filter(
      (r) =>
        r.origin === 'local' &&
        !r.account &&
        !r.conflictOf &&
        r.game.id !== 'demo' &&
        r.game.players.length >= 3 &&
        doneRounds(r.game).length > 0,
    );

/** Adds the chosen games to the account; `matches` maps this device's player ids to server ones (or null: new). */
export function importGames(syncIds: string[], matches: Record<string, string | null>) {
  const me = ctx?.session()?.user.id;
  if (!me) return;
  for (const [local, server] of Object.entries(matches)) {
    const p = archive.get('players', local);
    if (!p) continue;
    if (server) archive.put('players', { ...p, mergedInto: server, pendingCreate: false });
    else archive.put('players', { ...p, pendingCreate: true });
  }
  for (const id of syncIds) {
    const r = archive.get('games', id);
    if (!r) continue;
    const game = { ...r.game, players: r.game.players.map((p) => ({ ...p, playerId: idOf(p) })) };
    archive.put('games', { ...r, game, account: me });
    if (ctx?.game().syncId === id) ctx.syncGame(game, false);
  }
  cacheSet('import:asked', true);
  scheduleSync(100);
}

export const importAsked = () => !!cacheGet<boolean>('import:asked');
export const markImportAsked = () => cacheSet('import:asked', true);

/** An unfinished game of this account last touched on another device, newer than the one here. */
export function continueElsewhere(current: Game): GameRec | null {
  const me = ctx?.session()?.user.id;
  if (!me) return null;
  return (
    archive
      .games()
      .filter(
        (r) =>
          r.origin === 'remote' &&
          r.account === me &&
          r.endedAt == null &&
          r.game.status === 'active' &&
          r.syncId !== current.syncId &&
          r.updatedAt > (current.id === 'demo' ? 0 : current.updatedAt),
      )
      .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null
  );
}

/** Someone else's game, fetched once and kept for viewing. */
export async function fetchGame(id: string): Promise<GameRec | null> {
  const have = archive.get('games', id);
  if (have) return have;
  const r = await ep.game(id);
  const g = fromWire(r.game);
  const rec: GameRec = {
    syncId: id,
    game: g,
    updatedAt: g.updatedAt,
    endedAt: r.summary.endedAt,
    origin: 'remote',
    owner: r.summary.owner,
    syncedRev: g.rev,
    earned: r.achievements,
  };
  archive.put('games', rec);
  return rec;
}
