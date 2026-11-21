import { lazy, Suspense, useState } from 'react';
import { festivalOn } from '../festival';

// The dressing and its confetti stay out of the first load: they come only on a festival day.
const FestivalTable = lazy(() =>
  import('./FestivalTable').then((m) => ({ default: m.FestivalTable })),
);

/** `FestivalTable`, fetched only when today is a festival: every other round 1 deals without it. */
export function FestivalTableLazy() {
  const [now] = useState(Date.now);
  if (!festivalOn(now)) return null;
  return (
    <Suspense fallback={null}>
      <FestivalTable now={now} />
    </Suspense>
  );
}
