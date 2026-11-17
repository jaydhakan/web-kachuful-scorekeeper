import { useMemo } from 'react';
import { progression } from '@/games/ishaara/progression';
import { signedInAs, useSession } from '@/sync/session';
import { AchievementsPage } from '@/components/progression/AchievementsPage';
import { ActivityPage } from '@/components/progression/ActivityPage';
import { AwardsPage } from '@/components/progression/AwardsPage';
import { personOf, ProgressionScope, type ProgressionEnv } from '@/components/progression/env';
import { useHubNav, type HubRoute } from './parts';

type ProgressRoute = Extract<HubRoute, { page: 'awards' | 'achievements' | 'activity' }>;

/**
 * Awards, Achievements and Activity: the shared pages on Ishaara's progression and hub stack. The server works
 * everything out (Ishaara has no device rules), so signed out they show nothing.
 */
export function ProgressPage({ r }: { r: ProgressRoute }) {
  const nav = useHubNav();
  const session = signedInAs(useSession());
  const me = session?.player?.id ?? null;
  const env = useMemo<ProgressionEnv>(
    () => ({
      prog: progression,
      signedIn: !!session,
      me,
      person: personOf,
      onBack: nav.back,
      openPlayer: (id) => nav.open({ page: 'player', who: personOf(id) }),
      openAchievements: (id) => nav.open({ page: 'achievements', id }),
      openActivity: session ? () => nav.open({ page: 'activity' }) : undefined,
      openGame: (a) => a.game && nav.open({ page: 'game', id: a.game.id }),
    }),
    [nav, session, me],
  );
  return (
    <ProgressionScope env={env}>
      {r.page === 'awards' ? (
        <AwardsPage />
      ) : r.page === 'achievements' ? (
        <AchievementsPage id={r.id} />
      ) : (
        <ActivityPage />
      )}
    </ProgressionScope>
  );
}
