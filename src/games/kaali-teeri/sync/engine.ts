/**
 * Kaali Teeri's push/pull loop, with Kachuful's semantics (games/kachuful/sync/engine.ts): players first (the shared
 * registry), then games; pulls this account's games into `ktGames`; settles stale uploads with a conflict copy. It
 * runs only while signed in, and screens never wait for it: they read the archive, which this keeps up to date.
 */
import { doneHands, type KtGame } from '@/games/kaali-teeri/domain';
import { uuid } from '@/lib/ids';
import { archive, type InboxItem, type KtGameRec } from '@/state/archive';
import type { Session } from '@/state/persistence';
import { idOf } from '@/state/registry';
import { ApiError } from '@/sync/api';
import { playersWaiting, pullPlayers, pushPlayers } from '@/sync/players';
import { setSyncStatus } from '@/sync/status';
import { ktEp } from './endpoints';
import type { KtGameSummary, KtListItem, KtWireGame } from './types';

/** What the engine needs from the app; bound by KtProvider. */
export interface KtEngineCtx {
  session(): Session | null;
  /** The game on the table, if any. */
  game(): KtGame | null;
  /** Replaces the current game in place (same game, new content); `fresh` also clears Undo. */
  syncGame(g: KtGame, fresh: boolean): void;
}

let ctx: KtEngineCtx | null = null;
export const bindKtEngine = (c: KtEngineCtx | null) => (ctx = c);

const PULL_EVERY = 10 * 60e3;
const MAX_BACKOFF = 5 * 60e3;
const DAY = 864e5;
/** A write can commit with a time a little before our last read: ask again from a bit earlier. */
const OVERLAP = 5000;
let running: Promise<void> | null = null;
let again = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let failures = 0;
let lastPull = 0;
/** No requests before this time (after a 429). */
let waitUntil = 0;

/** Forgets the loop's timing between tests (module state outlives a test). */
export function resetKtEngineForTests() {
  if (timer) clearTimeout(timer);
  [running, again, timer, failures, lastPull, waitUntil] = [null, false, null, 0, 0, 0];
}

/** The game as it is, every seat with its registry id; the server keys it by `syncId`. */
export const toWire = (g: KtGame): KtWireGame => ({
  ...g,
  players: g.players.map((p) => ({ ...p, playerId: idOf(p) })),
});
/** A stored game; `key` is the id the server keeps it under. */
export const fromWire = (w: KtWireGame, key?: string): KtGame => ({
  ...w,
  syncId: w.syncId ?? key ?? w.id,
});

const cacheGet = <T>(k: string): T | undefined => archive.get('cache', k)?.value as T | undefined;
const cacheSet = (k: string, value: unknown) =>
  archive.put('cache', { key: k, value, fetchedAt: Date.now() });

const putId = (syncId: string) => 'ktput:' + syncId;

/** Games that sync to this account and have changes the server hasn't accepted. */
export const pendingKtGames = (userId: string): KtGameRec[] =>
  archive
    .ktGames()
    .filter(
      (r) =>
        r.account === userId &&
        !r.conflictOf &&
        r.game.id !== 'demo' &&
        r.syncedRev !== r.game.rev &&
        !archive.get('outbox', putId(r.syncId))?.blocked,
    );

// Ids are prefixed so they never collide with Kachuful's; `game` lets the inbox tell the two apart.
const inbox = (kind: InboxItem['kind'], key: string, data: Record<string, unknown>) =>
  archive.put('inbox', {
    id: `kt:${kind}:${key}`,
    kind,
    key,
    data: { ...data, game: 'kaali-teeri' },
    createdAt: Date.now(),
  });

function report(phase?: 'idle' | 'offline' | 'attention') {
  const s = ctx?.session();
  if (!s) return setSyncStatus({ phase: 'signedOut', waiting: 0, attention: 0 });
  const attention = archive.all('inbox').length + (s.stale ? 1 : 0);
  setSyncStatus({
    phase: phase ?? (attention ? 'attention' : 'idle'),
    waiting: pendingKtGames(s.user.id).length,
    attention,
  });
}

