import { useEffect, useState } from 'react';
import { useApp } from '@/state/store';
import { whenIdle } from '@/lib/idle';
import { t } from '@/strings';

// Five minutes: a theme change is not urgent, and an unchanged setting costs a 304 (backend-requests.md, request 1).
const EVERY = 5 * 60_000;
// The boot script has already painted the cached theme, so the store can arrive once the page is idle.
const loadStore = () => import('@/state/theme');
const loadPrefs = () => import('@/sync/prefs');

/**
 * Keeps the theme current: applies the device's resolution once the page is idle and, signed in, reads the admin's
 * setting then, when the app comes back to the front and every five minutes; the account's own preferences are read
 * at idle and on coming back. Announces each change to assistive tech. Signed out it never touches the network.
 */
export function ThemeSync() {
  const { state } = useApp();
  const signedIn = !!state.session && !state.session.stale;
  const [said, setSaid] = useState('');
  useEffect(() => {
    let off = () => {};
    const cancel = whenIdle(
      () =>
        void loadStore().then((s) => {
          s.initTheme();
          let shown = s.themeStore.get().shown;
          off = s.themeStore.subscribe(() => {
            const now = s.themeStore.get().shown;
            if (now === shown) return;
            shown = now;
            setSaid(t.theme.changed(s.themeLabel(now)));
          });
        }),
    );
    return () => {
      cancel();
      off();
    };
  }, []);
  useEffect(() => {
    if (!signedIn) return;
    const refresh = (prefs: boolean) => {
      void loadStore().then((s) => s.refreshAppearance());
      if (prefs) void loadPrefs().then((p) => p.refreshPrefs());
    };
    const cancel = whenIdle(() => refresh(true));
    const back = () => document.visibilityState === 'visible' && refresh(true);
    document.addEventListener('visibilitychange', back);
    const id = setInterval(() => document.visibilityState === 'visible' && refresh(false), EVERY);
    return () => {
      cancel();
      document.removeEventListener('visibilitychange', back);
      clearInterval(id);
    };
  }, [signedIn]);
  return (
    <div aria-live="polite" className="sr-only">
      {said}
    </div>
  );
}
