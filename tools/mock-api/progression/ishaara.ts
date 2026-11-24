import {
  careerAchievements,
  gameAchievements,
  gameFacts,
  ladderCounts,
  type IshCareerRow,
} from '../../../src/games/ishaara/domain/achievements';
import {
  dailyAwards,
  SEASON_MIN_GAMES,
  seasonAwards,
  type IshDayGame,
  type IshPlayRow,
} from '../../../src/games/ishaara/domain/awards';
import { playerRows } from '../../../src/games/ishaara/domain/stats';
import type { IshaaraPublic } from '../../../src/games/ishaara/domain/types';
import { winRateStandings } from '../../../src/progression/rules';
import type { Earned, PlayerGameFact } from '../../../src/progression/types';
import { dayRange, monthOf, monthRange, prevMonth } from '../../../src/progression/zone';
import { ishaaraFinished, ishaaraSummaryOf } from '../ishaara';
import type { GameMock, MockCtx } from './kit';

const endOf = (g: IshaaraPublic) => g.finishedAt ?? g.updatedAt;

/** Every seat of every finished game, as the server's ishaara_game_players holds them. */
function rows(ctx: MockCtx): IshPlayRow[] {
  return ishaaraFinished().flatMap((g) =>
    playerRows(g).map((r) => ({
      gameId: g.id,
      playerId: ctx.resolve(r.playerId),
      team: r.team,
      role: r.role,
      won: r.won,
      wordsFound: r.wordsFound,
      cluesGiven: r.cluesGiven,
      trapHit: r.trapHit,
      finishedAt: endOf(g),
    })),
  );
}

const careerRows = (ctx: MockCtx): IshCareerRow[] =>
  rows(ctx).map((r) => ({
    gameId: r.gameId,
    playerId: r.playerId,
    finishedAt: r.finishedAt,
    won: r.won,
    role: r.role,
    wordsFound: r.wordsFound,
    cluesGiven: r.cluesGiven,
  }));

const facts = (ctx: MockCtx): PlayerGameFact[] =>
  rows(ctx).map((r) => ({
    gameId: r.gameId,
    playerId: r.playerId,
    endedAt: r.finishedAt,
    place: r.won ? 1 : 2,
    won: r.won,
  }));

function earned(ctx: MockCtx): Earned[] {
  const games = ishaaraFinished().flatMap((g) => {
    const f = gameFacts(g);
    return f ? gameAchievements(f, ctx.tz) : [];
  });
  const all = [...games, ...careerAchievements(careerRows(ctx))];
  return all.map((e) => ({ ...e, playerId: ctx.resolve(e.playerId) }));
}

const within = <T extends { finishedAt: number }>(xs: T[], [from, to]: [number, number]) =>
  xs.filter((x) => x.finishedAt >= from && x.finishedAt < to);

function standings(ctx: MockCtx, month: string) {
  const [from, to] = monthRange(month, ctx.tz);
  return winRateStandings(facts(ctx), from, to, SEASON_MIN_GAMES);
}

/** Ishaara's achievements, awards and seasons in the mock API, worked out from its finished games on each request. */
export const ishaaraProgression: GameMock = {
  minGames: SEASON_MIN_GAMES,
  achievements: earned,
  ladders: (ctx, id) => ladderCounts(careerRows(ctx), id),
  daily(ctx, date) {
    const range = dayRange(date, ctx.tz);
    const games: IshDayGame[] = ishaaraFinished().map((g) => ({
      gameId: g.id,
      endedBy: g.endedBy as IshDayGame['endedBy'],
      startedAt: g.log[0]?.at ?? null,
      finishedAt: endOf(g),
    }));
    return dailyAwards(within(rows(ctx), range), within(games, range));
  },
  season(ctx, month) {
    const now = standings(ctx, month);
    const range = monthRange(month, ctx.tz);
    return {
      season: month,
      standings: now,
      awards: seasonAwards(now, standings(ctx, prevMonth(month)), within(rows(ctx), range)),
    };
  },
  facts,
  months: (ctx) =>
    [...new Set(ishaaraFinished().map((g) => monthOf(endOf(g), ctx.tz)))].sort().reverse(),
  // The server feeds every achievement, turn moments included.
  activity: (ctx) =>
    earned(ctx)
      .sort((a, b) => b.earnedAt - a.earnedAt)
      .map((e) => ({
        kind: 'achievement' as const,
        player: ishaaraSummaryOf(e.playerId),
        game: null,
        data: { code: e.code, ...e.data },
        createdAt: e.earnedAt,
      })),
};
