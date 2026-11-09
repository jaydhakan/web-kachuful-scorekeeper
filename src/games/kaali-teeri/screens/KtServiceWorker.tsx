import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useKt } from '@/games/kaali-teeri/state/store';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { UpdateGate } from '@/components/UpdateGate';
import { t } from '@/strings';

/** Registers the service worker, announces offline readiness once, and gates the app on a waiting update. */
export function KtServiceWorker() {
  const { state, actions } = useKt();
  const { offlineReady, announced, needRefresh, reload } = useServiceWorker();
  // One toast slot, and this news can wait: it never displaces a toast the player just caused.
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
