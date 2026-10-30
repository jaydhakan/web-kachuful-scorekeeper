import { useCallback } from 'react';

/** Vibrates on Android Chrome; navigator.vibrate does not exist on iOS Safari, where this is a no-op. */
export const vibrate = (ms = 10): void => {
  try {
    if (typeof navigator.vibrate === 'function') navigator.vibrate(ms);
  } catch {
    /* some browsers throw without a user gesture */
  }
};

export const useHaptics = () => useCallback(() => vibrate(10), []);
