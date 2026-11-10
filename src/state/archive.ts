import { doneRounds, type Game } from '@/games/kachuful/domain';
import type { KtGame } from '@/games/kaali-teeri/domain';
import type { IshaaraPublic } from '@/games/ishaara/domain/types';

/**
 * Everything this device keeps beyond the current game: finished games, the player registry, the sync outbox,
 * cached server answers and items that need a person. The only IndexedDB access in the app, as persistence.ts is
 * the only localStorage access. Reads are synchronous from memory (loaded once at start); writes go to memory at
 * once and to IndexedDB in the background, so screens never wait on the database.
 */

/** One game in a game's store; `G` is that game's saved shape. */
export interface GameRecOf<G> {
  syncId: string;
  game: G;
  updatedAt: number;
  /** When it ended (finished or ended early); null while it can still be played. */
  endedAt: number | null;
  /** Scored on this device, or pulled from the server. */
  origin: 'local' | 'remote';
  /** Server facts about a remote game. */
  owner?: { id: string | null; name: string } | null;
  /** A conflict copy keeps the sync id of the game it lost to. */
  conflictOf?: string;
  /** Server achievement rows this game earned (for badges on other devices). */
  earned?: unknown[];
  /** The last revision the server accepted; equal to game.rev when synced. */
  syncedRev?: number;
  /** The account this game syncs to: set for games scored signed in, or added at import. */
  account?: string;
  deleted?: boolean;
}

export type GameRec = GameRecOf<Game>;
export type KtGameRec = GameRecOf<KtGame>;

/** A finished Ishaara game, read-only: the server ran it, so this copy is only for reading History offline. */
export interface IshaaraGameRec {
  /** The game's id. */
  syncId: string;
  game: IshaaraPublic;
  updatedAt: number;
  endedAt: number;
  hostName?: string | null;
}

export interface PlayerRec {
  id: string;
  displayName: string;
  nameKey: string;
  /** Who the person is (unique); only known for players this account may see it for. */
  email?: string | null;
  /** The server's photo for this player (versioned, cached forever); none means the emoji. */
  photoUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  emoji: string;
  color: string;
  createdAt: number;
  updatedAt: number;
  /** Made on this device and not (yet) on the server. */
  local: boolean;
  createdBy?: string | null;
  createdByName?: string | null;
  linkedUserId?: string | null;
  mergedInto?: string | null;
  /** Other names this person plays under (server aliases); found by any of them. */
  aliases?: string[];
  /** Made signed in (or chosen at import): to be created on the server. */
  pendingCreate?: boolean;
  /** Server counts, when known. */
  games?: number;
  lastPlayedAt?: number | null;
}

export type OutboxKind =
  | 'putGame'
  | 'createPlayer'
  | 'patchPlayer'
  | 'deleteGame'
  // Kaali Teeri's own, so Kachuful's engine never sends them to /api/games.
  | 'putKtGame'
  | 'deleteKtGame';

export interface OutboxItem {
  id: string;
  kind: OutboxKind;
  /** The game's sync id or the player's id. */
  key: string;
  body?: unknown;
  attempts: number;
  nextAt: number;
  createdAt: number;
  /** Set when the server refused it for good; it then waits for a person. */
  blocked?: string;
}

export interface CacheRec {
  key: string;
  value: unknown;
  etag?: string | null;
  fetchedAt: number;
}

export type InboxKind = 'nameMatch' | 'conflict' | 'rejected';

export interface InboxItem {
  id: string;
  kind: InboxKind;
  createdAt: number;
  /** The game or player it is about. */
  key: string;
  data: Record<string, unknown>;
}

interface Stores {
  games: GameRec;
  players: PlayerRec;
  outbox: OutboxItem;
  cache: CacheRec;
  inbox: InboxItem;
  ktGames: KtGameRec;
  ishaaraGames: IshaaraGameRec;
}
type StoreName = keyof Stores;

const KEY_PATH: { [K in StoreName]: keyof Stores[K] & string } = {
  games: 'syncId',
  players: 'id',
  outbox: 'id',
  cache: 'key',
  inbox: 'id',
  ktGames: 'syncId',
  ishaaraGames: 'syncId',
};
const STORES = Object.keys(KEY_PATH) as StoreName[];

