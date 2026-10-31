import type { Route } from '@/state/types';
import { GamePage } from './GamePage';
import { HistoryPage } from './HistoryPage';

/** The screen for a route on the nav stack. Its own chunk: the game screens never wait for it. */
export default function Pages({ route }: { route: Route }) {
  const p = route.params ?? {};
  switch (route.screen) {
    case 'history':
      return <HistoryPage />;
    case 'game':
      return <GamePage id={p.id ?? ''} />;
    default:
      return <HistoryPage />;
  }
}
