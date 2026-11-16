/**
 * Spades table mode's push/pull loop, with Kaali Teeri's semantics (games/kaali-teeri/sync/engine.ts): players first
 * (the shared registry), then games; pulls this account's games into `spGames`; settles stale uploads with a conflict
 * copy. It runs only while signed in, and screens never wait for it: they read the archive, which this keeps current.
 */
import type { SpGame } from '@/games/spades/domain/types';
import { uuid } from '@/lib/ids';
import { archive, type InboxItem, type SpGameRec } from '@/state/archive';
import type { Session } from '@/state/persistence';
import { idOf } from '@/state/registry';
import { ApiError } from '@/sync/api';
import { playersWaiting, pullPlayers, pushPlayers } from '@/sync/players';
import { getSession } from '@/sync/session';
import { setSyncStatus } from '@/sync/status';
import { spDelId, spEndedAt, spPutId } from '../state/archive';
import { spEp } from './endpoints';
import type { SpGameSummary, SpListItem, SpWireGame } from './types';

/** What the engine needs from the app; bound by the table-mode provider. */
export interface SpEngineCtx {
  session(): Session | null;
  /** The game on the table, if any. */
  game(): SpGame | null;
  /** Replaces the current game in place (same game, new content); `fresh` also clears Undo. */
  syncGame(g: SpGame, fresh: boolean): void;
}

let ctx: SpEngineCtx | null = null;
export const bindSpEngine = (c: SpEngineCtx | null) => (ctx = c);

// Me's Sync now runs this with no table open (Kaali Teeri's engine needs its provider): the stored session, no game.
const session = () => (ctx ? ctx.session() : getSession());
const tableGame = () => ctx?.game() ?? null;
const syncGame = (g: SpGame, fresh: boolean) => ctx?.syncGame(g, fresh);

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
export function resetSpEngineForTests() {
  if (timer) clearTimeout(timer);
  [running, again, timer, failures, lastPull, waitUntil] = [null, false, null, 0, 0, 0];
}

/** The game as it is, every seat with its registry id; the server keys it by `syncId`. */
export const toWire = (g: SpGame): SpWireGame => ({
  ...g,
  players: g.players.map((p) => ({ ...p, playerId: idOf(p) })),
});
/** A stored game; `key` is the id the server keeps it under. */
export const fromWire = (w: SpWireGame, key?: string): SpGame => ({
  ...w,
  syncId: w.syncId ?? key ?? w.id,
});

const doneCount = (g: SpGame) => g.hands.filter((h) => h.phase === 'done').length;
const cacheGet = <T>(k: string): T | undefined => archive.get('cache', k)?.value as T | undefined;
const cacheSet = (k: string, value: unknown) =>
  archive.put('cache', { key: k, value, fetchedAt: Date.now() });

/** Games that sync to this account and have changes the server hasn't accepted. */
export const pendingSpGames = (userId: string): SpGameRec[] =>
  archive
    .spGames()
    .filter(
      (r) =>
        r.account === userId &&
        !r.conflictOf &&
        r.game.id !== 'demo' &&
        r.syncedRev !== r.game.rev &&
        !archive.get('outbox', spPutId(r.syncId))?.blocked,
    );

// Ids are prefixed so they never collide with other games'; `game` lets the inbox tell them apart.
const inbox = (kind: InboxItem['kind'], key: string, data: Record<string, unknown>) =>
  archive.put('inbox', {
    id: `sp:${kind}:${key}`,
    kind,
    key,
    data: { ...data, game: 'spades' },
    createdAt: Date.now(),
  });

function report(phase?: 'idle' | 'offline' | 'attention') {
  const s = session();
  if (!s) return setSyncStatus({ phase: 'signedOut', waiting: 0, attention: 0 });
  const attention = archive.all('inbox').length + (s.stale ? 1 : 0);
  setSyncStatus({
    phase: phase ?? (attention ? 'attention' : 'idle'),
    waiting: pendingSpGames(s.user.id).length,
    attention,
  });
}

/** Runs a sync soon (debounced); `ms` is how soon. */
export function scheduleSpSync(ms = 1500) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void syncSpNow(), ms);
}

/** Syncs now; a call while one runs makes it go round once more. */
export function syncSpNow(o: { full?: boolean } = {}): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = run(o.full ?? false).finally(() => {
    running = null;
    if (again) {
      again = false;
      scheduleSpSync(50);
    }
  });
  return running;
}

async function run(full: boolean) {
  const s = session();
  if (!s || s.stale) return report();
  await archive.ready;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return report('offline');
  if (Date.now() < waitUntil) {
    scheduleSpSync(waitUntil - Date.now());
    return report();
  }
  waitUntil = 0;
  setSyncStatus({ phase: 'syncing' });
  try {
    if (full || Date.now() - lastPull > PULL_EVERY) await pullAll(s);
    await pushPlayers(remap);
    await pushDeletes();
    await pushGames(s.user.id);
    failures = 0;
    setSyncStatus({ lastSyncAt: Date.now() });
    report();
    if (pendingSpGames(s.user.id).some((r) => !waitsForPlayers(r))) scheduleSpSync(60e3);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return report('attention');
    if (e instanceof ApiError && e.retryAfter) {
      waitUntil = Date.now() + e.retryAfter * 1000;
      report();
      return scheduleSpSync(e.retryAfter * 1000);
    }
    failures++;
    report(e instanceof ApiError && e.offline ? 'offline' : undefined);
    scheduleSpSync(Math.min(MAX_BACKOFF, 2000 * 2 ** failures));
  }
}

