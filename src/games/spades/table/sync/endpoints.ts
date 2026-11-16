import { call, del, get, put, type CallOpts } from '@/sync/api';
import type { Page } from '@/sync/types';
import type {
  SpBootstrap,
  SpGameDetail,
  SpHeadToHeadResp,
  SpLeaderboard,
  SpListItem,
  SpLiveResp,
  SpPeriod,
  SpPlayerGame,
  SpPutResp,
  SpRecapResp,
  SpSort,
  SpStatsResp,
  SpWireGame,
} from './types';

const SP = '/spades';

/** One function per table-mode Spades endpoint, typed as built. Share links stay on /games (any kind). */
export const spEp = {
  putGame: (g: SpWireGame) => put<SpPutResp>(`${SP}/games/${g.syncId}`, g),
  games: (p: {
    updatedSince?: number;
    cursor?: string | null;
    mine?: boolean;
    /** Games this account scored or sat in. */
    involving?: boolean;
    status?: 'active';
  }) =>
    get<Page<SpListItem>>(`${SP}/games`, {
      ...p,
      mine: p.mine ? 'true' : undefined,
      involving: p.involving ? 'true' : undefined,
      limit: 200,
    }),
  game: (id: string) => get<SpGameDetail>(`${SP}/games/${id}`),
  deleteGame: (id: string) => del(`${SP}/games/${id}`),
  bootstrap: (o?: CallOpts) => call<SpBootstrap>('GET', `${SP}/bootstrap`, undefined, o),

  leaderboard: (period: SpPeriod, sort: SpSort, o?: CallOpts) =>
    call<SpLeaderboard>('GET', `${SP}/leaderboard?period=${period}&sort=${sort}`, undefined, o),
  playerStats: (id: string, o?: CallOpts) =>
    call<SpStatsResp>('GET', `${SP}/players/${id}/stats`, undefined, o),
  playerGames: (id: string, cursor?: string | null, o?: CallOpts) =>
    get<Page<SpPlayerGame>>(`${SP}/players/${id}/games`, { cursor, limit: 200 }, o),
  vs: (a: string, b: string, o?: CallOpts) =>
    call<SpHeadToHeadResp>('GET', `${SP}/players/${a}/vs/${b}`, undefined, o),

  // Public (no sign-in): the bodies say which game; a viewer checks `kind`.
  live: (token: string) => get<SpLiveResp | { kind: string }>(`/public/live/${token}`),
  recap: (token: string) => get<SpRecapResp | { kind: string }>(`/public/recap/${token}`),
};
