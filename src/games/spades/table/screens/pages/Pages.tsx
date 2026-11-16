import type { TablePage } from '@/games/spades/nav';
import type { SpRoute } from '@/games/spades/table/state/types';
import GamePage from './GamePage';
import HistoryPage from './HistoryPage';
import LeaderboardPage from './LeaderboardPage';

/** One lazy chunk for the pages: a recap on top, else the page the address names. */
export default function Pages({ page, route }: { page: TablePage | null; route: SpRoute | null }) {
  if (route) return <GamePage id={route.id} />;
  return page === 'leaderboard' ? <LeaderboardPage /> : <HistoryPage />;
}
