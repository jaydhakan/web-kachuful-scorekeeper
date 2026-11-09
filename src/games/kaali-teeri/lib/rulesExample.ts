import { deckTotal, handScore, type KtHand, type KtRules } from '@/games/kaali-teeri/domain';
import type { Example } from '@/games/kaali-teeri/strings/rules';

/** The worked example, scored by the domain so the page can't drift from the rules. */
export function example(r: KtRules): Example {
  const total = deckTotal(r.decks),
    bid = r.minBid + 30;
  const score = (teamPoints: number, playedBy: string): Record<string, number> => {
    const h: KtHand = {
      index: 0,
      dealerIndex: 0,
      phase: 'done',
      mode: 'quick',
      calls: [],
      bidder: 'b',
      bid,
      trump: 'spades',
      called: [{ rank: 'A', suit: 'hearts' }],
      playedBy: [playedBy],
      teamPoints,
      countedBy: 'defenders',
    };
    return handScore(h, r, ['b', 'p', 'd']);
  };
  const madeTeam = bid + 10,
    missTeam = bid - 20;
  return {
    bid,
    total,
    madeDef: total - madeTeam,
    madeTeam,
    made: score(madeTeam, 'p').b,
    double: score(madeTeam, 'b').b,
    missDef: total - missTeam,
    missed: score(missTeam, 'p').d,
  };
}
