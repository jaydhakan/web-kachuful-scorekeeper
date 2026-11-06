import { useEffect, useState } from 'react';
import { useApp } from '@/state/store';
import { useArchive } from '@/state/useArchive';
import { followLive } from '@/sync/live';
import { ReactionBurst, useBursts, WatchersPill } from './LiveReactions';
import type { KeptLink } from './ShareLinks';

/** The live link's token for the game on the table, from what the share sheet kept. */
const tokenOf = (l: KeptLink | undefined) => l?.token ?? l?.url.match(/\/l\/([^/?#]+)/)?.[1];

/**
 * On the scorer's phone while a live link is on: how many follow the table, and the cheers they send. It follows
 * its own stream as the host, so it is not counted as a watcher.
 */
export function HostLive() {
  const { state } = useApp();
  const g = state.game;
  const link = useArchive(
    (a) => (a.get('cache', 'links:' + g.syncId)?.value as { live?: KeptLink } | undefined)?.live,
  );
  const token = state.session && g.status === 'active' ? tokenOf(link) : undefined;
  const [n, setN] = useState(0);
  const [bursts, burst] = useBursts();
  useEffect(() => {
    setN(0);
    if (!token) return;
    return followLive(
      token,
      (e) => {
        if (e.type === 'watchers') setN(e.n);
        else if (e.type === 'reaction') burst(e.kind);
        else if (e.type === 'revoked') setN(0);
      },
      { host: true },
    );
  }, [token, burst]);
  if (!token || state.screen !== 'round') return null;
  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--sat)+3.75rem)] z-30 flex justify-center">
        <WatchersPill n={n} />
      </div>
      <ReactionBurst bursts={bursts} />
    </>
  );
}
