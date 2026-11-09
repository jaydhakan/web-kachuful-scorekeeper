import { useSession, signedInAs } from '@/sync/session';
import { useRemote, type Remote } from '@/sync/useRemote';
import { ktEp } from './endpoints';
import type {
  KtGameSummary,
  KtHeadToHeadResp,
  KtLeaderboard,
  KtPeriod,
  KtSort,
  KtStatsResp,
} from './types';

/**
 * Kaali Teeri's online boards for the hub pages: the server's numbers over every synced game, cache first (the last
 * answer shows at once, then refreshes with If-None-Match). Signed out, or with no id to ask about, nothing is
 * fetched and `online` is false, so a page shows the device's own numbers (domain/stats.ts) instead.
 */
export interface KtBoard<T> extends Remote<T> {
  /** Signed in: these numbers come from the server; false means use the device's own. */
  online: boolean;
}

function useBoard<T>(key: string | null, load: Parameters<typeof useRemote<T>>[1]): KtBoard<T> {
  const online = !!signedInAs(useSession());
  const r = useRemote<T>(online ? key : null, load);
  return { ...r, online };
}

/** `GET /api/kaali-teeri/leaderboard`: today, week (last 7 days), season (this month) or all, by points/wins/made. */
export const useKtLeaderboard = (period: KtPeriod, sort: KtSort): KtBoard<KtLeaderboard> =>
  useBoard(`kt:lb:${period}:${sort}`, (o) => ktEp.leaderboard(period, sort, o));

/** A player's profile over all their Kaali Teeri games (the domain's playerStats). */
export const useKtPlayerStats = (playerId: string | null): KtBoard<KtStatsResp> =>
  useBoard(playerId && `kt:stats:${playerId}`, (o) => ktEp.playerStats(playerId!, o));

/** Head-to-head across the games both sat in (the domain's headToHead, plus both players). */
export const useKtHeadToHead = (a: string | null, b: string | null): KtBoard<KtHeadToHeadResp> =>
  useBoard(a && b && a !== b ? `kt:vs:${a}:${b}` : null, (o) => ktEp.vs(a!, b!, o));

/** The newest 200 games a player sat in (summaries; open one with fetchKtGame from ./engine). */
export const useKtPlayerGames = (playerId: string | null): KtBoard<KtGameSummary[]> =>
  useBoard(playerId && `kt:games:${playerId}`, (o) =>
    ktEp.playerGames(playerId!, null, o).then((p) => p.items),
  );
