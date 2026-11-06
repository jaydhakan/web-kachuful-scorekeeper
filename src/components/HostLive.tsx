import { lazy, Suspense } from 'react';
import { useApp } from '@/state/store';
import { useArchive } from '@/state/useArchive';
import type { KeptLink } from './ShareLinks';

// Downloaded only while the table has a live link; most games never do.
const Feed = lazy(() => import('./HostLiveFeed'));

/** The live link's token for the game on the table, from what the share sheet kept. */
const tokenOf = (l: KeptLink | undefined) => l?.token ?? l?.url.match(/\/l\/([^/?#]+)/)?.[1];

/** The scorer's view of a watched table: mounts the feed once a live link exists for the game. */
export function HostLive() {
  const { state } = useApp();
  const g = state.game;
  const link = useArchive(
    (a) => (a.get('cache', 'links:' + g.syncId)?.value as { live?: KeptLink } | undefined)?.live,
  );
  const token = state.session && g.status === 'active' ? tokenOf(link) : undefined;
  if (!token) return null;
  return (
    <Suspense fallback={null}>
      <Feed token={token} />
    </Suspense>
  );
}
