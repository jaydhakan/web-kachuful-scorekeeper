import type { Activity } from '../../../src/sync/types';
import type { KtGame } from '../../../src/games/kaali-teeri/domain/index';
import type {
  Award,
  Earned,
  PlayerGameFact,
  SeasonResult,
  WinRateRow,
} from '../../../src/progression/types';
/** What a game's mock reads from the shared in-memory server: the rest it keeps in its own module. */
export interface MockCtx {
  tz: string;
  /** The live player id a merged-away id now points to. */
  resolve: (id: string) => string;
  /** Kaali Teeri's stored games, not deleted (they live in server.ts). */
  ktGames: () => KtGame[];
}

/**
 * One game's progression as the mock serves it, worked out from its stored games on every request. The server adds
 * row ids, player summaries and `gameKind`; an empty mock answers with empty lists, days and seasons.
 */
export interface GameMock {
  /** Games a month needs before a player is ranked. */
  minGames: number;
  achievements(ctx: MockCtx): Earned[];
  /** Each ladder's count for one player, by the game's ladder ids. */
  ladders(ctx: MockCtx, playerId: string): Record<string, number>;
  daily(ctx: MockCtx, date: string): Award[];
  season(ctx: MockCtx, month: string): SeasonResult<WinRateRow>;
  /** Months with a finished game, newest first. */
  months(ctx: MockCtx): string[];
  /** The game's own feed items (a finished game, say), newest first. */
  activity?(ctx: MockCtx): Omit<Activity, 'id'>[];
  /** Every seat of every finished game (resolved ids), for medals, the Sitara and places (backend-requests §1). */
  facts?(ctx: MockCtx): PlayerGameFact[];
}

/** A game with nothing to show yet. */
export const emptyMock = (minGames: number): GameMock => ({
  minGames,
  achievements: () => [],
  ladders: () => ({}),
  daily: () => [],
  season: (_ctx, month) => ({ season: month, standings: [], awards: [] }),
  months: () => [],
});
