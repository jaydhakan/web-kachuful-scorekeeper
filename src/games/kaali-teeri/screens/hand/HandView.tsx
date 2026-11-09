import { curHand } from '@/games/kaali-teeri/state/select';
import { useKt } from '@/games/kaali-teeri/state/store';
import Bidding from './Bidding';
import Call from './Call';
import Play from './Play';
import Result from './Result';
import Summary from './Summary';

/** The hand on the table: its summary once scored, else the screen for its phase. */
export default function HandView() {
  const g = useKt().state.game;
  if (!g) return null;
  const h = curHand(g);
  if (g.ui.view === 'summary' || h.phase === 'done') return <Summary />;
  switch (h.phase) {
    case 'bidding':
      return <Bidding />;
    case 'calling':
      return <Call />;
    case 'playing':
      return <Play />;
    case 'result':
      return <Result />;
  }
}
