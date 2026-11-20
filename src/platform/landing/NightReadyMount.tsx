import { lazy, Suspense, useEffect, useState } from 'react';
import { whenIdle } from '@/lib/idle';
import { signedInAs, useSession } from '@/sync/session';

// Offline before the chunk was cached: no card this visit, rather than a broken page.
const Card = lazy(() => import('./NightReadyLanding').catch(() => ({ default: () => null })));

/** Signed in, "Your night is ready" loads once the landing page has painted, so its first load carries only this. */
export function NightReadyMount() {
  const on = !!signedInAs(useSession());
  const [idle, setIdle] = useState(false);
  useEffect(() => (on && !idle ? whenIdle(() => setIdle(true)) : undefined), [on, idle]);
  if (!on || !idle) return null;
  return (
    <Suspense fallback={null}>
      <Card />
    </Suspense>
  );
}
