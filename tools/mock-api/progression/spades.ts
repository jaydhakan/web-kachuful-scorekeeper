import {
  allAchievements,
  ladderCounts,
  tableAsGame,
} from '../../../src/games/spades/domain/achievements';
import {
  dailyAwards,
  playedMonths,
  SEASON_MIN_GAMES,
  spSeason,
} from '../../../src/games/spades/domain/awards';
import type { SpGame } from '../../../src/games/spades/domain/types';
import { spadesStored, spPlayerSummary } from '../spades';
import { spadesTablesStored } from '../spadesOnline';
import type { GameMock, MockCtx } from './kit';

/** Both kinds as one game: table-mode games and online tables, by the app's own rules. */
const games = (): SpGame[] => [...spadesStored(), ...spadesTablesStored().map(tableAsGame)];

/**
 * Spades' achievements, awards and seasons in the mock API, worked out on every request in the server's zone. The
 * feed carries achievements only (with no game summary); the real server also posts finished games.
 */
export const spadesProgression: GameMock = {
  minGames: SEASON_MIN_GAMES,
  achievements: (ctx: MockCtx) => allAchievements(games(), ctx.tz),
  ladders: (_ctx, playerId) => ladderCounts(games(), playerId),
  daily: (ctx, date) => dailyAwards(games(), date, ctx.tz),
  season: (ctx, month) => spSeason(games(), month, ctx.tz),
  months: (ctx) => playedMonths(games(), ctx.tz),
  activity: (ctx) =>
    allAchievements(games(), ctx.tz)
      .reverse()
      .map((e) => ({
        kind: 'achievement' as const,
        player: spPlayerSummary(e.playerId),
        game: null,
        data: { code: e.code, ...e.data },
        createdAt: e.earnedAt,
      })),
};
