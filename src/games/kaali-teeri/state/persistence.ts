import type { CountedBy, KtGame } from '@/games/kaali-teeri/domain';
import { KEYS, storage, type WriteResult } from '@/state/persistence';
import { CURRENT_SCHEMA, migrateKtGame } from './migrations';
import { DEFAULT_PREFS, type KtLastGroup, type KtPrefs, type KtSavedScreen } from './types';

/** Kaali Teeri's saved data, all through persistence.ts's `storage` (the only localStorage access). */

export const parseKtSnapshot = (s: string): KtGame | null => {
  try {
    return migrateKtGame(JSON.parse(s));
  } catch {
    return null;
  }
};

/** Writes the game and its undo ring; a full disk drops the oldest snapshots first. No game clears both. */
export function saveKt(game: KtGame | null, undo: string[]): WriteResult {
  if (!game) {
    storage.remove(KEYS.ktGame);
    storage.remove(KEYS.ktUndo);
    return 'ok';
  }
  const stamped = { ...game, schemaVersion: CURRENT_SCHEMA };
  const attempt = (u: string[]): WriteResult => {
    const g = storage.set(KEYS.ktGame, stamped);
    const s = storage.set(KEYS.ktUndo, u);
    return g !== 'ok' ? g : s;
  };
  let res = attempt(undo);
  if (res === 'quota') res = attempt(undo.slice(-5));
  if (res === 'quota') res = attempt([]);
  return res;
}

export const saveKtScreen = (screen: KtSavedScreen) => storage.set(KEYS.ktScreen, screen);

const isCountedBy = (v: unknown): v is CountedBy => v === 'defenders' || v === 'bidders';

export function loadKtPrefs(): KtPrefs {
  const p = storage.get<Partial<KtPrefs> | null>(KEYS.ktPrefs, null);
  if (!p || typeof p !== 'object') return DEFAULT_PREFS;
  return {
    quick: typeof p.quick === 'boolean' ? p.quick : DEFAULT_PREFS.quick,
    countedBy: isCountedBy(p.countedBy) ? p.countedBy : DEFAULT_PREFS.countedBy,
  };
}
export const saveKtPrefs = (p: KtPrefs) => storage.set(KEYS.ktPrefs, p);

export function loadKtLastGroup(): KtLastGroup | null {
  const lg = storage.get<KtLastGroup | null>(KEYS.ktLastGroup, null);
  return lg &&
    typeof lg === 'object' &&
    Array.isArray(lg.players) &&
    lg.players.every((p) => p && typeof p.name === 'string') &&
    (lg.direction === 'cw' || lg.direction === 'ccw')
    ? lg
    : null;
}
export const saveKtLastGroup = (lg: KtLastGroup) => storage.set(KEYS.ktLastGroup, lg);

export interface KtLoaded {
  game: KtGame | null;
  screen: KtSavedScreen;
  undo: string[];
  prefs: KtPrefs;
  /** The saved game could not be read; it is backed up and saving waits for the player's choice. */
  corrupt: boolean;
}

export function loadKt(): KtLoaded {
  const prefs = loadKtPrefs();
  const raw = storage.getRaw(KEYS.ktGame);
  let game: KtGame | null = null;
  if (raw != null) {
    try {
      game = migrateKtGame(JSON.parse(raw));
    } catch {
      game = null;
    }
    if (!game) {
      if (storage.getRaw(KEYS.ktBackup) !== raw) storage.setRaw(KEYS.ktBackup, raw);
      return { game: null, screen: 'home', undo: [], prefs, corrupt: true };
    }
  } else game = migrateKtGame(storage.get<unknown>(KEYS.ktGame, null));
  const saved = storage.get<unknown>(KEYS.ktUndo, []);
  const undo = Array.isArray(saved) ? saved.filter((s): s is string => typeof s === 'string') : [];
  // A finished game reopens on home (its card leads to the result), never on the podium.
  const screen =
    storage.get<string>(KEYS.ktScreen, 'home') === 'game' && game?.status === 'active'
      ? 'game'
      : 'home';
  return { game, screen, undo: game ? undo : [], prefs, corrupt: false };
}

/** 'reset' discards the unreadable save and its backup; 'keep' clears the table but leaves the backup. */
export function resolveKtCorrupt(choice: 'reset' | 'keep') {
  if (choice === 'reset') storage.remove(KEYS.ktBackup);
  storage.remove(KEYS.ktGame);
  storage.remove(KEYS.ktUndo);
}
