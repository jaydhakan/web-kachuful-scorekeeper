/** The API's shapes as built (the backend's HANDOFF.md §6.2). Times are epoch ms, ids UUID strings. */
import type { Game, Trump, Wrapped } from '@/domain';

export type Role = 'admin' | 'member';

export interface User {
  id: string;
  email: string;
  role: Role;
  playerId: string | null;
  createdAt: number;
}

export interface Player {
  id: string;
  displayName: string;
  /** Identifies the person; null unless you are the admin, its creator or its linked user. */
  email: string | null;
  /** `/api/players/{id}/photo?v=<rev>`: public, and a new photo always gets a new URL. */
  photoUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  emoji: string;
  color: string;
  createdBy: string | null;
  linkedUserId: string | null;
  mergedInto: string | null;
  createdAt: number;
  updatedAt: number;
}

/** A player as everyone may see it: `email` is always null. */
export interface PlayerSummary extends Player {
  games: number;
  lastPlayedAt: number | null;
  createdByName: string;
}

export interface NewPlayer {
  id: string;
  displayName: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  emoji: string;
  color: string;
}

/** GET /api/players/check: only a full name + email match names a player. */
export type PlayerCheck =
  | { status: 'match'; player: PlayerSummary }
  | { status: 'email_taken' | 'name_taken' | 'new'; player: null };

export interface GameSummary {
  id: string;
  /** `id` is null in public responses. */
  owner: { id: string | null; name: string };
  createdAt: number;
  /** The server's change time: what `updatedSince` compares with. */
  updatedAt: number;
  endedAt: number | null;
  status: Game['status'];
  players: {
    playerId: string;
    name: string;
    emoji: string;
    color: string;
    photoUrl: string | null;
    points: number;
    place: number | null;
  }[];
  rounds: number;
  lengthMode: Game['lengthMode'];
  live: boolean;
}

/** A game deleted since `updatedSince`. */
export interface Tombstone {
  id: string;
  deleted: true;
  updatedAt: number;
}

export const isTombstone = (g: GameSummary | Tombstone): g is Tombstone =>
  'deleted' in g && g.deleted;

export interface Achievement {
  id: string;
  code: string;
  playerId: string;
  gameId: string | null;
  roundIndex: number | null;
  period: string | null;
  earnedAt: number;
  data: Record<string, unknown>;
}

export interface MadeOf {
  made: number;
  total: number;
}

export interface PlayerStats {
  points: number;
  rounds: number;
  made: number;
  missed: number;
  accuracy: number;
  avgPerRound: number;
  games: number;
  gamesEnded: number;
  wins: number;
  winRate: number;
  places: { 1: number; 2: number; 3: number };
  bestRound: number | null;
  worstRound: number | null;
  longestHot: number;
  longestCold: number;
  hookHits: number;
  bestGame: GameSummary | null;
  bidHistogram: Record<string, MadeOf>;
  byCards: Record<string, MadeOf>;
  byTrump: Partial<Record<Trump, MadeOf>>;
  asDealer: { rounds: number; made: number };
}

export interface HeadToHead {
  a: PlayerSummary;
  b: PlayerSummary;
  games: number;
  aAhead: number;
  bAhead: number;
  ties: number;
  aPoints: number;
  bPoints: number;
  lastGames: GameSummary[];
  biggestWin: { by: number; game: GameSummary; winner: string } | null;
}

export interface LeaderboardRow {
  rank: number | null;
  qualified: boolean;
  player: PlayerSummary;
  value: number;
  points: number;
  games: number;
  rounds: number;
  wins: number;
  accuracy: number;
  longestHot: number;
  rankDelta: number | null;
}

export interface Leaderboard {
  rows: LeaderboardRow[];
  minRounds: number;
  generatedAt: number;
}

export interface AwardRow {
  code: string;
  player: PlayerSummary;
  value: number;
  /** Only for `day_bang` and `day_ouch`. */
  gameId: string | null;
  roundIndex: number | null;
}

export interface Daily {
  date: string;
  final: boolean;
  awards: AwardRow[];
}

export interface SeasonResp {
  season: string;
  final: boolean;
  standings: LeaderboardRow[];
  awards: AwardRow[];
}

export interface Activity {
  id: number;
  kind: 'achievement' | 'game_finished' | 'season_closed' | 'player_joined';
  player: PlayerSummary | null;
  game: GameSummary | null;
  data: Record<string, unknown>;
  createdAt: number;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface Bootstrap {
  user: User;
  player: Player | null;
  players: Player[];
  myGames: GameSummary[];
  myAchievements: Achievement[];
  dataVersion: number;
}

/** An account, or (with `user` null) an invite nobody has accepted yet. Invite links aren't kept: invite again. */
export interface AdminUserRow {
  user: User | null;
  player: Player | null;
  active: boolean;
  lastSeenAt: number | null;
  invite: { email: string; expiresAt: number } | null;
}

/** The game on the wire: the app's Game as it is. The server keys it by `syncId`, else `id`. */
export type WireGame = Omit<Game, 'syncId'> & { syncId?: string };

export interface PutGameResp {
  rev: number;
  earned: Achievement[];
  remap?: Record<string, string>;
}

export interface LiveResp {
  game: WireGame;
  summary: GameSummary;
  updatedAt: number;
  scorerSeenAt: number | null;
}

export interface RecapResp {
  game: WireGame;
  summary: GameSummary;
  achievements: Achievement[];
}

/** GET /api/wrapped/{year}/{playerId}: the app's own Wrapped, with summaries of the people in it. */
export type WrappedResp = Omit<Wrapped, 'totals' | 'nemesis' | 'partner'> & {
  player: PlayerSummary;
  totals: PlayerStats;
  nemesis: (NonNullable<Wrapped['nemesis']> & { player: PlayerSummary }) | null;
  partner: (NonNullable<Wrapped['partner']> & { player: PlayerSummary }) | null;
};

export interface AdminOverview {
  users: number;
  players: number;
  games: number;
  rounds: number;
  lastBackupAt: number | null;
}
