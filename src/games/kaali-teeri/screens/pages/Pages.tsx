import type { KtRoute } from '@/games/kaali-teeri/state/types';
import { GamePage } from './GamePage';
import { H2HPage } from './H2HPage';
import { HistoryPage } from './HistoryPage';
import { LeaderboardPage } from './LeaderboardPage';
import { PlayerPage } from './PlayerPage';
import { PlayersPage } from './PlayersPage';
import { AchievementsPage, ActivityPage, AwardsPage } from './ProgressionPages';

/** The page for a route on the stack. One lazy chunk for every hub page; the game screens never wait for it. */
export default function Pages({ route }: { route: KtRoute }) {
  switch (route.page) {
    case 'history':
      return <HistoryPage />;
    case 'game':
      return <GamePage id={route.id} />;
    case 'leaderboard':
      return <LeaderboardPage />;
    case 'players':
      return <PlayersPage />;
    case 'player':
      return <PlayerPage id={route.id} />;
    case 'h2h':
      return <H2HPage a={route.a} b={route.b} />;
    case 'awards':
      return <AwardsPage />;
    case 'achievements':
      return <AchievementsPage id={route.id} />;
    case 'activity':
      return <ActivityPage />;
  }
}
