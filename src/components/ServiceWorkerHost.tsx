import { useEffect } from 'react';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { useApp } from '@/games/kachuful/state/store';
import { t } from '@/strings';

/** Announces the first offline-ready install in Kachuful's toast slot; PlatformRoot gates every page on an update. */
export function ServiceWorkerHost() {
  const { state, actions } = useApp();
  const { offlineReady, announced } = useServiceWorker();
  // There is one toast slot, and this news can wait: it never displaces a toast the player just caused.
  const slotBusy = !!state.toast;
  useEffect(() => {
    if (!offlineReady || slotBusy) return;
    actions.say(t.toasts.offlineReady);
    announced();
  }, [offlineReady, slotBusy, actions, announced]);
  return null;
}
