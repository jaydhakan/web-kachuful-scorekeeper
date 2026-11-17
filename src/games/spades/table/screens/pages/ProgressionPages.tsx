import { useMemo, type ReactNode } from 'react';
import { progression } from '@/games/spades/progression';
import { spTable } from '@/games/spades/strings/table';
import { useSp } from '@/games/spades/table/state/store';
import { signedInAs, useSession } from '@/sync/session';
import { AchievementsPage } from '@/components/progression/AchievementsPage';
import { ActivityPage } from '@/components/progression/ActivityPage';
import { AwardsPage } from '@/components/progression/AwardsPage';
import { ProgressionScope, useDevice, type ProgressionEnv } from '@/components/progression/env';
import { Gate, leavePage, SpPage } from './parts';
import { useSpGames, useWho, type SpGames } from './source';

/**
 * Spades' side of the shared progression pages: who is signed in, how a player looks, where links go, and (signed
 * out) the scorekeeper's games on this phone as the facts. Online tables are the server's only.
 */
export function useSpProgressionEnv(src: SpGames): ProgressionEnv {
  const { state, actions } = useSp();
  const session = signedInAs(useSession());
  const signedIn = !!session;
  const me = session?.player?.id ?? null;
  const person = useWho(src.games);
  const device = useDevice(progression.device, src.games);
  const nested = state.pages.length > 0;
  return useMemo(
    () => ({
      prog: progression,
      signedIn,
      me,
      person,
      onBack: nested ? actions.closePage : leavePage,
      openPlayer: (id) => actions.openPage({ page: 'player', id }),
      openAchievements: (id) => actions.openPage({ page: 'achievements', ...(id && { id }) }),
      openActivity: signedIn ? () => actions.openPage({ page: 'activity' }) : undefined,
      device,
    }),
    [signedIn, me, person, nested, actions, device],
  );
}

/** A page once this phone's games are read (signed out they are the facts); signed in, straight away. */
function Scoped({ title, children }: { title: string; children: ReactNode }) {
  const src = useSpGames();
  const env = useSpProgressionEnv(src);
  if (!env.signedIn && src.status !== 'ready')
    return (
      <SpPage title={title}>
        <Gate src={src}>{() => null}</Gate>
      </SpPage>
    );
  return <ProgressionScope env={env}>{children}</ProgressionScope>;
}

const m = spTable.menu;

/** Today's and other days' awards, and each month's standings by win rate. */
export function SpAwardsPage() {
  return (
    <Scoped title={m.awards}>
      <AwardsPage />
    </Scoped>
  );
}

/** Every achievement, opened on one player or everyone. */
export function SpAchievementsPage({ id }: { id?: string }) {
  return (
    <Scoped title={spTable.pages.player.achievements}>
      <AchievementsPage id={id} />
    </Scoped>
  );
}

/** What happened lately in everyone's Spades (signed in). */
export function SpActivityPage() {
  return (
    <Scoped title={m.activity}>
      <ActivityPage />
    </Scoped>
  );
}
