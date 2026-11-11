import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { useApp } from '@/games/kachuful/state/store';
import { t } from '@/strings';
import { UpdateGate } from './UpdateGate';

/** Registers the service worker, announces the first offline-ready install and gates the app on a waiting update. */
export function ServiceWorkerHost() {
  const { state, actions } = useApp();
  const { offlineReady, announced, needRefresh, reload } = useServiceWorker();
  // There is one toast slot, and this news can wait: it never displaces a toast the player just caused.
  const slotBusy = !!state.toast;
  useEffect(() => {
    if (!offlineReady || slotBusy) return;
    actions.say(t.toasts.offlineReady);
    announced();
  }, [offlineReady, slotBusy, actions, announced]);
  return (
    <AnimatePresence>
      {needRefresh && <UpdateGate key="update" onReload={reload} />}
    </AnimatePresence>
  );
}
