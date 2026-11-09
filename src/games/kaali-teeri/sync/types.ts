import type { KtGame, KtPlayerStats, KtHeadToHead } from '@/games/kaali-teeri/domain';
import type { PlayerSummary, Tombstone } from '@/sync/types';

/** The /api/kaali-teeri/* shapes as built (backend app/schemas/kaali_teeri.py). Times are epoch ms. */

/** The game as uploaded: the app's KtGame, every seat with its registry id. */
export type KtWireGame = KtGame;

/** `PUT /api/kaali-teeri/games/{id}`: `earned` is always empty (no achievements yet). */
export interface KtPutResp {
  rev: number;
  earned: unknown[];
  remap?: Record<string, string> | null;
}

export interface KtSummaryPlayer {
  playerId: string | null;
  name: string;
  emoji: string;
  color: string;
  photoUrl: string | null;
  points: number;
  /** Null until the game is finished. */
  place: number | null;
}

/** A game in lists, read from the server's summary (never the payload). */
export interface KtGameSummary {
  id: string;
  kind: 'kaali-teeri';
  /** `id` is null in public responses. */
  owner: { id: string | null; name: string };
  createdAt: number;
  finishedAt: number | null;
  /** The server's change time: what `updatedSince` compares with. */
  updatedAt: number;
  status: KtGame['status'];
  /** Done hands. */
  hands: number;
  length: KtGame['rules']['length'];
  players: KtSummaryPlayer[];
  live: boolean;
}

export interface KtGameDetail {
  game: KtWireGame;
  summary: KtGameSummary;
}

export interface KtBootstrap {
  myGames: KtGameSummary[];
  dataVersion: number;
}

export type KtPeriod = 'today' | 'week' | 'season' | 'all';
export type KtSort = 'points' | 'wins' | 'made';

export interface KtLeaderboardRow {
  /** Null when unranked (made % with no hands bid). */
  rank: number | null;
  player: PlayerSummary;
  /** The sorted value: points, wins or made % (0–1). */
  value: number;
  points: number;
  games: number;
  wins: number;
  handsBid: number;
  bidsMade: number;
  madeRate: number | null;
}

export interface KtLeaderboard {
  period: KtPeriod;
  sort: KtSort;
  rows: KtLeaderboardRow[];
  generatedAt: number;
}

/** `GET /api/kaali-teeri/players/{id}/stats`: the domain's playerStats over every game on the server. */
export type KtStatsResp = KtPlayerStats;

/** `GET /api/kaali-teeri/players/{a}/vs/{b}`: the domain's headToHead, with both players. */
export interface KtHeadToHeadResp extends KtHeadToHead {
  a: PlayerSummary;
  b: PlayerSummary;
}

export type KtListItem = KtGameSummary | Tombstone;

/** Public live and recap bodies carry the game's kind; a Kaali Teeri link carries a KtGame. */
export interface KtLiveResp {
  kind: 'kaali-teeri';
  game: KtWireGame;
  summary: KtGameSummary;
  updatedAt: number;
  scorerSeenAt: number | null;
  reactions?: boolean;
  recapToken?: string | null;
}

export interface KtRecapResp {
  kind: 'kaali-teeri';
  game: KtWireGame;
  summary: KtGameSummary;
  achievements: unknown[];
}
