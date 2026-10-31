import { useEffect } from 'react';

/** Keeps the screen on while `active`; re-acquires when the tab becomes visible again. */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let pending = false;
    let disposed = false;

    const acquire = async () => {
      if (disposed || pending || sentinel || document.visibilityState !== 'visible') return;
      pending = true;
      try {
        const s = await navigator.wakeLock.request('screen');
        if (disposed) {
          await s.release().catch(() => undefined);
          return;
        }
        sentinel = s;
        s.addEventListener('release', () => {
          if (sentinel === s) sentinel = null;
        });
      } catch {
        sentinel = null;
      } finally {
        pending = false;
      }
    };

    void acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', acquire);
      void sentinel?.release().catch(() => undefined);
    };
  }, [active]);
}
