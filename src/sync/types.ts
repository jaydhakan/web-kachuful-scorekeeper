/** The API contract's shapes (plan-backend §6). Times are epoch ms, ids UUID strings. */
import type { Game, Trump } from '@/domain';

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

export interface PlayerSummary extends Player {
  games: number;
  lastPlayedAt: number | null;
  createdByName: string;
}

export interface NewPlayer {
  id: string;
  displayName: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emoji: string;
  color: string;
}

export interface GameSummary {
  id: string;
  owner: { id: string; name: string };
  createdAt: number;
  endedAt: number | null;
  status: Game['status'];
  players: {
    playerId: string | null;
    name: string;
    emoji: string;
    color: string;
    points: number;
    place: number | null;
  }[];
  rounds: number;
  lengthMode: Game['lengthMode'];
  live: boolean;
}

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
  biggestWin: { by: number; game: GameSummary } | null;
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
  gameId?: string;
  roundIndex?: number;
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
  id: string;
  kind: 'achievement' | 'game_finished' | 'season_closed' | 'player_joined';
  player?: PlayerSummary;
  game?: GameSummary;
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

export interface AdminUserRow {
  user: User;
  player: Player | null;
  active: boolean;
  lastSeenAt: number | null;
  invite: { expiresAt: number; url: string } | null;
}

/** The game as uploaded: the app's Game (schema 3) with the sync id as `id`. */
export type WireGame = Omit<Game, 'id' | 'syncId'> & { id: string; localId?: string };

export interface PutGameResp {
  rev: number;
  earned: Achievement[];
  remap?: Record<string, string>;
}

export interface LiveResp {
  game: WireGame;
  summary: GameSummary;
  updatedAt: number;
  scorerSeenAt: number;
}

export interface RecapResp {
  game: WireGame;
  summary: GameSummary;
  achievements: Achievement[];
}
