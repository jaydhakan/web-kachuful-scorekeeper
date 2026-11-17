import { lazy, Suspense, useState } from 'react';
import type { PopCard } from './popCard';

// The cards, the queue and the animation helpers stay out of every game's first load: they come with the first batch.
const MomentPop = lazy(() => import('@/fx/ui').then((m) => ({ default: m.MomentPop })));

type Batch = { id: number | string; cards: PopCard[] } | null;

/** `MomentPop`, loaded with the first batch and kept mounted after it, so its cards can still leave as they should. */
export function MomentPopLazy({ pops, onDone }: { pops: Batch; onDone: () => void }) {
  const [wanted, setWanted] = useState(false);
  if (pops && !wanted) setWanted(true);
  if (!wanted) return null;
  return (
    <Suspense fallback={null}>
      <MomentPop pops={pops} onDone={onDone} />
    </Suspense>
  );
}
