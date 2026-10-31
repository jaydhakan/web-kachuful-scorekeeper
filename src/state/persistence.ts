import { demoGame, type Decks, type Game } from '@/domain';
import { CURRENT_SCHEMA, migrateGame } from './migrations';

export const KEYS = {
  game: 'kachuful.v1',
  lastGroup: 'kachuful.lastGroup',
  recentNames: 'kachuful.recentNames',
  undo: 'kachuful.undo',
  screen: 'kachuful.screen',
  backup: 'kachuful.v1.backup',
} as const;

export type WriteResult = 'ok' | 'quota' | 'unavailable';
export type SavedScreen = 'home' | 'round' | 'winner';

export interface LastGroup {
  names: string[];
  emojis: string[];
  colors: string[];
  direction: 'cw' | 'ccw';
  /** Absent in a group saved before the deck question; that was one deck. */
  decks?: Decks;
}

const mem: Record<string, unknown> = {};

const isQuota = (e: unknown) =>
  e instanceof DOMException &&
  (e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    e.code === 22 ||
    e.code === 1014);

export const storage = {
  getRaw(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem(key);
      if (v != null) return JSON.parse(v) as T;
    } catch {
      /* unreadable: fall through to the in-memory copy */
    }
    return key in mem ? (mem[key] as T) : fallback;
  },
  set(key: string, value: unknown): WriteResult {
    mem[key] = value;
    return storage.setRaw(key, JSON.stringify(value));
  },
  setRaw(key: string, raw: string): WriteResult {
    try {
      localStorage.setItem(key, raw);
      return 'ok';
    } catch (e) {
      return isQuota(e) ? 'quota' : 'unavailable';
    }
  },
  /** Forgets the in-memory fallback copies (used when the browser storage is reset underneath us). */
  clearMemory() {
    for (const k of Object.keys(mem)) delete mem[k];
  },
  remove(key: string) {
    delete mem[key];
    try {
      localStorage.removeItem(key);
    } catch {
      /* nothing to remove */
    }
  },
};

/** Snapshots are kept as JSON strings, exactly as the prototype stored them. */
export const parseSnapshot = (s: string): Game | null => {
  try {
    return migrateGame(JSON.parse(s));
  } catch {
    return null;
  }
};

export function saveGame(game: Game, undo: string[]): WriteResult {
  const stamped = { ...game, schemaVersion: CURRENT_SCHEMA };
  const attempt = (u: string[]): WriteResult => {
    const g = storage.set(KEYS.game, stamped);
    const s = storage.set(KEYS.undo, u);
    return g !== 'ok' ? g : s;
  };
  let res = attempt(undo);
  if (res === 'quota') res = attempt(undo.slice(-5));
  if (res === 'quota') res = attempt([]);
  return res;
}

/** The demo is saved as the game so it can be explored, but its players never become the user's names. */
export function seedFirstRun(): Game {
  const g = demoGame();
  storage.set(KEYS.game, { ...g, schemaVersion: CURRENT_SCHEMA });
  return g;
}

export interface Loaded {
  game: Game;
  screen: SavedScreen;
  undo: string[];
  /** Set when the stored game could not be read; saving stays paused until the user chooses. */
  corrupt: boolean;
}

export function loadInitial(): Loaded {
  const raw = storage.getRaw(KEYS.game);
  const memCopy = KEYS.game in mem ? mem[KEYS.game] : undefined;
  let game: Game | null = null;
  let corrupt = false;
  if (raw != null) {
    try {
      game = migrateGame(JSON.parse(raw));
    } catch {
      game = null;
    }
    if (!game) {
      corrupt = true;
      if (storage.getRaw(KEYS.backup) !== raw) storage.setRaw(KEYS.backup, raw);
    }
  } else if (memCopy !== undefined) {
    game = migrateGame(memCopy);
  }
  if (corrupt) return { game: demoGame(), screen: 'home', undo: [], corrupt };
  if (!game) game = seedFirstRun();

  const savedUndo = storage.get<unknown>(KEYS.undo, []);
  const undo = Array.isArray(savedUndo)
    ? savedUndo.filter((s): s is string => typeof s === 'string')
    : [];
  const s = storage.get<string>(KEYS.screen, 'home');
  return { game, screen: s === 'round' || s === 'winner' ? s : 'home', undo, corrupt };
}

/** 'reset' discards the unreadable save and its backup; 'keep' starts fresh but leaves the backup. */
export function resolveCorrupt(choice: 'reset' | 'keep'): Game {
  if (choice === 'reset') storage.remove(KEYS.backup);
  storage.remove(KEYS.game);
  storage.remove(KEYS.undo);
  return seedFirstRun();
}

export function pushRecentNames(names: string[]) {
  const rn = storage.get<string[]>(KEYS.recentNames, []);
  names.forEach((x) => {
    const k = rn.findIndex((y) => y.toLowerCase() === x.toLowerCase());
    if (k >= 0) rn.splice(k, 1);
    rn.unshift(x);
  });
  storage.set(KEYS.recentNames, rn.slice(0, 20));
}
