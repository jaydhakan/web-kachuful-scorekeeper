import { Bytes, call, del, get, patch, post, put, type CallOpts } from './api';
import type {
  Achievement,
  Activity,
  AdminOverview,
  AdminUserRow,
  Bootstrap,
  Daily,
  GameSummary,
  HeadToHead,
  Leaderboard,
  LiveResp,
  NewPlayer,
  Page,
  Player,
  PlayerCheck,
  PlayerStats,
  PlayerSummary,
  PutGameResp,
  RecapResp,
  SeasonResp,
  Tombstone,
  User,
  WireGame,
  WrappedResp,
} from './types';
import type { Metric } from '@/domain';

export type PlayerEdit = Partial<
  Pick<Player, 'displayName' | 'email' | 'firstName' | 'lastName' | 'emoji' | 'color'>
>;

/** One function per endpoint in the backend's HANDOFF.md §6, typed as built. */
export const ep = {
  // §6.3 auth
  login: (email: string, password: string) =>
    post<{ user: User; player: Player | null }>('/auth/login', { email, password }),
  logout: () => post<null>('/auth/logout'),
  me: () => get<{ user: User; player: Player | null }>('/auth/me'),
  bootstrap: (o?: CallOpts) => call<Bootstrap>('GET', '/bootstrap', undefined, o),
  invite: (token: string) =>
    get<{ email: string; player: PlayerSummary | null }>(`/auth/invites/${token}`),
  /** A new player gets the invite's email whatever is sent, so it isn't sent. */
  acceptInvite: (
    token: string,
    password: string,
    player: { id: string } | Omit<NewPlayer, 'email'>,
  ) => post<{ user: User; player: Player }>(`/auth/invites/${token}`, { password, player }),
  reset: (token: string) => get<{ email: string }>(`/auth/resets/${token}`),
  acceptReset: (token: string, password: string) =>
    post<{ user: User; player: Player | null }>(`/auth/resets/${token}`, { password }),
  changePassword: (current: string, password: string) =>
    post<null>('/me/password', { current, password }),

  // §6.4 admin
  adminUsers: () => get<AdminUserRow[]>('/admin/users'),
  invitePerson: (email: string, playerId?: string) =>
    post<{ inviteUrl: string; expiresAt: number }>('/admin/invites', { email, playerId }),
  revokeInvite: (email: string) => del(`/admin/invites/${encodeURIComponent(email)}`),
  resetLink: (userId: string) =>
    post<{ resetUrl: string; expiresAt: number }>(`/admin/users/${userId}/reset-link`),
  setActive: (userId: string, active: boolean) =>
    patch<{ user: User }>(`/admin/users/${userId}`, { active }),
  merge: (id: string, intoId: string) =>
    post<{ player: Player }>(`/admin/players/${id}/merge`, { intoId }),
  overview: () => get<AdminOverview>('/admin/overview'),

  // §6.5 players and games
  players: (updatedSince?: number, cursor?: string | null) =>
    get<Page<Player>>('/players', { updatedSince, cursor, limit: 200 }),
  checkPlayer: (name: string, email: string, o?: CallOpts) =>
    get<PlayerCheck>('/players/check', { name, email }, o),
  createPlayer: (p: NewPlayer) => post<Player>('/players', p),
  patchPlayer: (id: string, p: PlayerEdit) => patch<Player>(`/players/${id}`, p),
  setPhoto: (id: string, image: Blob) =>
    put<{ photoUrl: string }>(`/players/${id}/photo`, new Bytes(image, image.type)),
  deletePhoto: (id: string) => del(`/players/${id}/photo`),
  player: (id: string, o?: CallOpts) =>
    call<{
      player: PlayerSummary;
      totals: PlayerStats;
      achievements: Achievement[];
      rank: { global: number | null; outOf: number };
    }>('GET', `/players/${id}`, undefined, o),
  playerStats: (id: string, from: number, to: number, o?: CallOpts) =>
    call<PlayerStats>('GET', `/players/${id}/stats?from=${from}&to=${to}`, undefined, o),
  playerGames: (id: string, from?: number, to?: number, cursor?: string | null) =>
    get<Page<GameSummary>>(`/players/${id}/games`, { from, to, cursor, limit: 200 }),
  calendar: (id: string, year: number, o?: CallOpts) =>
    call<{ days: Record<string, number> }>(
      'GET',
      `/players/${id}/calendar?year=${year}`,
      undefined,
      o,
    ),
  vs: (a: string, b: string, from?: number, to?: number, o?: CallOpts) =>
    call<HeadToHead>(
      'GET',
      `/players/${a}/vs/${b}${from != null && to != null ? `?from=${from}&to=${to}` : ''}`,
      undefined,
      o,
    ),

  putGame: (g: WireGame) => put<PutGameResp>(`/games/${g.syncId ?? g.id}`, g),
  games: (p: { updatedSince?: number; cursor?: string | null; mine?: boolean }) =>
    get<Page<GameSummary | Tombstone>>('/games', {
      ...p,
      mine: p.mine ? 'true' : undefined,
      limit: 200,
    }),
  game: (id: string) =>
    get<{ game: WireGame; summary: GameSummary; achievements: Achievement[] }>(`/games/${id}`),
  deleteGame: (id: string) => del(`/games/${id}`),
  link: (id: string, kind: 'live' | 'recap') =>
    post<{ token: string; url: string; qrSvgUrl: string }>(`/games/${id}/links`, { kind }),
  revokeLink: (id: string, kind: 'live' | 'recap') => del(`/games/${id}/links/${kind}`),

  // §6.6 boards
  leaderboard: (from: number, to: number, metric: Metric, o?: CallOpts) =>
    call<Leaderboard>('GET', `/leaderboard?from=${from}&to=${to}&metric=${metric}`, undefined, o),
  daily: (date: string, o?: CallOpts) =>
    call<Daily>('GET', `/awards/daily?date=${date}`, undefined, o),
  season: (month: string, o?: CallOpts) =>
    call<SeasonResp>('GET', `/seasons/${month}`, undefined, o),
  seasons: (o?: CallOpts) =>
    call<{ season: string; champion: PlayerSummary | null }[]>('GET', '/seasons', undefined, o),
  wrapped: (year: number, playerId: string, o?: CallOpts) =>
    call<WrappedResp>('GET', `/wrapped/${year}/${playerId}`, undefined, o),
  activity: (cursor?: string | null) => get<Page<Activity>>('/activity', { cursor }),
  achievements: (playerId?: string, cursor?: string | null) =>
    get<Page<Achievement>>('/achievements', { playerId, cursor, limit: 200 }),

  // §6.7 public
  live: (token: string) => get<LiveResp>(`/public/live/${token}`),
  recap: (token: string) => get<RecapResp>(`/public/recap/${token}`),
};
