import { useMemo, type ReactNode } from 'react';
import { progression } from '@/games/kaali-teeri/progression';
import { useKt } from '@/games/kaali-teeri/state/store';
import { signedInAs, useSession } from '@/sync/session';
import { ProgressionScope, useDevice, type ProgressionEnv } from '@/components/progression/env';
import { AwardsPage as SharedAwards } from '@/components/progression/AwardsPage';
import { AchievementsPage as SharedAchievements } from '@/components/progression/AchievementsPage';
import { ActivityPage as SharedActivity } from '@/components/progression/ActivityPage';
import { useWho } from './parts';
import { useKtGames } from './source';

/**
 * Kaali Teeri's side of the shared pages: who is signed in, its page stack, its players and this device's games (the
 * facts signed out; shown until the server answers signed in).
 */
export function useKtProgressionEnv(): ProgressionEnv {
  const { actions } = useKt();
  const session = signedInAs(useSession());
  const games = useKtGames().games;
  const who = useWho(games);
  const device = useDevice(progression.device, games);
  const signedIn = !!session;
  const me = session?.player?.id ?? null;
  return useMemo(
    () => ({
      prog: progression,
      signedIn,
      me,
      person: (id: string) => {
        const w = who(id);
        return { id, playerId: w.playerId, name: w.name, emoji: w.emoji, color: w.color };
      },
      onBack: actions.closePage,
      openPlayer: (id) => actions.openPage({ page: 'player', id }),
      openAchievements: (id) => actions.openPage({ page: 'achievements', ...(id && { id }) }),
      openActivity: signedIn ? () => actions.openPage({ page: 'activity' }) : undefined,
      openGame: (a) => a.game && actions.openPage({ page: 'game', id: a.game.id }),
      device,
    }),
    [signedIn, me, who, actions, device],
  );
}

function Scope({ children }: { children: ReactNode }) {
  return <ProgressionScope env={useKtProgressionEnv()}>{children}</ProgressionScope>;
}

/** Today's and past days' awards, and each month's win-rate season. */
export function AwardsPage() {
  return (
    <Scope>
      <SharedAwards />
    </Scope>
  );
}

/** The whole catalogue, for one player or everyone. */
export function AchievementsPage({ id }: { id?: string }) {
  return (
    <Scope>
      <SharedAchievements id={id} />
    </Scope>
  );
}

/** Kaali Teeri's feed (signed in). */
export function ActivityPage() {
  return (
    <Scope>
      <SharedActivity />
    </Scope>
  );
}
