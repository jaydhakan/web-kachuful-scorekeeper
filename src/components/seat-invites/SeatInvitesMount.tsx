import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react';
import { whenIdle } from '@/lib/idle';
import { signedInAs, useSession } from '@/sync/session';

// Offline before the chunk was cached: no banner this visit, rather than a broken page.
const Host = lazy<ComponentType>(() =>
  import('./SeatInviteHost').catch(() => ({ default: (): null => null })),
);

/**
 * Seat invites for the whole site, from the platform root: signed in, the stream and the banner load once the
 * first page has painted, so the landing page carries only this and the count store.
 */
export function SeatInvitesMount() {
  const on = !!signedInAs(useSession());
  const [idle, setIdle] = useState(false);
  useEffect(() => (on && !idle ? whenIdle(() => setIdle(true)) : undefined), [on, idle]);
  if (!on || !idle) return null;
  return (
    <Suspense fallback={null}>
      <Host />
    </Suspense>
  );
}
