import { useMemo } from 'react';
import type { Facts } from '@/games/kachuful/domain';
import { progression } from '@/games/kachuful/progression';
import { useApp } from '@/games/kachuful/state/store';
import { whoIs } from '@/games/kachuful/state/useFacts';
import { bindDevice, type ProgressionEnv } from '@/components/progression/env';

/**
 * Kachuful's side of the shared pages: its store's session and nav stack, its players and this device's games (null
 * for a page that needs neither, such as the feed).
 */
export function useProgressionEnv(f: Facts | null): ProgressionEnv {
  const { state, actions } = useApp();
  const signedIn = !!state.session;
  const me = state.session?.player?.id ?? null;
  return useMemo(
    () => ({
      prog: progression,
      signedIn,
      me,
      person: (id: string) => whoIs(f, id),
      onBack: actions.back,
      openPlayer: (id) => actions.open({ screen: 'player', params: { id } }),
      openAchievements: (id) =>
        actions.open({ screen: 'achievements', params: id ? { id } : undefined }),
      openActivity: signedIn ? () => actions.open({ screen: 'activity' }) : undefined,
      openGame: (a) => a.game && actions.open({ screen: 'game', params: { id: a.game.id } }),
      device: f ? bindDevice(progression.device!, f) : undefined,
    }),
    [f, signedIn, me, actions],
  );
}
