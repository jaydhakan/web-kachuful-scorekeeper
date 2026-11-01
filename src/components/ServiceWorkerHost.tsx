import { useEffect } from 'react';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { useApp } from '@/state/store';
import { t } from '@/strings';

/** Registers the service worker and announces the first offline-ready install. Updates apply silently. */
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
