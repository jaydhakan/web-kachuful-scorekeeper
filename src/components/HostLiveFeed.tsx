import { useEffect, useState } from 'react';
import { useApp } from '@/state/store';
import { followLive } from '@/sync/live';
import { ReactionBurst, useBursts, WatchersPill } from './LiveReactions';

/**
 * On the scorer's phone while a live link is on: how many follow the table, and the cheers they send. It follows
 * its own stream as the host, so it is not counted as a watcher.
 */
export default function HostLiveFeed({ token }: { token: string }) {
  const { state } = useApp();
  const [n, setN] = useState(0);
  const [bursts, burst] = useBursts();
  useEffect(() => {
    setN(0);
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
  if (state.screen !== 'round') return null;
  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--sat)+3.75rem)] z-30 flex justify-center">
        <WatchersPill n={n} />
      </div>
      <ReactionBurst bursts={bursts} />
    </>
  );
}
