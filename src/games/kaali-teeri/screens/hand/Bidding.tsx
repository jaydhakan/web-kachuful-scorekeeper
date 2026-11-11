import { useKt } from '@/games/kaali-teeri/state/store';
import { curHand } from '@/games/kaali-teeri/state/select';
import { Auction } from './bidding/Auction';
import { QuickBid } from './bidding/QuickBid';

/** The bidding step: quick mode (the default) records the winning bid; the switch turns on the full auction. */
export default function Bidding() {
  const { state } = useKt();
  const g = state.game;
  if (!g) return null;
  const h = curHand(g);
  if (h.phase !== 'bidding') return null;
  // Keyed by hand, so a new hand starts with nothing picked and the amount back at the minimum.
  return h.mode === 'quick' ? (
    <QuickBid key={h.index} g={g} h={h} />
  ) : (
    <Auction key={h.index} g={g} h={h} />
  );
}
