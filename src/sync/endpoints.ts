import { Bytes, call, del, get, patch, post, put, query, type CallOpts } from './api';
import type {
  Achievement,
  Activity,
  AdminOverview,
  AdminUserRow,
  AuthResp,
  Claim,
  CrownKind,
  CrownReign,
  CrownsResp,
  NightResp,
  NightRow,
  LinkResp,
  ReactionKind,
  DeletionPreview,
  Bootstrap,
  Daily,
  GameSeasonResp,
  LaddersResp,
  GameSummary,
  HeadToHead,
  Leaderboard,
  LiveResp,
  PlacesResp,
  MedalsResp,
  GameSikkeResp,
  SikkeEntry,
  SikkeResp,
  NewPlayer,
  MergeKeep,
  Page,
  Player,
  PlayerAlias,
  PlayerCheck,
  PlayerStats,
  PlayerSummary,
  Preferences,
  PutGameResp,
  RecapResp,
  SeasonResp,
  Tombstone,
  User,
  WireGame,
  WrappedResp,
  BazaarResp,
  Gift,
  Look,
  MilestoneOut,
  PurchaseResp,
  SavedLook,
  WardrobeResp,
} from './types';
import type { Metric } from '@/games/kachuful/domain';
import type { GameId } from '@/platform/route';

export type PlayerEdit = Partial<
  Pick<Player, 'displayName' | 'email' | 'firstName' | 'lastName' | 'emoji' | 'color'>
> & {
  /** Swaps this alias with the main name; the old main name becomes an alias. */
  mainAlias?: string;
};

/** The appearance setting as the server stores it; `updatedAt` is epoch ms. */
export interface AppearanceDto {
  theme: string;
  allowUserOverride: boolean;
  updatedAt: number | null;
  updatedBy: string | null;
}

/** `PATCH /api/me/preferences`: fields sent replace the stored ones, `null` clears one, fields left out stay. */
export type PrefsPatch = Partial<Pick<Preferences, 'theme' | 'setup'>>;

/** `?game=` names the game; Kachuful's calls leave it out, as before every game had awards (both mean Kachuful). */
const gameOf = (game?: GameId | 'all') => (game === 'kachuful' ? undefined : game);

