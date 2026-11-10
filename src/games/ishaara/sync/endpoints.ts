import { API, ApiError, call, del, get, post, type CallOpts } from '@/sync/api';
import type { Page } from '@/sync/types';
import type { IshaaraSort } from '../domain';
import type {
  CreateIshaara,
  IshaaraActionBody,
  IshaaraErrorReason,
  IshaaraGameOut,
  IshaaraKeyOut,
  IshaaraLeaderboardOut,
  IshaaraListQuery,
  IshaaraPeriod,
  IshaaraPlayerStatsOut,
  IshaaraSummaryOut,
  IshaaraVsOut,
  RematchBody,
} from './types';

const IS = '/ishaara';
const enc = encodeURIComponent;

/** One function per Ishaara route (backend-requests.md §3); writes carry the CSRF header through api.ts. */
export const ishEp = {
  create: (b: CreateIshaara) => post<IshaaraGameOut>(`${IS}/games`, b),
  game: (id: string, o?: CallOpts) => get<IshaaraGameOut>(`${IS}/games/${enc(id)}`, {}, o),
  key: (id: string, o?: CallOpts) => get<IshaaraKeyOut>(`${IS}/games/${enc(id)}/key`, {}, o),
  act: (id: string, body: IshaaraActionBody) =>
    post<IshaaraGameOut>(`${IS}/games/${enc(id)}/actions`, body),
  games: (q: IshaaraListQuery = {}, o?: CallOpts) =>
    get<Page<IshaaraSummaryOut>>(`${IS}/games`, { ...q }, o),
  deleteGame: (id: string) => del(`${IS}/games/${enc(id)}`),
  rematch: (id: string, b: RematchBody) =>
    post<IshaaraGameOut>(`${IS}/games/${enc(id)}/rematch`, b),

  leaderboard: (period: IshaaraPeriod, sort: IshaaraSort, o?: CallOpts) =>
    call<IshaaraLeaderboardOut>(
      'GET',
      `${IS}/leaderboard?period=${period}&sort=${sort}`,
      undefined,
      o,
    ),
  playerStats: (id: string, o?: CallOpts) =>
    call<IshaaraPlayerStatsOut>('GET', `${IS}/players/${enc(id)}/stats`, undefined, o),
  vs: (a: string, b: string, o?: CallOpts) =>
    call<IshaaraVsOut>('GET', `${IS}/players/${enc(a)}/vs/${enc(b)}`, undefined, o),
};

/** The live stream's URL (read by events.ts). */
export const eventsUrl = (id: string) => `${API}${IS}/games/${enc(id)}/events`;

/** The current game an action error carries (409 stale, 403 not_your_turn, 422 invalid_action), if any. */
export function gameOfError(e: unknown): IshaaraGameOut | null {
  if (!(e instanceof ApiError)) return null;
  const g = e.body.game as IshaaraGameOut | undefined;
  return g && typeof g === 'object' && g.game && typeof g.game.rev === 'number' ? g : null;
}

/** The domain reason of an `invalid_action` / `invalid_game` error, if any. */
export function reasonOf(e: unknown): IshaaraErrorReason | null {
  return e instanceof ApiError && typeof e.body.reason === 'string'
    ? (e.body.reason as IshaaraErrorReason)
    : null;
}
