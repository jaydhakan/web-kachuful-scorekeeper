import { useCallback, useSyncExternalStore } from 'react';
import { KEYS, storage } from '@/state/persistence';

/** The platform's "Sounds and vibration" (`baithak.fx`): this device's, for every game but Spades' own sound mode. */
export type SoundLevel = 'all' | 'moments' | 'off';
export interface FxPrefs {
  sounds: SoundLevel;
  vibrate: boolean;
}

/** "Big moments" by default, so a shared phone isn't beeping all night (WOW-MOMENTS-PLAN §9). */
export const DEFAULT_FX: FxPrefs = { sounds: 'moments', vibrate: true };
const LEVELS: readonly string[] = ['all', 'moments', 'off'];

/** Unknown or corrupt values fall back field by field. */
export function readFx(): FxPrefs {
  const raw = storage.get<Record<string, unknown> | null>(KEYS.fx, null);
  const o = raw && typeof raw === 'object' ? raw : {};
  return {
    sounds: LEVELS.includes(o.sounds as string) ? (o.sounds as SoundLevel) : DEFAULT_FX.sounds,
    vibrate: typeof o.vibrate === 'boolean' ? o.vibrate : DEFAULT_FX.vibrate,
  };
}

const subs = new Set<() => void>();
let cache: FxPrefs | null = null;
const snapshot = () => (cache ??= readFx());

export function writeFx(p: Partial<FxPrefs>) {
  const next = { ...snapshot(), ...p };
  storage.set(KEYS.fx, next);
  cache = next;
  subs.forEach((f) => f());
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};

/** Tests reset storage between cases; this forgets the cached copy too. */
export const resetFxForTests = () => {
  cache = null;
};

export function useFxPrefs(): [FxPrefs, (p: Partial<FxPrefs>) => void] {
  const prefs = useSyncExternalStore(subscribe, snapshot, snapshot);
  return [prefs, useCallback((p: Partial<FxPrefs>) => writeFx(p), [])];
}