/** Runs a sync soon (debounced); `ms` is how soon. */
export function scheduleKtSync(ms = 1500) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void syncKtNow(), ms);
}

/** Syncs now; a call while one runs makes it go round once more. */
export function syncKtNow(o: { full?: boolean } = {}): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = run(o.full ?? false).finally(() => {
    running = null;
    if (again) {
      again = false;
      scheduleKtSync(50);
    }
  });
  return running;
}

async function run(full: boolean) {
  const s = ctx?.session();
  if (!ctx || !s || s.stale) return report();
  await archive.ready;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return report('offline');
  if (Date.now() < waitUntil) {
    scheduleKtSync(waitUntil - Date.now());
    return report();
  }
  waitUntil = 0;
  setSyncStatus({ phase: 'syncing' });
  try {
    if (full || Date.now() - lastPull > PULL_EVERY) await pullAll();
    await pushPlayers(remap);
    await pushDeletes();
    await pushGames(s.user.id);
    failures = 0;
    setSyncStatus({ lastSyncAt: Date.now() });
    report();
    if (pendingKtGames(s.user.id).some((r) => !waitsForPlayers(r))) scheduleKtSync(60e3);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return report('attention');
    if (e instanceof ApiError && e.retryAfter) {
      waitUntil = Date.now() + e.retryAfter * 1000;
      report();
      return scheduleKtSync(e.retryAfter * 1000);
    }
    failures++;
    report(e instanceof ApiError && e.offline ? 'offline' : undefined);
    scheduleKtSync(Math.min(MAX_BACKOFF, 2000 * 2 ** failures));
  }
}

// ——— pull ———

async function pullAll() {
  await pullPlayers();
  await pullMyGames();
  await pullMet();
  lastPull = Date.now();
}

const isGone = (x: KtListItem): x is Extract<KtListItem, { deleted: true }> =>
  'deleted' in x && x.deleted;
const newest = (xs: { updatedAt: number }[]) => Math.max(0, ...xs.map((x) => x.updatedAt));

/**
 * This account's games from other devices, and games others scored with this account's player at the table: new
 * ones are added, ones not changed here take the server's copy, and games deleted on the server leave this device.
 */
async function pullMyGames() {
  const since = cacheGet<number>('kt:games:since') ?? 0;
  let max = since;
  let cursor: string | null = null;
  do {
    const page = await ktEp.games({
      involving: true,
      updatedSince: since ? Math.max(0, since - OVERLAP) : undefined,
      cursor,
    });
    max = Math.max(max, newest(page.items));
    for (const sum of page.items) {
      if (isGone(sum)) dropDeleted(sum.id);
      else await pullSummary(sum);
    }
    cursor = page.nextCursor;
  } while (cursor);
  cacheSet('kt:games:since', max);
}

/**
 * One game from its list summary: fetched when this device has no copy or an older one, left alone when this
 * device has changes the server hasn't accepted. Resolves with the copy kept here.
 */
export async function pullSummary(sum: KtGameSummary): Promise<KtGameRec | undefined> {
  const rec = archive.get('ktGames', sum.id);
  if (rec && rec.syncedRev !== rec.game.rev) return rec;
  if (rec && doneHands(rec.game).length === sum.hands && rec.game.status === sum.status) return rec;
  const full = await ktEp.game(sum.id);
  const g = fromWire(full.game, sum.id);
  const me = ctx!.session()!.user.id;
  // Someone else's game, sat in: kept for viewing, never synced back from here.
  const mine = !sum.owner.id || sum.owner.id === me;
  const next: KtGameRec = {
    ...rec,
    syncId: sum.id,
    game: g,
    updatedAt: g.updatedAt,
    endedAt: g.status === 'finished' ? (sum.finishedAt ?? g.updatedAt) : null,
    origin: rec?.origin ?? 'remote',
    owner: sum.owner,
    account: mine ? me : undefined,
    syncedRev: g.rev,
  };
  archive.put('ktGames', next);
  const cur = ctx!.game();
  if (cur && cur.syncId === g.syncId && cur.rev < g.rev) ctx!.syncGame(g, true);
  return next;
}

