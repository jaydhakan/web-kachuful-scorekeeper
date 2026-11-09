import { call, del, get, put, type CallOpts } from '@/sync/api';
import type { Page } from '@/sync/types';
import type {
  KtBootstrap,
  KtGameDetail,
  KtGameSummary,
  KtHeadToHeadResp,
  KtLeaderboard,
  KtListItem,
  KtLiveResp,
  KtPeriod,
  KtPutResp,
  KtRecapResp,
  KtSort,
  KtStatsResp,
  KtWireGame,
} from './types';

const KT = '/kaali-teeri';

/** One function per Kaali Teeri endpoint, typed as built. Share links stay on /games (any kind). */
export const ktEp = {
  putGame: (g: KtWireGame) => put<KtPutResp>(`${KT}/games/${g.syncId}`, g),
  games: (p: {
    updatedSince?: number;
    cursor?: string | null;
    mine?: boolean;
    /** Games this account scored or sat in. */
    involving?: boolean;
    status?: 'active';
  }) =>
    get<Page<KtListItem>>(`${KT}/games`, {
      ...p,
      mine: p.mine ? 'true' : undefined,
      involving: p.involving ? 'true' : undefined,
      limit: 200,
    }),
  game: (id: string) => get<KtGameDetail>(`${KT}/games/${id}`),
  deleteGame: (id: string) => del(`${KT}/games/${id}`),
  bootstrap: (o?: CallOpts) => call<KtBootstrap>('GET', `${KT}/bootstrap`, undefined, o),

  leaderboard: (period: KtPeriod, sort: KtSort, o?: CallOpts) =>
    call<KtLeaderboard>('GET', `${KT}/leaderboard?period=${period}&sort=${sort}`, undefined, o),
  playerStats: (id: string, o?: CallOpts) =>
    call<KtStatsResp>('GET', `${KT}/players/${id}/stats`, undefined, o),
  playerGames: (id: string, cursor?: string | null, o?: CallOpts) =>
    get<Page<KtGameSummary>>(`${KT}/players/${id}/games`, { cursor, limit: 200 }, o),
  vs: (a: string, b: string, o?: CallOpts) =>
    call<KtHeadToHeadResp>('GET', `${KT}/players/${a}/vs/${b}`, undefined, o),

  // Public (no sign-in): the bodies say which game; a viewer checks `kind`.
  live: (token: string) => get<KtLiveResp | { kind: string }>(`/public/live/${token}`),
  recap: (token: string) => get<KtRecapResp | { kind: string }>(`/public/recap/${token}`),
};
