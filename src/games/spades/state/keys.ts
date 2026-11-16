import { KEYS } from '@/state/persistence';

/** Spades' storage keys (the names live in `KEYS`, so persistence.ts stays the one list of what is stored). */
export const SP_KEYS = {
  game: KEYS.spGame,
  undo: KEYS.spUndo,
  screen: KEYS.spScreen,
  lastGroup: KEYS.spLastGroup,
  backup: KEYS.spBackup,
  prefs: KEYS.spPrefs,
  lastSetup: KEYS.spLastSetup,
} as const;