// ——— pull ———

async function pullAll(s: Session) {
  await pullPlayers();
  await pullMyGames(s.user.id);
  await pullMet(s.player?.id);
  lastPull = Date.now();
}

const isGone = (x: SpListItem): x is Extract<SpListItem, { deleted: true }> =>
  'deleted' in x && x.deleted;
const newest = (xs: { updatedAt: number }[]) => Math.max(0, ...xs.map((x) => x.updatedAt));

/**
 * This account's games from other devices, and games others scored with this account's player at the table: new
 * ones are added, ones not changed here take the server's copy, and games deleted on the server leave this device.
 */
async function pullMyGames(me: string) {
  const since = cacheGet<number>('sp:games:since') ?? 0;
  let max = since;
  let cursor: string | null = null;
  do {
    const page = await spEp.games({
      involving: true,
      updatedSince: since ? Math.max(0, since - OVERLAP) : undefined,
      cursor,
    });
    max = Math.max(max, newest(page.items));
    for (const sum of page.items) {
      if (isGone(sum)) dropDeleted(sum.id);
      else await pullSummary(sum, me);
    }
    cursor = page.nextCursor;
  } while (cursor);
  cacheSet('sp:games:since', max);
}

/**
 * One game from its list summary: fetched when this device has no copy or an older one, left alone when this
 * device has changes the server hasn't accepted. Resolves with the copy kept here.
 */
export async function pullSummary(
  sum: SpGameSummary,
  me = session()?.user.id ?? '',
): Promise<SpGameRec | undefined> {
  const rec = archive.get('spGames', sum.id);
  if (rec && rec.syncedRev !== rec.game.rev) return rec;
  if (rec && doneCount(rec.game) === sum.hands && rec.game.status === sum.status) return rec;
  const full = await spEp.game(sum.id);
  const g = fromWire(full.game, sum.id);
  // Someone else's game, sat in: kept for viewing, never synced back from here.
  const mine = !sum.owner.id || sum.owner.id === me;
  const next: SpGameRec = {
    ...rec,
    syncId: sum.id,
    game: g,
    updatedAt: g.updatedAt,
    endedAt: spEndedAt(g),
    origin: rec?.origin ?? 'remote',
    owner: sum.owner,
    account: mine ? me : undefined,
    syncedRev: g.rev,
  };
  archive.put('spGames', next);
  const cur = tableGame();
  if (cur && cur.syncId === g.syncId && cur.rev < g.rev) syncGame(g, true);
  return next;
}

/**
 * Everyone this account's player has sat with at Spades (table mode and online), added to the circle setup suggests
 * from (shared with the other games). The list is newest started first, so later pulls stop a day before the last.
 */
async function pullMet(me: string | undefined) {
  if (!me) return;
  const since = cacheGet<number>('sp:met:since');
  const now = Date.now();
  const met = new Set(cacheGet<string[]>('met') ?? []);
  let cursor: string | null = null;
  do {
    const page = await spEp.playerGames(me, cursor);
    for (const g of page.items) {
      const ids =
        g.kind === 'spades-online'
          ? (g.seats ?? []).map((x) => x?.playerId)
          : (g.players ?? []).map((p) => p.playerId);
      for (const id of ids) if (id && id !== me) met.add(id);
    }
    const older = since !== undefined && page.items.some((g) => g.createdAt < since - DAY);
    cursor = older ? null : page.nextCursor;
  } while (cursor);
  cacheSet('met', [...met]);
  cacheSet('sp:met:since', now);
}

/** A game deleted on the server: gone here too, except the one on the table, which stays on this phone only. */
function dropDeleted(syncId: string) {
  archive.del('outbox', spPutId(syncId));
  const rec = archive.get('spGames', syncId);
  if (!rec) return;
  if (tableGame()?.syncId !== syncId) return archive.del('spGames', syncId);
  archive.put('spGames', { ...rec, account: undefined, syncedRev: undefined });
  inbox('rejected', syncId, { reason: 'deleted' });
}

// ——— push ———

async function pushDeletes() {
  for (const o of archive.all('outbox').filter((x) => x.kind === 'deleteSpGame' && !x.blocked)) {
    try {
      await spEp.deleteGame(o.key);
    } catch (e) {
      if (!(e instanceof ApiError) || (e.status !== 404 && e.status !== 403 && e.status !== 410))
        throw e;
    }
    archive.del('outbox', o.id);
  }
}

/** A game uploads only once every seat is a player the server knows. */
const waitsForPlayers = (r: SpGameRec) =>
  r.game.players.some((p) => {
    const rec = archive.get('players', idOf(p));
    return !rec || rec.local;
  });

