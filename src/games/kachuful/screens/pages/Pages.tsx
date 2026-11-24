import { lazy, Suspense } from 'react';
import type { Route } from '@/games/kachuful/state/types';
import { Page, Skeleton } from '@/components/ui/Page';
import { AccountPage } from '@/platform/pages/AccountPage';
import { ActivityPage } from './ActivityPage';
import { AchievementsPage } from './AchievementsPage';
import { EveryGameActivity, OtherGameAchievements } from './OtherGamePages';
import { GAME_IDS, type GameId } from '@/platform/route';
import { InvitePage, ResetPage, SignInPage } from '@/platform/pages/AuthPages';
import { CreditsPage } from '@/platform/pages/CreditsPage';
import { AwardsPage } from './AwardsPage';
import { LeaderboardPage } from './LeaderboardPage';
import { GamePage } from './GamePage';
import { H2HPage } from './H2HPage';
import { HistoryPage } from './HistoryPage';
import { ImportPage } from './ImportPage';
import { PlayerPage } from './PlayerPage';
import { PlayersPage } from './PlayersPage';
import { LivePage, RecapPage } from './ViewerPages';
import { WrappedPage } from './WrappedPage';
import { NightPage } from './NightPage';
import { t } from '@/strings';
import { wardrobe } from '@/strings/wardrobe';
import { SLOTS, type Slot } from '@/wardrobe/types';

// Only admins open it, so its screens and strings stay out of everyone else's download.
const AdminPage = lazy(() =>
  import('@/platform/pages/AdminPage').then((m) => ({ default: m.AdminPage })),
);

// The Wardrobe and the Bazaar carry the art and the shop: their own chunk, fetched when opened.
const WardrobePage = lazy(() => import('@/platform/pages/wardrobe/WardrobePage'));
const BazaarPage = lazy(() => import('@/platform/pages/wardrobe/BazaarPage'));
const Waiting = ({ title }: { title: string }) => (
  <Page title={title}>
    <Skeleton rows={4} />
  </Page>
);

/** The screen for a route on the nav stack. Its own chunk: the game screens never wait for it. */
export default function Pages({ route }: { route: Route }) {
  const p = route.params ?? {};
  switch (route.screen) {
    case 'history':
      return <HistoryPage />;
    case 'game':
      return <GamePage id={p.id ?? ''} />;
    case 'leaderboard':
      return <LeaderboardPage />;
    case 'player':
      return <PlayerPage id={p.id ?? ''} />;
    case 'h2h':
      return <H2HPage a={p.a ?? ''} b={p.b ?? ''} />;
    case 'achievements':
      return p.game && p.game !== 'kachuful' && GAME_IDS.includes(p.game as GameId) ? (
        <OtherGameAchievements game={p.game as GameId} id={p.id} />
      ) : (
        <AchievementsPage id={p.id} />
      );
    case 'awards':
      return <AwardsPage />;
    case 'wrapped':
      return <WrappedPage year={Number(p.year) || new Date().getFullYear()} playerId={p.id} />;
    case 'night':
      return <NightPage id={p.id} />;
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
      return (
        <Suspense
          fallback={
            <Page title={t.hub.nav.admin}>
              <Skeleton rows={4} />
            </Page>
          }
        >
          <AdminPage />
        </Suspense>
      );
    case 'activity':
      return p.game === 'all' ? <EveryGameActivity /> : <ActivityPage />;
    case 'live':
      return <LivePage token={p.token ?? ''} />;
    case 'recap':
      return <RecapPage token={p.token ?? ''} />;
    case 'credits':
      return <CreditsPage />;
    case 'wardrobe':
      return (
        <Suspense fallback={<Waiting title={wardrobe.title} />}>
          <WardrobePage
            tryOn={
              p.id && p.slot && SLOTS.includes(p.slot as Slot)
                ? { id: p.id, v: Number(p.v) || 0, slot: p.slot as Slot }
                : undefined
            }
          />
        </Suspense>
      );
    case 'bazaar':
      return (
        <Suspense fallback={<Waiting title={wardrobe.bazaar.title} />}>
          <BazaarPage />
        </Suspense>
      );
    case 'import':
      return <ImportPage />;
    default:
      return <HistoryPage />;
  }
}
