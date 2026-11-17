import { useState } from 'react';
import { KT_ACHIEVEMENTS, momentsOfHand } from '@/games/kaali-teeri/domain/achievements';
import type { KtGame } from '@/games/kaali-teeri/domain/types';
import { useKt } from '@/games/kaali-teeri/state/store';
import type { KtState } from '@/games/kaali-teeri/state/types';
import { achievements, ladders } from '@/games/kaali-teeri/strings/achievements';
import { pidOf } from '@/people/pid';
import type { CatalogueView } from '@/progression/catalogue';
import { MomentPop } from '@/components/progression/MomentPop';
import { popCard, type PopCard } from '@/components/progression/popCard';

// The catalogue alone: this chunk loads with the first hand confirmed, not the progression pages.
const CAT: CatalogueView = { catalogue: KT_ACHIEVEMENTS, strings: { achievements, ladders } };
const DEF = new Map(KT_ACHIEVEMENTS.map((a) => [a.code, a]));
const rank = (code: string) => (DEF.get(code)?.big ? 0 : DEF.get(code)?.shame ? 2 : 1);

/** One card per moment, everyone who earned it named on it: the big ones first, the 🙃 ones last. */
function cardsOf(g: KtGame, hand: number): PopCard[] {
  const names = new Map<string, string[]>();
  for (const e of momentsOfHand(g, hand)) {
    const seat = g.players.find((p) => pidOf(p) === e.playerId);
    names.set(e.code, [...(names.get(e.code) ?? []), seat?.name ?? e.playerId]);
  }
  return [...names]
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([code, who]) => popCard(CAT, code, who.join(', ')));
}

type Batch = { id: number; cards: PopCard[] } | null;

const build = (pops: KtState['pops'], g: KtState['game']): Batch => {
  if (!pops || !g) return null;
  const cards = cardsOf(g, pops.hand);
  return cards.length ? { id: pops.id, cards } : null;
};

/**
 * The hand just confirmed: its moments drop in under the top bar and leave on their own, never taking focus. Built
 * once per hand, so later changes to the game don't replay them.
 */
export default function MomentCards() {
  const { state, actions } = useKt();
  const { pops, game } = state;
  const [shown, setShown] = useState<{ key: number | null; batch: Batch }>({
    key: null,
    batch: null,
  });
  if ((pops?.id ?? null) !== shown.key)
    setShown({ key: pops?.id ?? null, batch: build(pops, game) });
  return <MomentPop pops={shown.batch} onDone={actions.popsDone} />;
}