/** One function per API endpoint, typed as built. */
export const ep = {
  // §6.3 auth
  login: (email: string, password: string) => post<AuthResp>('/auth/login', { email, password }),
  logout: () => post<null>('/auth/logout'),
  me: () => get<AuthResp>('/auth/me'),
  bootstrap: (o?: CallOpts) => call<Bootstrap>('GET', '/bootstrap', undefined, o),
  invite: (token: string) =>
    get<{ email: string; player: PlayerSummary | null }>(`/auth/invites/${token}`),
  /** A new player gets the invite's email whatever is sent, so it isn't sent. */
  acceptInvite: (
    token: string,
    password: string,
    player: { id: string } | Omit<NewPlayer, 'email'>,
  ) => post<AuthResp & { player: Player }>(`/auth/invites/${token}`, { password, player }),
  reset: (token: string) => get<{ email: string }>(`/auth/resets/${token}`),
  acceptReset: (token: string, password: string) =>
    post<AuthResp>(`/auth/resets/${token}`, { password }),
  changePassword: (current: string, password: string) =>
    post<null>('/me/password', { current, password }),

  // Appearance and preferences. Until production has them they answer 404 and the app keeps the choice on the device.
  appearance: (o?: CallOpts) => call<AppearanceDto>('GET', '/settings/appearance', undefined, o),
  setAppearance: (a: Pick<AppearanceDto, 'theme' | 'allowUserOverride'>) =>
    put<AppearanceDto>('/admin/settings/appearance', a),
  setPrefs: (p: PrefsPatch) => patch<Preferences>('/me/preferences', p),

  // §6.4 admin
  adminUsers: () => get<AdminUserRow[]>('/admin/users'),
  invitePerson: (email: string, playerId?: string) =>
    post<{ inviteUrl: string; expiresAt: number }>('/admin/invites', { email, playerId }),
  revokeInvite: (email: string) => del(`/admin/invites/${encodeURIComponent(email)}`),
  resetLink: (userId: string) =>
    post<{ resetUrl: string; expiresAt: number }>(`/admin/users/${userId}/reset-link`),
  setActive: (userId: string, active: boolean) =>
    patch<{ user: User }>(`/admin/users/${userId}`, { active }),
  merge: (id: string, intoId: string, keep?: MergeKeep) =>
    post<{ player: Player }>(`/admin/players/${id}/merge`, { intoId, ...(keep && { keep }) }),
  overview: () => get<AdminOverview>('/admin/overview'),
  deletionPreview: (userId: string) =>
    get<DeletionPreview>(`/admin/users/${userId}/deletion-preview`),
  clearUserGames: (userId: string) =>
    call<{ games: number }>('DELETE', `/admin/users/${userId}/games`).then((r) => r.data),
  deleteUser: (userId: string) => del(`/admin/users/${userId}`),

  // §6.5 players and games
  players: (updatedSince?: number, cursor?: string | null) =>
    get<Page<Player>>('/players', { updatedSince, cursor, limit: 200 }),
  checkPlayer: (name: string, email: string, o?: CallOpts) =>
    get<PlayerCheck>('/players/check', { name, email }, o),
  createPlayer: (p: NewPlayer) => post<Player>('/players', p),
  patchPlayer: (id: string, p: PlayerEdit) => patch<Player>(`/players/${id}`, p),
  addAlias: (id: string, a: PlayerAlias) => post<Player>(`/players/${id}/aliases`, a),
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
  games: (p: {
    updatedSince?: number;
    cursor?: string | null;
    mine?: boolean;
    /** Games this account scored or sat in. */
    involving?: boolean;
  }) =>
    get<Page<GameSummary | Tombstone>>('/games', {
      ...p,
      mine: p.mine ? 'true' : undefined,
      involving: p.involving ? 'true' : undefined,
      limit: 200,
    }),
  /** This account's newest unfinished game, if any. */
  activeGame: () => get<Page<GameSummary>>('/games', { status: 'active', mine: 'true', limit: 1 }),
  game: (id: string) =>
    get<{ game: WireGame; summary: GameSummary; achievements: Achievement[] }>(`/games/${id}`),
  deleteGame: (id: string) => del(`/games/${id}`),
  link: (id: string, kind: 'live' | 'recap') => post<LinkResp>(`/games/${id}/links`, { kind }),
  updateLiveLink: (id: string, settings: { reactions?: boolean; membersOnly?: boolean }) =>
    patch<LinkResp>(`/games/${id}/links/live`, settings),
  claimSeat: (gameId: string, playerId: string) =>
    post<Claim>(`/games/${gameId}/claims`, { playerId }),
  claims: () => get<{ items: Claim[] }>('/claims'),
  approveClaim: (id: string) => post<Claim>(`/claims/${id}/approve`),
  rejectClaim: (id: string) => post<Claim>(`/claims/${id}/reject`),
  revokeLink: (id: string, kind: 'live' | 'recap') => del(`/games/${id}/links/${kind}`),

  // §6.6 boards
  leaderboard: (
    from: number,
    to: number,
    metric: Metric,
    o?: CallOpts,
    q?: { minRounds?: number; minGames?: number; limit?: number },
  ) =>
    call<Leaderboard>(
      'GET',
      `/leaderboard?from=${from}&to=${to}&metric=${metric}` +
        (q?.minRounds != null ? `&minRounds=${q.minRounds}` : '') +
        (q?.minGames ? `&minGames=${q.minGames}` : '') +
        (q?.limit != null ? `&limit=${q.limit}` : ''),
      undefined,
      o,
    ),
  daily: (date: string, o?: CallOpts, game?: GameId) =>
    call<Daily>('GET', '/awards/daily' + query({ date, game: gameOf(game) }), undefined, o),
  /** Kachuful's month has points standings (`SeasonResp`); every other game's ranks on win rate. */
  season: <G extends GameId = 'kachuful'>(month: string, o?: CallOpts, game?: G) =>
    call<G extends 'kachuful' ? SeasonResp : GameSeasonResp>(
      'GET',
      `/seasons/${month}` + query({ game: gameOf(game) }),
      undefined,
      o,
    ),
  /** Kachuful's medals as they stood before `excludeGame` (the game at the table). */
  medals: (excludeGame: string, o?: CallOpts) =>
    call<MedalsResp>('GET', '/medals' + query({ excludeGame }), undefined, o),
  // Sikke (rewards plan §9)
  sikke: (id: string, o?: CallOpts) => call<SikkeResp>('GET', `/players/${id}/sikke`, undefined, o),
  sikkeEntries: (id: string, cursor: string | null) =>
    get<Page<SikkeEntry>>(`/players/${id}/sikke/entries`, { cursor, limit: 50 }),
  gameSikke: (gameId: string, o?: CallOpts) =>
    call<GameSikkeResp>('GET', `/games/${gameId}/sikke`, undefined, o),
  // Wardrobe, Bazaar, gifts and milestones (backend-requests §3–§6). Ids for writes come from the caller, so a resend never buys twice.
  wardrobe: (o?: CallOpts) => call<WardrobeResp>('GET', '/me/wardrobe', undefined, o),
  putLook: (look: Look) => put<Look>('/me/wardrobe/look', look),
  putSavedLook: (slot: number, name: string, look: Look) =>
    put<SavedLook>(`/me/wardrobe/saved/${slot}`, { name, look }),
  deleteSavedLook: (slot: number) => del(`/me/wardrobe/saved/${slot}`),
  bazaar: (o?: CallOpts) => call<BazaarResp>('GET', '/bazaar', undefined, o),
  buy: (itemId: string, v: number, purchaseId: string) =>
    post<PurchaseResp>('/bazaar/purchases', { itemId, v, purchaseId }),
  sendGift: (itemId: string, v: number, toPlayerId: string, giftId: string) =>
    post<Gift>('/gifts', { itemId, v, toPlayerId, giftId }),
  /** Unopened gifts to any of these players (up to 12), for the table device as a game starts. */
  pendingGifts: (players: string[], o?: CallOpts) =>
    get<{ items: Gift[] }>('/gifts/pending', { players: players.join(',') }, o),
  openGift: (id: string) => post<Gift>(`/gifts/${id}/open`),
  myGifts: (cursor: string | null) => get<Page<Gift>>('/me/gifts', { cursor, limit: 50 }),
  milestones: (cursor: string | null) =>
    get<Page<MilestoneOut>>('/milestones', { cursor, limit: 50 }),
  // Crowns and nights (backend-requests §6, §7)
  crowns: (o?: CallOpts) =>
    call<CrownsResp>('GET', '/crowns' + query({ game: 'kachuful' }), undefined, o),
  crownReigns: (kind: CrownKind, cursor: string | null, sort: 'recent' | 'defences' = 'recent') =>
    get<Page<CrownReign>>('/crowns/reigns', { game: 'kachuful', kind, cursor, sort }),
  nights: (playerId: string, cursor: string | null) =>
    get<Page<NightRow>>('/nights', { playerId, cursor }),
  night: (id: string, o?: CallOpts) => call<NightResp>('GET', `/nights/${id}`, undefined, o),
  closeNight: () => post<{ id: string }>('/nights/close'),
  /** Ended Kachuful games' places, without `excludeGame`, for the table intel line. */
  places: (excludeGame: string, o?: CallOpts) =>
    call<PlacesResp>('GET', '/places' + query({ excludeGame }), undefined, o),
  seasons: (o?: CallOpts, game?: GameId) =>
    call<{ season: string; champion: PlayerSummary | null }[]>(
      'GET',
      '/seasons' + query({ game: gameOf(game) }),
      undefined,
      o,
    ),
  wrapped: (year: number, playerId: string, o?: CallOpts) =>
    call<WrappedResp>('GET', `/wrapped/${year}/${playerId}`, undefined, o),
  /** `all` is every game's feed together (the Me page). */
  activity: (cursor?: string | null, game?: GameId | 'all') =>
    get<Page<Activity>>('/activity', { cursor, game: gameOf(game) }),
  achievements: (playerId?: string, cursor?: string | null, game?: GameId) =>
    get<Page<Achievement>>('/achievements', { playerId, cursor, limit: 200, game: gameOf(game) }),
  ladders: (game: GameId, playerId: string, o?: CallOpts) =>
    call<LaddersResp>('GET', '/achievements/ladders' + query({ game, playerId }), undefined, o),

  // §6.7 public
  live: (token: string) => get<LiveResp>(`/public/live/${token}`),
  react: (token: string, kind: ReactionKind) =>
    call<null>('POST', `/public/live/${token}/reactions`, { kind }).then(() => undefined),
  recap: (token: string) => get<RecapResp>(`/public/recap/${token}`),
};
