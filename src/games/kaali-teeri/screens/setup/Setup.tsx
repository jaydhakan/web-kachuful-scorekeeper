import { useKt } from '@/games/kaali-teeri/state/store';
import Players from './Players';
import Seating from './Seating';
import Dealer from './Dealer';

/** The three setup steps. */
export default function Setup() {
  const step = useKt().state.setup?.step;
  if (!step) return null;
  return step === 1 ? <Players /> : step === 2 ? <Seating /> : <Dealer />;
}
