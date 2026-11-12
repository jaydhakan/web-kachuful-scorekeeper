import type { CardRef } from '@/games/kaali-teeri/domain';
import { initialKtState, ktReducer } from '@/games/kaali-teeri/state/reducer';
import { DEFAULT_PREFS, type KtAction, type KtState } from '@/games/kaali-teeri/state/types';

const NAMES = ['Aarav', 'Riya', 'Kabir', 'Meera', 'Dev', 'Ishaan', 'Zoya'];

/**
 * A game at `n` seats, `done` hands confirmed (the defenders taking `pts` in each), the next one in play with its cards
 * called (Riya bids).
 */
export function game(n: number, done = 0, cards?: CardRef[], pts = 60): KtState {
  let s = initialKtState(null, 'home', [], DEFAULT_PREFS);
  const d = (a: KtAction) => (s = ktReducer(s, a));
  d({ type: 'startSetup', lg: null });
  d({ type: 'setupCount', n });
  NAMES.slice(0, n).forEach((name, k) =>
    d({ type: 'setupSeat', k, seat: { name, emoji: '🙂', color: '#FF8A65' } }),
  );
  d({
    type: 'beginGame',
    id: 'g',
    syncId: 's',
    now: Date.now() - 60e3,
    playerIds: NAMES.slice(0, n).map((x) => 'r' + x),
  });
  const ids = s.game!.players.map((p) => p.id);
  const call = cards ?? [{ rank: 'A', suit: 'hearts' }];
  const hand = () => {
    d({ type: 'quickBid', bidder: ids[1], bid: s.game!.rules.minBid + 30 });
    d({ type: 'trump', suit: 'spades' });
    call.forEach((card) => d({ type: 'addCard', card }));
    d({ type: 'confirmCall' });
  };
  for (let k = 0; k < done; k++) {
    hand();
    call.forEach((_, i) => d({ type: 'markPlayed', i, by: ids[2 + i] }));
    d({ type: 'toResult' });
    d({ type: 'points', entered: pts });
    d({ type: 'confirmHand' });
    if (k < done - 1) d({ type: 'nextHand' });
  }
  if (!done) hand();
  return s;
}
