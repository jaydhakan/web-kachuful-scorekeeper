import type { ReactElement } from 'react';
import type { KtGame } from '@/games/kaali-teeri/domain';
import { curHand } from '@/games/kaali-teeri/state/select';
import Bidding from './Bidding';
import Call from './Call';
import Play from './Play';
import Result from './Result';
import Summary from './Summary';

/**
 * The hand's screen: its summary once scored, else the one for its phase. Chosen by the shell at render, so a screen
 * that is leaving keeps its own component; one that switched to the next phase while leaving was never removed.
 */
export function handScreen(g: KtGame): ReactElement {
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
