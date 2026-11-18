import { useEffect, useMemo, useState } from 'react';
import { loadProgression, peekProgression, type GameProgression } from '@/progression/registry';
import type { GameId } from '@/progression/types';
import { useApp } from '@/games/kachuful/state/store';
import { useProgressionEnv } from '@/games/kachuful/components/useProgressionEnv';
import { AchievementsPage as SharedAchievements } from '@/components/progression/AchievementsPage';
import { ActivityPage as SharedActivity } from '@/components/progression/ActivityPage';
import { personOf, ProgressionScope, type ProgressionEnv } from '@/components/progression/env';
import { ErrorState, Page, Skeleton } from '@/components/ui/Page';
import { t } from '@/strings';

/**
 * Another game's Achievements, opened from the Me page: the server's rows (Me is signed in only), in Kachuful's nav
 * stack so Back returns to Me. Its catalogue loads first.
 */
export function OtherGameAchievements({ game, id }: { game: GameId; id?: string }) {
  const { state, actions } = useApp();
  const [prog, setProg] = useState<GameProgression | null | 'failed'>(
    () => peekProgression(game) ?? null,
  );
  useEffect(() => {
    if (prog) return;
    let live = true;
    loadProgression(game).then(
      (p) => live && setProg(p),
      () => live && setProg('failed'),
    );
    return () => {
      live = false;
    };
  }, [game, prog]);
  const signedIn = !!state.session;
  const me = state.session?.player?.id ?? null;
  const env = useMemo<ProgressionEnv | null>(
    () =>
      prog && prog !== 'failed'
        ? {
            prog,
            signedIn,
            me,
            person: personOf,
            onBack: actions.back,
            openPlayer: (pid) =>
              actions.open({ screen: 'achievements', params: { id: pid, game } }),
            openAchievements: (pid) =>
              actions.open({ screen: 'achievements', params: { ...(pid && { id: pid }), game } }),
          }
        : null,
    [prog, signedIn, me, actions, game],
  );
  if (!env)
    return (
      <Page title={t.hub.account.achievements}>
        {prog === 'failed' ? (
          <ErrorState msg={t.hub.common.errorTitle} onRetry={() => setProg(null)} />
        ) : (
          <Skeleton rows={4} />
        )}
      </Page>
    );
  return (
    <ProgressionScope env={env}>
      <SharedAchievements id={id} />
    </ProgressionScope>
  );
}

/** Every game's feed together, from the Me page. */
export function EveryGameActivity() {
  const env = useProgressionEnv(null);
  return (
    <ProgressionScope env={env}>
      <SharedActivity game="all" />
    </ProgressionScope>
  );
}
