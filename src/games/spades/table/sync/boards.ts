import { useSession, signedInAs } from '@/sync/session';
import { useRemote, type Remote } from '@/sync/useRemote';
import { spEp } from './endpoints';
import type {
  SpHeadToHeadResp,
  SpLeaderboard,
  SpPeriod,
  SpPlayerGame,
  SpSort,
  SpStatsResp,
} from './types';

/**
 * Spades' online boards (both kinds): the server's numbers over every synced game, cache first (the last answer shows
 * at once, then refreshes with If-None-Match). Signed out, or with no id to ask about, nothing is fetched and
 * `online` is false, so a page shows the device's own numbers (table/lib/boards.ts) instead.
 */
export interface SpBoard<T> extends Remote<T> {
  /** Signed in: these numbers come from the server; false means use the device's own. */
  online: boolean;
}

function useBoard<T>(key: string | null, load: Parameters<typeof useRemote<T>>[1]): SpBoard<T> {
  const online = !!signedInAs(useSession());
  const r = useRemote<T>(online ? key : null, load);
  return { ...r, online };
}

/** `GET /api/spades/leaderboard`: today, week (last 7 days), season (this month) or all, by wins/rate/made. */
export const useSpLeaderboard = (period: SpPeriod, sort: SpSort): SpBoard<SpLeaderboard> =>
  useBoard(`sp:lb:${period}:${sort}`, (o) => spEp.leaderboard(period, sort, o));

/** A player's totals, best score and partners over all their Spades games. */
export const useSpPlayerStats = (playerId: string | null): SpBoard<SpStatsResp> =>
  useBoard(playerId && `sp:stats:${playerId}`, (o) => spEp.playerStats(playerId!, o));

/** Two players as partners and as opponents. */
export const useSpHeadToHead = (a: string | null, b: string | null): SpBoard<SpHeadToHeadResp> =>
  useBoard(a && b && a !== b ? `sp:vs:${a}:${b}` : null, (o) => spEp.vs(a!, b!, o));

/** The newest 200 games a player sat in, both kinds (open a table-mode one with fetchSpGame from ./engine). */
export const useSpPlayerGames = (playerId: string | null): SpBoard<SpPlayerGame[]> =>
  useBoard(playerId && `sp:games:${playerId}`, (o) =>
    spEp.playerGames(playerId!, null, o).then((p) => p.items),
  );