/**
 * Everyone this account's player has sat with at Kaali Teeri, added to the circle setup suggests from (shared with
 * Kachuful's). The list is newest started first, so later pulls stop a day before the last one.
 */
async function pullMet() {
  const me = ctx!.session()!.player?.id;
  if (!me) return;
  const since = cacheGet<number>('kt:met:since');
  const now = Date.now();
  const met = new Set(cacheGet<string[]>('met') ?? []);
  let cursor: string | null = null;
  do {
    const page = await ktEp.playerGames(me, cursor);
    for (const g of page.items)
      for (const p of g.players) if (p.playerId && p.playerId !== me) met.add(p.playerId);
    const older = since !== undefined && page.items.some((g) => g.createdAt < since - DAY);
    cursor = older ? null : page.nextCursor;
  } while (cursor);
  cacheSet('met', [...met]);
  cacheSet('kt:met:since', now);
}

/** A game deleted on the server: gone here too, except the one on the table, which stays on this phone only. */
function dropDeleted(syncId: string) {
  archive.del('outbox', putId(syncId));
  const rec = archive.get('ktGames', syncId);
  if (!rec) return;
  if (ctx!.game()?.syncId !== syncId) return archive.del('ktGames', syncId);
  archive.put('ktGames', { ...rec, account: undefined, syncedRev: undefined });
  inbox('rejected', syncId, { reason: 'deleted' });
}

// ——— push ———

async function pushDeletes() {
  for (const o of archive.all('outbox').filter((x) => x.kind === 'deleteKtGame' && !x.blocked)) {
    try {
      await ktEp.deleteGame(o.key);
    } catch (e) {
      if (!(e instanceof ApiError) || (e.status !== 404 && e.status !== 403 && e.status !== 410))
        throw e;
    }
    archive.del('outbox', o.id);
  }
}

/** A game uploads only once every seat is a player the server knows. */
const waitsForPlayers = (r: KtGameRec) =>
  r.game.players.some((p) => {
    const rec = archive.get('players', idOf(p));
    return !rec || rec.local;
  });

async function pushGames(userId: string) {
  for (const r of pendingKtGames(userId)) {
    if (waitsForPlayers(r)) continue;
    try {
      const out = await ktEp.putGame(toWire(r.game));
      archive.put('ktGames', { ...archive.get('ktGames', r.syncId)!, syncedRev: out.rev });
      if (out.remap) remap(out.remap);
      archive.del('outbox', putId(r.syncId));
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      if (e.status === 409 && e.code === 'stale')
        settleStale(r, fromWire(e.body.server as KtWireGame, r.syncId));
      else if (e.status === 410) dropDeleted(r.syncId);
      else if (e.status === 422 && e.code === 'invalid_game') {
        block(r, String(e.body.reason ?? 'invalid_game'));
        inbox('rejected', r.syncId, { reason: e.body.reason, handIndex: e.body.handIndex });
      } else if (e.status === 422 && e.code === 'unknown_player') {
        // The server doesn't know these players yet: create them first, the game goes next time.
        for (const id of (e.body.playerIds as string[]) ?? []) {
          const p = archive.get('players', id);
          if (p) archive.put('players', { ...p, pendingCreate: true, local: true });
        }
      } else if (e.status === 403 || (e.status === 409 && e.code === 'kind_mismatch')) {
        block(r, e.code);
        inbox('rejected', r.syncId, { reason: e.code });
      } else throw e;
    }
  }
}

function block(r: KtGameRec, why: string) {
  archive.put('outbox', {
    id: putId(r.syncId),
    kind: 'putKtGame',
    key: r.syncId,
    attempts: 1,
    nextAt: 0,
    createdAt: Date.now(),
    blocked: why,
  });
}

