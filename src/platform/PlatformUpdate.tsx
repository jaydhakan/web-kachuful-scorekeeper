import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { UpdateGate } from '@/components/UpdateGate';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { platform } from '@/strings/platform';
import { say } from './notice';
import type { GameId } from './route';

// These games announce offline-readiness in their own toast slot, beside their other news.
const OWN_TOAST: readonly GameId[] = ['kachuful', 'kaali-teeri'];

/**
 * Registers the service worker on every page and gates the whole site on a waiting update, so the landing page and
 * Ishaara get both too. Where no game has a toast slot, the first offline-ready install is announced here.
 */
export function PlatformUpdate({ game }: { game: GameId | null }) {
  const { offlineReady, announced, needRefresh, reload } = useServiceWorker();
  const here = !game || !OWN_TOAST.includes(game);
  useEffect(() => {
    if (!offlineReady || !here) return;
    say(platform.offlineReady);
    announced();
  }, [offlineReady, here, announced]);
  return (
    <AnimatePresence>
      {needRefresh && <UpdateGate key="update" onReload={reload} />}
    </AnimatePresence>
  );
}
