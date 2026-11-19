import { useCallback, useSyncExternalStore } from 'react';
import { storage } from '@/state/persistence';
import { SP_KEYS } from '@/games/spades/state/keys';
import type { SoundMode } from '@/games/spades/sound/sfx';

/** This device's Spades preferences (`spades.prefs`): how the hand is sorted, which sounds play, and the one-card shortcut. */
export interface SpPrefs {
  sort: 'up' | 'down';
  sounds: SoundMode;
  /** Play the only legal card after a few seconds, if nothing else was tapped. */
  autoSingle: boolean;
}

export const DEFAULT_PREFS: SpPrefs = { sort: 'up', sounds: 'all', autoSingle: false };

const SORTS: readonly string[] = ['up', 'down'];
const SOUNDS: readonly string[] = ['all', 'mine', 'off'];

/** Unknown or corrupt values fall back field by field; keys another screen added are kept on write. */
export function readPrefs(): SpPrefs {
  const raw = storage.get<Record<string, unknown> | null>(SP_KEYS.prefs, null);
  const o = raw && typeof raw === 'object' ? raw : {};
  return {
    sort: SORTS.includes(o.sort as string) ? (o.sort as SpPrefs['sort']) : DEFAULT_PREFS.sort,
    sounds: SOUNDS.includes(o.sounds as string) ? (o.sounds as SoundMode) : DEFAULT_PREFS.sounds,
    autoSingle: typeof o.autoSingle === 'boolean' ? o.autoSingle : DEFAULT_PREFS.autoSingle,
  };
}

const subs = new Set<() => void>();
let cache: SpPrefs | null = null;
const snapshot = () => (cache ??= readPrefs());

export function writePrefs(p: Partial<SpPrefs>) {
  const raw = storage.get<Record<string, unknown> | null>(SP_KEYS.prefs, null);
  const next = { ...snapshot(), ...p };
  storage.set(SP_KEYS.prefs, { ...(raw && typeof raw === 'object' ? raw : {}), ...next });
  cache = next;
  subs.forEach((f) => f());
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};

/** Tests reset storage between cases; this forgets the cached copy too. */
export const resetPrefsForTests = () => {
  cache = null;
};

export function usePrefs(): [SpPrefs, (p: Partial<SpPrefs>) => void] {
  const prefs = useSyncExternalStore(subscribe, snapshot, snapshot);
  return [prefs, useCallback((p: Partial<SpPrefs>) => writePrefs(p), [])];
}
