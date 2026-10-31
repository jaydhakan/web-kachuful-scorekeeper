import type { Game } from '@/domain';

/**
 * Everything this device keeps beyond the current game: finished games, the player registry, the sync outbox,
 * cached server answers and items that need a person. The only IndexedDB access in the app, as persistence.ts is
 * the only localStorage access. Reads are synchronous from memory (loaded once at start); writes go to memory at
 * once and to IndexedDB in the background, so screens never wait on the database.
 */

export interface GameRec {
  syncId: string;
  game: Game;
  updatedAt: number;
  /** When it ended (finished or ended early); null while it can still be played. */
  endedAt: number | null;
  /** Scored on this device, or pulled from the server. */
  origin: 'local' | 'remote';
  /** Server facts about a remote game. */
  owner?: { id: string; name: string } | null;
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

export interface PlayerRec {
  id: string;
  displayName: string;
  nameKey: string;
  /** Who the person is (unique); only known for players this account may see it for. */
  email?: string | null;
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
  /** Made signed in (or chosen at import): to be created on the server. */
  pendingCreate?: boolean;
  /** Server counts, when known. */
  games?: number;
  lastPlayedAt?: number | null;
}

export type OutboxKind = 'putGame' | 'createPlayer' | 'patchPlayer' | 'deleteGame';

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
}
type StoreName = keyof Stores;

const KEY_PATH: { [K in StoreName]: keyof Stores[K] & string } = {
  games: 'syncId',
  players: 'id',
  outbox: 'id',
  cache: 'key',
  inbox: 'id',
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
  load: async () => ({ games: [], players: [], outbox: [], cache: [], inbox: [] }),
  put: async () => {},
  del: async () => {},
  clear: async () => {},
});

const DB = 'kachuful';
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
      const r = idb.open(DB, 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        for (const s of STORES) {
          if (d.objectStoreNames.contains(s)) continue;
          const os = d.createObjectStore(s, { keyPath: KEY_PATH[s] });
          if (s === 'games') {
            os.createIndex('endedAt', 'endedAt');
            os.createIndex('updatedAt', 'updatedAt');
          }
        }
      };
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
  };
  private listeners = new Set<Listener>();
  private errorListeners = new Set<(e: WriteError) => void>();
  /** Goes up on every change; screens memoise derived data on it. */
  version = 0;
  loaded = false;
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
    this.errorListeners.forEach((f) => f(e));
  }
  private persist(p: Promise<void>) {
    p.catch((e: unknown) =>
      this.fail(
        e instanceof DOMException && e.name === 'QuotaExceededError' ? 'quota' : 'unavailable',
      ),
    );
  }

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

  /** Every game this device knows, newest first, without deleted ones. */
  games(): GameRec[] {
    return this.all('games')
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

/** Copies a game this device scored into the archive; the demo and untouched games are not kept. */
export function archiveGame(g: Game, rec: Partial<GameRec> = {}) {
  if (g.id === 'demo' || !g.rounds.some((r) => Object.keys(r.bids).length > 0)) return;
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
