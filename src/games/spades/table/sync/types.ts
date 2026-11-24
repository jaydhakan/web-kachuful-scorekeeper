import type { GameStatus } from '@/sync/types';
import type { SpGame, SpResult, TeamId } from '@/games/spades/domain/types';
import type { PlayerSummary, Tombstone } from '@/sync/types';
import type { SpPeriod, SpSort, SpTotals } from '../../domain/boards';

/** The /api/spades/* table-mode shapes as built (backend app/schemas/spades.py). Times are epoch ms. */

export type { SpPeriod, SpSort, SpTotals };

/** The game as uploaded: the app's SpGame, every seat with its registry id. */
export type SpWireGame = SpGame;

/**
 * `PUT /api/spades/games/{id}`: `earned` is what the upload added; the app doesn't read it (the hand summary works its
 * moments out itself).
 */
export interface SpPutResp {
  rev: number;
  earned: unknown[];
  remap?: Record<string, string> | null;
  /** Titles, bounties and milestones this write moved (backend-requests §1, §6); left out by an older server. */
  status?: GameStatus;
}

export interface SpSummaryPlayer {
  playerId: string | null;
  name: string;
  emoji: string;
  color: string;
  photoUrl: string | null;
  /** a for seats 0 and 2, b for seats 1 and 3. */
  team: TeamId;
}

/** A table-mode game in lists, read from the server's summary (never the payload). */
export interface SpGameSummary {
  id: string;
  kind: 'spades';
  /** `id` is null in public responses. */
  owner: { id: string | null; name: string };
  createdAt: number;
  /** Once finished or cancelled (the app's finishedAt). */
  finishedAt: number | null;
  /** The server's change time: what `updatedSince` compares with. */
  updatedAt: number;
  status: SpGame['status'];
  /** Done hands. */
  hands: number;
  /** rules.target; null is Endless. */
  target: number | null;
  players: SpSummaryPlayer[];
  /** Both teams' totals over the done hands, bag penalties included. */
  scores: Record<TeamId, number>;
  /** Null unless finished (a cancelled game has none). */
  result: SpResult | null;
  live: boolean;
}

/**
 * An online table in a player's games (backend SpTableSummaryOut), only as far as this side reads it; the online
 * screens own the full shape.
 */
export interface SpTableListItem {
  id: string;
  kind: 'spades-online';
  createdAt: number;
  updatedAt: number;
  finishedAt: number | null;
  seats: ({
    playerId: string;
    name: string;
    emoji: string;
    color: string;
    photoUrl?: string | null;
  } | null)[];
}

export interface SpGameDetail {
  game: SpWireGame;
  summary: SpGameSummary;
}

export interface SpBootstrap {
  myGames: SpGameSummary[];
  dataVersion: number;
}

export interface SpLeaderboardRow extends SpTotals {
  /** Null when unranked: rate needs 3 games, made a bid. */
  rank: number | null;
  player: PlayerSummary;
  /** The sorted value: wins, win rate or made rate (0–1). */
  value: number;
}

/** Two partners' record together. */
export interface SpPair {
  a: PlayerSummary;
  b: PlayerSummary;
  games: number;
  wins: number;
  draws: number;
  winRate: number;
}

/** `GET /api/spades/leaderboard`: both kinds, by the day (APP_TZ) a game finished. */
export interface SpLeaderboard {
  period: SpPeriod;
  sort: SpSort;
  rows: SpLeaderboardRow[];
  /** The best partner pairs (top 20). */
  pairs: SpPair[];
  generatedAt: number;
}

export interface SpPartner {
  playerId: string;
  games: number;
  wins: number;
  winRate: number;
}

/** `GET /api/spades/players/{id}/stats`: all time, both kinds. */
export interface SpStatsResp extends SpTotals {
  /** Best team score in a finished game. */
  bestScore: number | null;
  /** Most games together first. */
  partners: SpPartner[];
}

/** `GET /api/spades/players/{a}/vs/{b}`: finished games both had a result in. */
export interface SpHeadToHeadResp {
  a: PlayerSummary;
  b: PlayerSummary;
  games: number;
  together: number;
  togetherWins: number;
  against: number;
  aWins: number;
  bWins: number;
  draws: number;
}

export type SpListItem = SpGameSummary | Tombstone;
/** `GET /api/spades/players/{id}/games`: both kinds, `kind` tells. */
export type SpPlayerGame = SpGameSummary | SpTableListItem;

/** Public live and recap bodies carry the game's kind; a table-mode Spades link carries an SpGame. */
export interface SpLiveResp {
  kind: 'spades';
  game: SpWireGame;
  summary: SpGameSummary;
  updatedAt: number;
  scorerSeenAt: number | null;
  reactions?: boolean;
  recapToken?: string | null;
}

export interface SpRecapResp {
  kind: 'spades';
  game: SpWireGame;
  summary: SpGameSummary;
  achievements: unknown[];
}
