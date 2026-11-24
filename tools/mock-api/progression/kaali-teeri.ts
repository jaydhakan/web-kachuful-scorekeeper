import type { GameMock, MockCtx } from './kit';
import type { KtGame } from '../../../src/games/kaali-teeri/domain/types';
import {
  allAchievements,
  ktFacts,
  ladderCounts,
  playerGames,
} from '../../../src/games/kaali-teeri/domain/achievements';
import {
  dailyAwards,
  playedMonths,
  season,
  SEASON_MIN_GAMES,
} from '../../../src/games/kaali-teeri/domain/awards';

/** The stored games with merged-away players pointing at who they are now, as the server reseats them. */
const games = (ctx: MockCtx): KtGame[] =>
  ctx.ktGames().map((g) => ({
    ...g,
    players: g.players.map((p) => (p.playerId ? { ...p, playerId: ctx.resolve(p.playerId) } : p)),
  }));

/** Kaali Teeri's achievements, awards and seasons in the mock API: the app's own rules over the stored games. */
export const kaaliTeeriProgression: GameMock = {
  minGames: SEASON_MIN_GAMES,
  achievements: (ctx) => allAchievements(ktFacts(games(ctx)), ctx.tz),
  ladders: (ctx, id) => ladderCounts(ktFacts(games(ctx)), id),
  daily: (ctx, date) => dailyAwards(ktFacts(games(ctx)), date, ctx.tz),
  season: (ctx, month) => season(ktFacts(games(ctx)), month, ctx.tz),
  months: (ctx) => playedMonths(ktFacts(games(ctx)), ctx.tz),
  facts: (ctx) => playerGames(ktFacts(games(ctx))),
};
