import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react';
import { whenIdle } from '@/lib/idle';
import { signedInAs, useSession } from '@/sync/session';

// Offline before the chunk was cached: no crown news this visit, rather than a broken page.
const News = lazy<ComponentType>(() =>
  import('./CrownNews').catch(() => ({ default: (): null => null })),
);

const Rewards = lazy<ComponentType>(() =>
  import('@/components/rewards/RewardNews').catch(() => ({ default: (): null => null })),
);

/** Crown news, firsts, milestones and gifts for the whole site, from the platform root: signed in only, loaded once the first page has painted. */
export function CrownNewsMount() {
  const on = !!signedInAs(useSession());
  const [idle, setIdle] = useState(false);
  useEffect(() => (on && !idle ? whenIdle(() => setIdle(true)) : undefined), [on, idle]);
  if (!on || !idle) return null;
  return (
    <Suspense fallback={null}>
      <News />
      <Rewards />
    </Suspense>
  );
}
