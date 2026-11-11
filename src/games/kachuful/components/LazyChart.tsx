import { lazy, Suspense } from 'react';
import type { Game, Round } from '@/games/kachuful/domain';

const ChartBlock = lazy(() => import('@/games/kachuful/screens/desk/ScoreChart'));

/** The score chart, loaded only when a screen shows it; the box keeps its height while the code arrives. */
export function LazyChart({ g, rounds }: { g: Game; rounds: Round[] }) {
  return (
    <Suspense fallback={<div className="h-56" />}>
      <ChartBlock g={g} rounds={rounds} />
    </Suspense>
  );
}
