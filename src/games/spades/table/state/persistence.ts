import { rulesOk } from '@/games/spades/domain/validate';
import type { SpGame } from '@/games/spades/domain/types';
import { storage, type WriteResult } from '@/state/persistence';
import { SP_KEYS } from '@/games/spades/state/keys';
import { CURRENT_SCHEMA, migrateSpGame } from './migrations';
import type { SpLastGroup, SpSavedScreen } from './types';

/** The scorekeeper's saved data, all through persistence.ts's `storage` (the only localStorage access). */

export const parseSpSnapshot = (s: string): SpGame | null => {
  try {
    return migrateSpGame(JSON.parse(s));
  } catch {
    return null;
  }
};

/** Writes the game and its undo ring; a full disk drops the oldest snapshots first. No game clears both. */
export function saveSp(game: SpGame | null, undo: string[]): WriteResult {
  if (!game) {
    storage.remove(SP_KEYS.game);
    storage.remove(SP_KEYS.undo);
    return 'ok';
  }
  const stamped = { ...game, schemaVersion: CURRENT_SCHEMA };
  const attempt = (u: string[]): WriteResult => {
    const g = storage.set(SP_KEYS.game, stamped);
    const s = storage.set(SP_KEYS.undo, u);
    return g !== 'ok' ? g : s;
  };
  let res = attempt(undo);
  if (res === 'quota') res = attempt(undo.slice(-5));
  if (res === 'quota') res = attempt([]);
  return res;
}

export const saveSpScreen = (screen: SpSavedScreen) => storage.set(SP_KEYS.screen, screen);

export function loadSpLastGroup(): SpLastGroup | null {
  const lg = storage.get<SpLastGroup | null>(SP_KEYS.lastGroup, null);
  return lg &&
    typeof lg === 'object' &&
    Array.isArray(lg.players) &&
    lg.players.length === 4 &&
    lg.players.every((p) => p && typeof p.name === 'string') &&
    (lg.direction === 'cw' || lg.direction === 'ccw') &&
    rulesOk(lg.rules)
    ? lg
    : null;
}
export const saveSpLastGroup = (lg: SpLastGroup) => storage.set(SP_KEYS.lastGroup, lg);

export interface SpLoaded {
  game: SpGame | null;
  screen: SpSavedScreen;
  undo: string[];
  /** The saved game could not be read; it is backed up and saving waits for the player's choice. */
  corrupt: boolean;
}

export function loadSp(): SpLoaded {
  const raw = storage.getRaw(SP_KEYS.game);
  let game: SpGame | null = null;
  if (raw != null) {
    try {
      game = migrateSpGame(JSON.parse(raw));
    } catch {
      game = null;
    }
    if (!game) {
      if (storage.getRaw(SP_KEYS.backup) !== raw) storage.setRaw(SP_KEYS.backup, raw);
      return { game: null, screen: 'setup', undo: [], corrupt: true };
    }
  }
  const saved = storage.get<unknown>(SP_KEYS.undo, []);
  const undo = Array.isArray(saved) ? saved.filter((s): s is string => typeof s === 'string') : [];
  // Only a game in progress reopens; a finished or cancelled one leaves a new setup.
  const screen = game?.status === 'active' ? 'game' : 'setup';
  return { game, screen, undo: game ? undo : [], corrupt: false };
}

/** 'reset' discards the unreadable save and its backup; 'keep' clears the table but leaves the backup. */
export function resolveSpCorrupt(choice: 'reset' | 'keep') {
  if (choice === 'reset') storage.remove(SP_KEYS.backup);
  storage.remove(SP_KEYS.game);
  storage.remove(SP_KEYS.undo);
}
