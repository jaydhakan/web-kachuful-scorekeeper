import { useEffect } from 'react';
import { useKt } from '@/games/kaali-teeri/state/store';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { t } from '@/strings';

/** Announces offline readiness once in Kaali Teeri's toast slot; PlatformRoot gates every page on an update. */
export function KtServiceWorker() {
  const { state, actions } = useKt();
  const { offlineReady, announced } = useServiceWorker();
  // One toast slot, and this news can wait: it never displaces a toast the player just caused.
  const slotBusy = !!state.toast;
  useEffect(() => {
    if (!offlineReady || slotBusy) return;
    actions.say(t.toasts.offlineReady);
    announced();
  }, [offlineReady, slotBusy, actions, announced]);
  return null;
}
