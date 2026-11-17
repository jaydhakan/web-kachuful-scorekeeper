import { useCallback, useEffect, useState } from 'react';
import { MomentPop } from '@/components/progression/MomentPop';
import type { PopCard } from '@/components/progression/popCard';
import type { SpGame, SpPublic } from '@/games/spades/domain/types';

const load = () => import('./livePops');

/**
 * Pops a scored hand's moments under the top bar, once, above any sheet; they never take focus or block a tap.
 * Mounted when the hand is first shown scored (a reopened summary doesn't mount it).
 */
export function HandPops({
  game,
  index,
  nameOf,
}: {
  /** A table-mode game, or an online table's public state. */
  game: SpGame | SpPublic;
  index: number;
  nameOf: (id: string) => string;
}) {
  const [pops, setPops] = useState<{ id: string; cards: PopCard[] } | null>(null);
  useEffect(() => {
    let on = true;
    // A pop is decoration: if its chunk can't load (offline, say), the hand simply shows without it.
    load().then(
      (m) => {
        const cards = m.handPopCards(game, index, nameOf);
        if (on && cards.length) setPops({ id: `${game.id}:${index}`, cards });
      },
      () => undefined,
    );
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per hand
  }, [game.id, index]);
  const done = useCallback(() => setPops(null), []);
  return (
    <div className="pointer-events-none absolute inset-0 z-[61]">
      <MomentPop pops={pops} onDone={done} />
    </div>
  );
}