/** Rewrites player ids the server merged, in the archive and the current game. */
function remap(map: Record<string, string>) {
  const hit = (g: KtGame) => g.players.some((p) => p.playerId && map[p.playerId]);
  const fix = (g: KtGame): KtGame => ({
    ...g,
    players: g.players.map((p) =>
      p.playerId && map[p.playerId] ? { ...p, playerId: map[p.playerId] } : p,
    ),
  });
  for (const r of archive.ktGames())
    if (hit(r.game)) archive.put('ktGames', { ...r, game: fix(r.game) });
  const cur = ctx!.game();
  if (cur && hit(cur)) ctx!.syncGame(fix(cur), false);
}

/**
 * Two devices changed the same game. The copy with more done hands wins (on a tie, the newer); the other is kept as
 * a conflict copy so nothing is lost, and the inbox says so.
 */
export function settleStale(r: KtGameRec, server: KtGame) {
  const mine = r.game;
  const [a, b] = [doneHands(mine).length, doneHands(server).length];
  const keepMine = a > b || (a === b && mine.updatedAt > server.updatedAt);
  const loser = keepMine ? server : mine;
  const copyId = uuid();
  archive.put('ktGames', {
    syncId: copyId,
    game: { ...loser, syncId: copyId, id: loser.id + '-copy' },
    updatedAt: loser.updatedAt,
    endedAt: r.endedAt,
    origin: 'local',
    conflictOf: r.syncId,
  });
  const cur = ctx!.game();
  if (keepMine) {
    // Overwrite the server: our content with a revision past its own.
    const g = { ...mine, rev: server.rev + 1 };
    archive.put('ktGames', { ...r, game: g, syncedRev: server.rev });
    if (cur?.syncId === g.syncId) ctx!.syncGame(g, false);
  } else {
    archive.put('ktGames', {
      ...r,
      game: server,
      updatedAt: server.updatedAt,
      syncedRev: server.rev,
    });
    if (cur?.syncId === server.syncId) ctx!.syncGame(server, true);
  }
  inbox('conflict', r.syncId, { copy: copyId });
}

/** Keeps a conflict copy's content as the game (it then syncs), or drops the copy. */
export function resolveKtConflict(copyId: string, keepCopy: boolean) {
  const copy = archive.get('ktGames', copyId);
  if (!copy?.conflictOf) return;
  const main = archive.get('ktGames', copy.conflictOf);
  if (keepCopy && main) {
    const g = { ...copy.game, syncId: main.syncId, id: main.game.id, rev: main.game.rev + 1 };
    archive.put('ktGames', { ...main, game: g, updatedAt: Date.now() });
    if (ctx?.game()?.syncId === g.syncId) ctx.syncGame(g, true);
  }
  archive.del('ktGames', copyId);
  archive.del('inbox', 'kt:conflict:' + copy.conflictOf);
  scheduleKtSync(200);
}

/** Whether anything is waiting to go up (the archive listener only wakes the engine for real work). */
export const hasKtWork = (userId: string) =>
  playersWaiting() ||
  archive.all('outbox').some((o) => o.kind === 'deleteKtGame' && !o.blocked) ||
  pendingKtGames(userId).some((r) => !waitsForPlayers(r));

/** Marks a deleted game for removal on the server (owner or admin). */
export function queueKtDelete(syncId: string) {
  const r = archive.get('ktGames', syncId);
  if (!r?.account || r.syncedRev === undefined) return;
  archive.put('outbox', {
    id: 'ktdel:' + syncId,
    kind: 'deleteKtGame',
    key: syncId,
    attempts: 0,
    nextAt: 0,
    createdAt: Date.now(),
  });
  scheduleKtSync(200);
}

/** Someone else's game (a player page, a board), fetched once and kept for viewing. */
export async function fetchKtGame(id: string): Promise<KtGameRec> {
  const have = archive.get('ktGames', id);
  if (have) return have;
  const r = await ktEp.game(id);
  const g = fromWire(r.game, id);
  const rec: KtGameRec = {
    syncId: id,
    game: g,
    updatedAt: g.updatedAt,
    endedAt: g.status === 'finished' ? (r.summary.finishedAt ?? g.updatedAt) : null,
    origin: 'remote',
    owner: r.summary.owner,
    syncedRev: g.rev,
  };
  archive.put('ktGames', rec);
  return rec;
}
