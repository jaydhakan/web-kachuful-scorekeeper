import type { TablePage } from '@/games/spades/nav';
import type { SpRoute } from '@/games/spades/table/state/types';
import GamePage from './GamePage';
import HistoryPage from './HistoryPage';
import LeaderboardPage from './LeaderboardPage';
import PlayerPage from './PlayerPage';
import { SpAchievementsPage, SpActivityPage, SpAwardsPage } from './ProgressionPages';

/** One lazy chunk for the pages: a recap on top, else the page the address names. */
export default function Pages({ page, route }: { page: TablePage | null; route: SpRoute | null }) {
  if (route?.page === 'player') return <PlayerPage key={route.id} id={route.id} />;
  if (route?.page === 'achievements') return <SpAchievementsPage key={route.id} id={route.id} />;
  if (route?.page === 'awards') return <SpAwardsPage />;
  if (route?.page === 'activity') return <SpActivityPage />;
  if (route) return <GamePage id={route.id} />;
  if (page === 'awards') return <SpAwardsPage />;
  if (page === 'activity') return <SpActivityPage />;
  return page === 'leaderboard' ? <LeaderboardPage /> : <HistoryPage />;
}