/** Where the records live between sessions. */
export interface Backend {
  load(): Promise<{ [K in StoreName]: Stores[K][] }>;
  put<K extends StoreName>(store: K, rows: Stores[K][]): Promise<void>;
  del(store: StoreName, keys: string[]): Promise<void>;
  clear(stores: StoreName[]): Promise<void>;
}

/** Nothing outlives the page: tests, and browsers without IndexedDB (or with it blocked). */
export const memoryBackend = (): Backend => ({
  load: async () => ({
    games: [],
    players: [],
    outbox: [],
    cache: [],
    inbox: [],
    ktGames: [],
    ishaaraGames: [],
  }),
  put: async () => {},
  del: async () => {},
  clear: async () => {},
});

const DB = 'kachuful';
/** 2 added `ktGames`, 3 `ishaaraGames`. Bump it with every new store; existing stores and rows are never touched. */
export const DB_VERSION = 3;
/** Every game's store, each listed by when it ended and when it changed. */
const GAME_STORES: readonly StoreName[] = ['games', 'ktGames', 'ishaaraGames'];

/** What an upgrade needs of the database, so it can be tested without a browser. */
export interface UpgradeDb {
  objectStoreNames: { contains(name: string): boolean };
  createObjectStore(
    name: string,
    o: { keyPath: string },
  ): { createIndex(name: string, keyPath: string): unknown };
}

