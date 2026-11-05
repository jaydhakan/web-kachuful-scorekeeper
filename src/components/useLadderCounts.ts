import { useMemo } from 'react';
import { ladderCounts, type Facts, type LadderId } from '@/domain';
import { useApp } from '@/state/store';
import { ep } from '@/sync/endpoints';
import type { PlayerStats } from '@/sync/types';
import { useRemote } from '@/sync/useRemote';

export type LadderCounts = Partial<Record<LadderId, number>>;

/** The ladder counts the server's totals give; crew, points gained and winning run have no total, so stay unknown. */
export const countsFromTotals = (t: PlayerStats): LadderCounts => ({
  games: t.gamesEnded,
  rounds: t.rounds,
  made: t.made,
  hot: t.longestHot,
  cold: t.longestCold,
});

/**
 * One player's ladder counts: signed in from the server's totals (the device holds only some games), signed out from
 * this device's games. Null without a player; empty while the server's are loading.
 */
export function useLadderCounts(playerId: string | null, f: Facts) {
  const signedIn = !!useApp().state.session;
  const profile = useRemote(signedIn && playerId ? `p:${playerId}` : null, (o) =>
    ep.player(playerId!, o),
  );
  const local = useMemo(
    () => (playerId && !signedIn ? ladderCounts(f, playerId) : null),
    [f, playerId, signedIn],
  );
  const tot = profile.data?.totals;
  const counts: LadderCounts | null = !playerId
    ? null
    : signedIn
      ? tot
        ? countsFromTotals(tot)
        : {}
      : local;
  return { counts, profile };
}
