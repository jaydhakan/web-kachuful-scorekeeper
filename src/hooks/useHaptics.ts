import { useCallback } from 'react';
import { KEYS, storage } from '@/state/persistence';

/** A buzz in ms, or a pattern of buzz and pause lengths (`[12, 40, 18]`). */
export type Haptic = number | number[];

/**
 * Vibrates on Android Chrome unless the player turned Vibration off (`src/fx/prefs.ts`); navigator.vibrate does not
 * exist on iOS Safari, where this is a no-op. Reduced motion doesn't silence it: vibration isn't motion.
 */
export const vibrate = (p: Haptic = 10): void => {
  try {
    // Read raw, not through fx/prefs, so the first load doesn't carry the settings module.
    if (storage.get<{ vibrate?: unknown } | null>(KEYS.fx, null)?.vibrate === false) return;
    if (typeof navigator.vibrate === 'function') navigator.vibrate(p);
  } catch {
    /* some browsers throw without a user gesture */
  }
};

/** The light tap stores hand to buttons; zero-argument, so it is safe as an event handler. */
export const useHaptics = () => useCallback(() => vibrate(10), []);
