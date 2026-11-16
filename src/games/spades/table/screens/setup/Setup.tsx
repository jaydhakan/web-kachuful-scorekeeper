import { useSp } from '@/games/spades/table/state/store';
import Dealer from './Dealer';
import Players from './Players';

/** The two setup steps: the four players and the rules, then the first dealer. */
export default function Setup() {
  const step = useSp().state.setup?.step;
  if (!step) return null;
  return step === 1 ? <Players /> : <Dealer />;
}