async function pushGames(userId: string) {
  for (const r of pendingSpGames(userId)) {
    if (waitsForPlayers(r)) continue;
    try {
      const out = await spEp.putGame(toWire(r.game));
      archive.put('spGames', { ...archive.get('spGames', r.syncId)!, syncedRev: out.rev });
      if (out.remap) remap(out.remap);
      archive.del('outbox', spPutId(r.syncId));
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      if (e.status === 409 && e.code === 'stale')
        settleStale(r, fromWire(e.body.server as SpWireGame, r.syncId));
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

function block(r: SpGameRec, why: string) {
  archive.put('outbox', {
    id: spPutId(r.syncId),
    kind: 'putSpGame',
    key: r.syncId,
    attempts: 1,
    nextAt: 0,
    createdAt: Date.now(),
    blocked: why,
  });
}

/** Rewrites player ids the server merged, in the archive and the current game. */
function remap(map: Record<string, string>) {
  const hit = (g: SpGame) => g.players.some((p) => p.playerId && map[p.playerId]);
  const fix = (g: SpGame): SpGame => ({
    ...g,
    players: g.players.map((p) =>
      p.playerId && map[p.playerId] ? { ...p, playerId: map[p.playerId] } : p,
    ),
  });
  for (const r of archive.spGames())
    if (hit(r.game)) archive.put('spGames', { ...r, game: fix(r.game) });
  const cur = tableGame();
  if (cur && hit(cur)) syncGame(fix(cur), false);
}

/**
 * Two devices changed the same game. The copy with more done hands wins (on a tie, the newer); the other is kept as
 * a conflict copy so nothing is lost, and the inbox says so.
 */
export function settleStale(r: SpGameRec, server: SpGame) {
  const mine = r.game;
  const [a, b] = [doneCount(mine), doneCount(server)];
  const keepMine = a > b || (a === b && mine.updatedAt > server.updatedAt);
  const loser = keepMine ? server : mine;
  const copyId = uuid();
  archive.put('spGames', {
    syncId: copyId,
    game: { ...loser, syncId: copyId, id: loser.id + '-copy' },
    updatedAt: loser.updatedAt,
    endedAt: spEndedAt(loser),
    origin: 'local',
    conflictOf: r.syncId,
  });
  const cur = tableGame();
  if (keepMine) {
    // Overwrite the server: our content with a revision past its own.
    const g = { ...mine, rev: server.rev + 1 };
    archive.put('spGames', { ...r, game: g, syncedRev: server.rev });
    if (cur?.syncId === g.syncId) syncGame(g, false);
  } else {
    archive.put('spGames', {
      ...r,
      game: server,
      updatedAt: server.updatedAt,
      endedAt: spEndedAt(server),
      syncedRev: server.rev,
    });
    if (cur?.syncId === server.syncId) syncGame(server, true);
  }
  inbox('conflict', r.syncId, { copy: copyId });
}

/** Keeps a conflict copy's content as the game (it then syncs), or drops the copy. */
export function resolveSpConflict(copyId: string, keepCopy: boolean) {
  const copy = archive.get('spGames', copyId);
  if (!copy?.conflictOf) return;
  const main = archive.get('spGames', copy.conflictOf);
  if (keepCopy && main) {
    const g = { ...copy.game, syncId: main.syncId, id: main.game.id, rev: main.game.rev + 1 };
    archive.put('spGames', { ...main, game: g, updatedAt: Date.now(), endedAt: spEndedAt(g) });
    if (tableGame()?.syncId === g.syncId) syncGame(g, true);
  }
  archive.del('spGames', copyId);
  archive.del('inbox', 'sp:conflict:' + copy.conflictOf);
  scheduleSpSync(200);
}

/** Whether anything is waiting to go up (the archive listener only wakes the engine for real work). */
export const hasSpWork = (userId: string) =>
  playersWaiting() ||
  archive.all('outbox').some((o) => o.kind === 'deleteSpGame' && !o.blocked) ||
  pendingSpGames(userId).some((r) => !waitsForPlayers(r));

/** Marks a deleted game for removal on the server (owner or admin). */
export function queueSpDelete(syncId: string) {
  const r = archive.get('spGames', syncId);
  if (!r?.account || r.syncedRev === undefined) return;
  archive.put('outbox', {
    id: spDelId(syncId),
    kind: 'deleteSpGame',
    key: syncId,
    attempts: 0,
    nextAt: 0,
    createdAt: Date.now(),
  });
  scheduleSpSync(200);
}

/** Someone else's game (a player page, a board), fetched once and kept for viewing. */
export async function fetchSpGame(id: string): Promise<SpGameRec> {
  const have = archive.get('spGames', id);
  if (have) return have;
  const r = await spEp.game(id);
  const g = fromWire(r.game, id);
  const rec: SpGameRec = {
    syncId: id,
    game: g,
    updatedAt: g.updatedAt,
    endedAt: spEndedAt(g),
    origin: 'remote',
    owner: r.summary.owner,
    syncedRev: g.rev,
  };
  archive.put('spGames', rec);
  return rec;
}
