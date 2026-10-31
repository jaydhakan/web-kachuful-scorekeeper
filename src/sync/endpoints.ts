import { call, del, get, patch, post, put, type CallOpts } from './api';
import type {
  Achievement,
  Activity,
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
  PlayerStats,
  PlayerSummary,
  PutGameResp,
  RecapResp,
  SeasonResp,
  User,
  WireGame,
} from './types';
import type { Metric } from '@/domain';

/** One function per endpoint in plan-backend §6, typed by the contract. */
export const ep = {
  // §6.1 auth
  login: (email: string, password: string) =>
    post<{ user: User }>('/auth/login', { email, password }),
  logout: () => post<null>('/auth/logout'),
  me: () => get<{ user: User; player: Player | null }>('/auth/me'),
  bootstrap: (o?: CallOpts) => call<Bootstrap>('GET', '/bootstrap', undefined, o),
  invite: (token: string) =>
    get<{ email: string; player: PlayerSummary | null }>(`/auth/invites/${token}`),
  acceptInvite: (token: string, password: string, player: { id: string } | NewPlayer) =>
    post<{ user: User; player: Player }>(`/auth/invites/${token}`, { password, player }),
  reset: (token: string) => get<{ email: string }>(`/auth/resets/${token}`),
  acceptReset: (token: string, password: string) =>
    post<{ user: User; player: Player | null }>(`/auth/resets/${token}`, { password }),
  changePassword: (current: string, password: string) =>
    post<null>('/me/password', { current, password }),

  // §6.2 admin
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
  overview: () =>
    get<{
      users: number;
      players: number;
      games: number;
      rounds: number;
      lastBackupAt: number | null;
    }>('/admin/overview'),

  // §6.3 players
  players: (updatedSince?: number, cursor?: string | null) =>
    get<Page<Player>>('/players', { updatedSince, cursor }),
  checkPlayer: (q: { name?: string; email?: string }, o?: CallOpts) =>
    get<
      { available: true } | { available: false; field: 'name' | 'email'; existing: PlayerSummary }
    >('/players/check', q, o),
  createPlayer: (p: NewPlayer) => post<Player>('/players', p),
  patchPlayer: (
    id: string,
    p: Partial<
      Pick<Player, 'displayName' | 'email' | 'firstName' | 'lastName' | 'emoji' | 'color'>
    >,
  ) => patch<Player>(`/players/${id}`, p),
  player: (id: string) =>
    get<{
      player: PlayerSummary;
      totals: PlayerStats;
      achievements: Achievement[];
      rank: { global: number | null; outOf: number };
    }>(`/players/${id}`),
  playerStats: (id: string, from: number, to: number, o?: CallOpts) =>
    get<PlayerStats>(`/players/${id}/stats`, { from, to }, o),
  playerGames: (id: string, from?: number, to?: number, cursor?: string | null) =>
    get<Page<GameSummary>>(`/players/${id}/games`, { from, to, cursor }),
  calendar: (id: string, year: number) =>
    get<{ days: Record<string, number> }>(`/players/${id}/calendar`, { year }),
  vs: (a: string, b: string, from?: number, to?: number) =>
    get<HeadToHead>(`/players/${a}/vs/${b}`, { from, to }),

  // §6.4 games
  putGame: (g: WireGame) => put<PutGameResp>(`/games/${g.id}`, g),
  games: (p: { updatedSince?: number; cursor?: string | null; mine?: boolean }) =>
    get<Page<GameSummary>>('/games', { ...p, mine: p.mine ? 1 : undefined }),
  game: (id: string) =>
    get<{ game: WireGame; summary: GameSummary; achievements: Achievement[] }>(`/games/${id}`),
  deleteGame: (id: string) => del(`/games/${id}`),
  link: (id: string, kind: 'live' | 'recap') =>
    post<{ token: string; url: string; qrSvgUrl: string }>(`/games/${id}/links`, { kind }),
  revokeLink: (id: string, kind: 'live' | 'recap') => del(`/games/${id}/links/${kind}`),

  // §6.5 boards
  leaderboard: (from: number, to: number, metric: Metric, o?: CallOpts) =>
    call<Leaderboard>('GET', `/leaderboard?from=${from}&to=${to}&metric=${metric}`, undefined, o),
  daily: (date: string) => get<Daily>('/awards/daily', { date }),
  season: (month: string) => get<SeasonResp>(`/seasons/${month}`),
  seasons: () => get<{ season: string; champion: PlayerSummary | null }[]>('/seasons'),
  wrapped: (year: number, playerId: string) => get<unknown>(`/wrapped/${year}/${playerId}`),
  activity: (cursor?: string | null) => get<Page<Activity>>('/activity', { cursor }),
  achievements: (playerId?: string, cursor?: string | null) =>
    get<Page<Achievement>>('/achievements', { playerId, cursor }),

  // §6.6 public
  live: (token: string) => get<LiveResp>(`/public/live/${token}`),
  recap: (token: string) => get<RecapResp>(`/public/recap/${token}`),
};
