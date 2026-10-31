import type { Route } from '@/state/types';
import { AccountPage } from './AccountPage';
import { AchievementsPage } from './AchievementsPage';
import { AdminPage } from './AdminPage';
import { InvitePage, ResetPage, SignInPage } from './AuthPages';
import { AwardsPage } from './AwardsPage';
import { BoardsPage } from './BoardsPage';
import { GamePage } from './GamePage';
import { H2HPage } from './H2HPage';
import { HistoryPage } from './HistoryPage';
import { ImportPage } from './ImportPage';
import { PlayerPage } from './PlayerPage';
import { PlayersPage } from './PlayersPage';
import { WrappedPage } from './WrappedPage';

/** The screen for a route on the nav stack. Its own chunk: the game screens never wait for it. */
export default function Pages({ route }: { route: Route }) {
  const p = route.params ?? {};
  switch (route.screen) {
    case 'history':
      return <HistoryPage />;
    case 'game':
      return <GamePage id={p.id ?? ''} />;
    case 'leaderboard':
      return <BoardsPage />;
    case 'player':
      return <PlayerPage id={p.id ?? ''} />;
    case 'h2h':
      return <H2HPage a={p.a ?? ''} b={p.b ?? ''} />;
    case 'achievements':
      return <AchievementsPage id={p.id} />;
    case 'awards':
      return <AwardsPage />;
    case 'wrapped':
      return <WrappedPage year={Number(p.year) || new Date().getFullYear()} playerId={p.id} />;
    case 'players':
      return <PlayersPage />;
    case 'signin':
      return <SignInPage />;
    case 'invite':
      return <InvitePage token={p.token ?? ''} />;
    case 'reset':
      return <ResetPage token={p.token ?? ''} />;
    case 'account':
      return <AccountPage />;
    case 'admin':
      return <AdminPage />;
    case 'import':
      return <ImportPage />;
    default:
      return <HistoryPage />;
  }
}