/** Creates whatever stores are missing; a database at any older version keeps its stores and rows. */
export function upgradeDb(d: UpgradeDb) {
  for (const s of STORES) {
    if (d.objectStoreNames.contains(s)) continue;
    const os = d.createObjectStore(s, { keyPath: KEY_PATH[s] });
    if (GAME_STORES.includes(s)) {
      os.createIndex('endedAt', 'endedAt');
      os.createIndex('updatedAt', 'updatedAt');
    }
  }
}
const req = <T>(r: IDBRequest<T>) =>
  new Promise<T>((ok, no) => {
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
const done = (tx: IDBTransaction) =>
  new Promise<void>((ok, no) => {
    tx.oncomplete = () => ok();
    tx.onerror = tx.onabort = () => no(tx.error);
  });

export function idbBackend(idb: IDBFactory): Backend {
  let dbp: Promise<IDBDatabase> | null = null;
  const db = () =>
    (dbp ??= new Promise((ok, no) => {
      const r = idb.open(DB, DB_VERSION);
      r.onupgradeneeded = () => upgradeDb(r.result);
      r.onsuccess = () => ok(r.result);
      r.onerror = () => no(r.error);
      r.onblocked = () => no(new Error('blocked'));
    }));
  return {
    async load() {
      const d = await db();
      const tx = d.transaction(STORES, 'readonly');
      const out = await Promise.all(STORES.map((s) => req(tx.objectStore(s).getAll())));
      return Object.fromEntries(STORES.map((s, i) => [s, out[i]])) as {
        [K in StoreName]: Stores[K][];
      };
    },
    async put(store, rows) {
      const tx = (await db()).transaction(store, 'readwrite');
      rows.forEach((r) => tx.objectStore(store).put(r));
      await done(tx);
    },
    async del(store, keys) {
      const tx = (await db()).transaction(store, 'readwrite');
      keys.forEach((k) => tx.objectStore(store).delete(k));
      await done(tx);
    },
    async clear(stores) {
      const tx = (await db()).transaction(stores, 'readwrite');
      stores.forEach((s) => tx.objectStore(s).clear());
      await done(tx);
    },
  };
}

type Listener = () => void;
export type WriteError = 'quota' | 'unavailable';

export class Archive {
  private data: { [K in StoreName]: Map<string, Stores[K]> } = {
    games: new Map(),
    players: new Map(),
    outbox: new Map(),
    cache: new Map(),
    inbox: new Map(),
    ktGames: new Map(),
    ishaaraGames: new Map(),
  };
  private listeners = new Set<Listener>();
  private errorListeners = new Set<(e: WriteError) => void>();
  /** Goes up on every change; screens memoise derived data on it. */
  version = 0;
  loaded = false;
  /** The last write or load failure, for screens that mount after it was announced. */
  lastError: WriteError | null = null;
  readonly ready: Promise<void>;

  constructor(private backend: Backend) {
    this.ready = backend
      .load()
      .then((all) => {
        for (const s of STORES)
          for (const row of all[s] as Stores[typeof s][])
            // A write made before loading finished is newer than what was on disk.
            if (!this.data[s].has(this.keyOf(s, row)))
              (this.data[s] as Map<string, unknown>).set(this.keyOf(s, row), row);
      })
      .catch(() => {
        this.backend = memoryBackend();
        this.fail('unavailable');
      })
      .finally(() => {
        this.loaded = true;
        this.bump();
      });
  }

  private keyOf<K extends StoreName>(s: K, row: Stores[K]): string {
    return String(row[KEY_PATH[s]]);
  }

  subscribe = (f: Listener) => {
    this.listeners.add(f);
    return () => void this.listeners.delete(f);
  };
  onError(f: (e: WriteError) => void) {
    this.errorListeners.add(f);
    return () => void this.errorListeners.delete(f);
  }
  getVersion = () => this.version;

  private bump() {
    this.version++;
    this.listeners.forEach((f) => f());
  }
  private fail(e: WriteError) {
    this.lastError = e;
    this.errorListeners.forEach((f) => f(e));
  }
  private pending = new Set<Promise<void>>();
  private persist(p: Promise<void>) {
    const done = p
      .catch((e: unknown) =>
        this.fail(
          e instanceof DOMException && e.name === 'QuotaExceededError' ? 'quota' : 'unavailable',
        ),
      )
      .finally(() => this.pending.delete(done));
    this.pending.add(done);
  }
  /** Resolves once every write made so far has reached the disk; a reload right after a clear needs it. */
  flush = async () => {
    await Promise.all(this.pending);
  };

  all<K extends StoreName>(s: K): Stores[K][] {
    return [...this.data[s].values()] as Stores[K][];
  }
  get<K extends StoreName>(s: K, key: string): Stores[K] | undefined {
    return this.data[s].get(key) as Stores[K] | undefined;
  }
  put<K extends StoreName>(s: K, ...rows: Stores[K][]) {
    if (!rows.length) return;
    rows.forEach((r) => (this.data[s] as Map<string, Stores[K]>).set(this.keyOf(s, r), r));
    this.persist(this.backend.put(s, rows));
    this.bump();
  }
  del(s: StoreName, ...keys: string[]) {
    const hit = keys.filter((k) => this.data[s].delete(k));
    if (!hit.length) return;
    this.persist(this.backend.del(s, hit));
    this.bump();
  }
  clear(...stores: StoreName[]) {
    stores.forEach((s) => this.data[s].clear());
    this.persist(this.backend.clear(stores));
    this.bump();
  }

  /** Every Kachuful game this device knows, newest first, without deleted ones. */
  games(): GameRec[] {
    return this.listed('games');
  }
  /** Every Kaali Teeri game this device knows, newest first, without deleted ones. */
  ktGames(): KtGameRec[] {
    return this.listed('ktGames');
  }
  /** Finished Ishaara games kept for History offline, newest first. */
  ishaaraGames(): IshaaraGameRec[] {
    return this.all('ishaaraGames').sort((a, b) => b.endedAt - a.endedAt);
  }
  private listed<K extends 'games' | 'ktGames'>(s: K): Stores[K][] {
    return this.all(s)
      .filter((r) => !r.deleted)
      .sort((a, b) => (b.endedAt ?? b.updatedAt) - (a.endedAt ?? a.updatedAt));
  }
}

const canIdb = () => {
  try {
    return typeof indexedDB !== 'undefined' && !!indexedDB;
  } catch {
    return false;
  }
};

/** The app's one archive. Tests get a memory one, reset per test. */
export let archive = new Archive(canIdb() ? idbBackend(indexedDB) : memoryBackend());

export function resetArchive(backend: Backend = memoryBackend()): Archive {
  archive = new Archive(backend);
  return archive;
}

/** When a game ended, from the fields the app writes (older games fall back to updatedAt). */
export const endedAtOf = (g: Game): number | null =>
  g.status === 'finished' ? (g.finishedAt ?? g.updatedAt) : null;

/** Copies a game this device scored into the archive; the demo and games with no round done are not kept. */
export function archiveGame(g: Game, rec: Partial<GameRec> = {}) {
  if (g.id === 'demo' || !doneRounds(g).length) return;
  const prev = archive.get('games', g.syncId);
  if (prev && prev.game.rev === g.rev && prev.game.updatedAt === g.updatedAt && !rec.deleted)
    return;
  archive.put('games', {
    ...prev,
    origin: prev?.origin ?? 'local',
    ...rec,
    syncId: g.syncId,
    game: g,
    updatedAt: g.updatedAt,
    endedAt: endedAtOf(g),
  });
}

/**
 * A game with no round done leaves no trace: its archive copy goes, and a copy the server has is deleted there
 * through the outbox. True when the server had it, so its id can't be used again.
 */
export function forgetEmpty(syncId: string): boolean {
  const r = archive.get('games', syncId);
  if (!r || r.deleted) return false;
  const onServer = !!r.account && r.syncedRev !== undefined;
  archive.del('outbox', 'put:' + syncId);
  if (!onServer) {
    archive.del('games', syncId);
    return false;
  }
  archive.put('games', { ...r, deleted: true, updatedAt: Date.now() });
  archive.put('outbox', {
    id: 'del:' + syncId,
    kind: 'deleteGame',
    key: syncId,
    attempts: 0,
    nextAt: 0,
    createdAt: Date.now(),
  });
  return true;
}

const SWEPT = 'sweep:empty';

/** Once per device: games kept before that rule (a bid was enough then) leave too. Unreadable ones stay. */
export function sweepEmpty(current: string) {
  if (archive.get('cache', SWEPT)) return;
  for (const r of archive.all('games'))
    if (r.syncId !== current && Array.isArray(r.game?.rounds) && !doneRounds(r.game).length)
      forgetEmpty(r.syncId);
  archive.put('cache', { key: SWEPT, value: true, fetchedAt: Date.now() });
}

/** Scored on this device or by this account; anything else is someone else's game, kept to view. */
export const scoredHere = (r: GameRec, userId: string | null) =>
  r.origin === 'local' || !r.owner?.id || r.owner.id === userId || r.account === userId;

/** History lists what this person scored or sat at; games opened from someone's page only stay cached. */
export const inHistory = (r: GameRec, user: { id: string; playerId: string | null } | null) =>
  !user ||
  scoredHere(r, user.id) ||
  (!!user.playerId && r.game.players.some((p) => p.playerId === user.playerId));

/** Kaali Teeri's archive copy, kept by the same rule: the demo and games with no hand done are not kept. */
export function archiveKtGame(g: KtGame, rec: Partial<KtGameRec> = {}) {
  if (g.id === 'demo' || !g.hands.some((h) => h.phase === 'done')) return;
  const prev = archive.get('ktGames', g.syncId);
  if (prev && prev.game.rev === g.rev && prev.game.updatedAt === g.updatedAt && !rec.deleted)
    return;
  archive.put('ktGames', {
    ...prev,
    origin: prev?.origin ?? 'local',
    ...rec,
    syncId: g.syncId,
    game: g,
    updatedAt: g.updatedAt,
    endedAt: g.status === 'finished' ? (g.finishedAt ?? g.updatedAt) : null,
  });
}

/**
 * A Kaali Teeri game undone back to no hand done leaves no trace, as forgetEmpty: a copy the server has is deleted
 * there through the outbox. True when the server had it, so its id can't be used again.
 */
export function forgetEmptyKt(syncId: string): boolean {
  const r = archive.get('ktGames', syncId);
  if (!r || r.deleted) return false;
  const onServer = !!r.account && r.syncedRev !== undefined;
  archive.del('outbox', 'ktput:' + syncId);
  if (!onServer) {
    archive.del('ktGames', syncId);
    return false;
  }
  archive.put('ktGames', { ...r, deleted: true, updatedAt: Date.now() });
  archive.put('outbox', {
    id: 'ktdel:' + syncId,
    kind: 'deleteKtGame',
    key: syncId,
    attempts: 0,
    nextAt: 0,
    createdAt: Date.now(),
  });
  return true;
}

/** Keeps a finished Ishaara game for History offline; an unfinished one is never stored (its state is live). */
export function archiveIshaaraGame(g: IshaaraPublic, hostName?: string | null) {
  if (g.status !== 'finished' || !g.solution) return;
  const prev = archive.get('ishaaraGames', g.id);
  if (prev && prev.game.rev === g.rev && (hostName === undefined || prev.hostName === hostName))
    return;
  archive.put('ishaaraGames', {
    syncId: g.id,
    game: g,
    updatedAt: g.updatedAt,
    endedAt: g.finishedAt ?? g.updatedAt,
    hostName: hostName ?? prev?.hostName ?? null,
  });
}
