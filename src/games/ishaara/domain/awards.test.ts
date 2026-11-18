import { describe, expect, it } from 'vitest';
import type { WinRateRow } from '../../../progression/types';
import { dailyAwards, seasonAwards, type IshDayGame, type IshPlayRow } from './awards';

const T = Date.UTC(2026, 10, 3, 12);

function row(gameId: string, playerId: string, o: Partial<IshPlayRow> = {}): IshPlayRow {
  return {
    gameId,
    playerId,
    team: 'sun',
    role: 'guesser',
    won: false,
    wordsFound: 0,
    cluesGiven: 0,
    trapHit: false,
    finishedAt: T,
    ...o,
  };
}
const game = (gameId: string, o: Partial<IshDayGame> = {}): IshDayGame => ({
  gameId,
  endedBy: 'all-found',
  startedAt: T - 600e3,
  finishedAt: T,
  ...o,
});
const of = (awards: ReturnType<typeof dailyAwards>, code: string) =>
  awards.filter((a) => a.code === code).map((a) => [a.playerId, a.value]);

describe('daily awards', () => {
  it('Player of the Day: most wins, 2 or more, ties share', () => {
    const rows = [
      row('g1', 'a', { won: true }),
      row('g2', 'a', { won: true }),
      row('g1', 'b', { won: true }),
      row('g2', 'b', { won: true }),
      row('g3', 'c', { won: true }),
    ];
    expect(of(dailyAwards(rows, []), 'day_star')).toEqual([
      ['a', 2],
      ['b', 2],
    ]);
    expect(of(dailyAwards(rows.slice(4), []), 'day_star')).toEqual([]);
  });

  it('Clue-giver of the Day: most cards found per clue as clue-giver, 4+ clues', () => {
    const rows = [
      row('g1', 'a', { role: 'clue-giver', cluesGiven: 3, wordsFound: 9 }),
      row('g2', 'a', { role: 'clue-giver', cluesGiven: 3, wordsFound: 6 }),
      row('g1', 'b', { role: 'clue-giver', cluesGiven: 5, wordsFound: 8 }),
      // Plenty found, but only as a guesser, and too few clues.
      row('g3', 'c', { role: 'guesser', wordsFound: 9 }),
      row('g4', 'd', { role: 'clue-giver', cluesGiven: 3, wordsFound: 9 }),
    ];
    expect(of(dailyAwards(rows, []), 'day_giver')).toEqual([['a', 2.5]]);
  });

  it('Fastest Win: the winning team of the quickest all-found game; resign and trap wins don’t count', () => {
    const rows = [
      row('g1', 'a', { won: true }),
      row('g1', 'b', { won: true }),
      row('g1', 'c'),
      row('g2', 'c', { won: true }),
      row('g3', 'd', { won: true }),
    ];
    const games = [
      game('g1', { startedAt: T - 300e3 }),
      game('g2', { startedAt: T - 400e3 }),
      game('g3', { endedBy: 'resign', startedAt: T - 10e3 }),
    ];
    expect(of(dailyAwards(rows, games), 'day_speed')).toEqual([
      ['a', 300e3],
      ['b', 300e3],
    ]);
    expect(of(dailyAwards(rows, [game('g1', { startedAt: null })]), 'day_speed')).toEqual([]);
  });

  it('Trap Magnet: most games whose team hit the trap, guessers only', () => {
    const rows = [
      row('g1', 'a', { trapHit: true }),
      row('g1', 'b', { trapHit: true, role: 'clue-giver' }),
      row('g2', 'a', { trapHit: true }),
      row('g2', 'c', { trapHit: true }),
    ];
    expect(of(dailyAwards(rows, []), 'day_trapped')).toEqual([['a', 2]]);
    expect(of(dailyAwards([row('g1', 'a')], []), 'day_trapped')).toEqual([]);
  });

  it('Grinder: most games played', () => {
    const rows = [row('g1', 'a'), row('g2', 'a'), row('g1', 'b')];
    expect(of(dailyAwards(rows, []), 'day_grinder')).toEqual([['a', 2]]);
  });

  it('a day without games has no awards', () => {
    expect(dailyAwards([], [])).toEqual([]);
  });
});

const standing = (
  playerId: string,
  rank: number | null,
  value: number,
  games: number,
): WinRateRow => ({
  playerId,
  rank,
  qualified: rank !== null,
  value,
  games,
  wins: Math.round(value * games),
});

describe('season awards', () => {
  it('the podium, Clue-giver of the Month (20+ clues), Iron Player among the qualified, and the Climber', () => {
    const now = [
      standing('a', 1, 0.75, 8),
      standing('b', 2, 0.6, 10),
      standing('c', 3, 0.5, 12),
      standing('d', null, 1, 20),
    ];
    const last = [standing('c', 1, 0.8, 10), standing('b', 4, 0.2, 10)];
    const rows = [
      row('g1', 'a', { role: 'clue-giver', cluesGiven: 19, wordsFound: 57 }),
      row('g2', 'b', { role: 'clue-giver', cluesGiven: 20, wordsFound: 30 }),
      row('g3', 'c', { role: 'clue-giver', cluesGiven: 25, wordsFound: 30 }),
    ];
    expect(seasonAwards(now, last, rows).map((x) => [x.code, x.playerId, x.value])).toEqual([
      ['season_champion', 'a', 0.75],
      ['season_runner_up', 'b', 0.6],
      ['season_third', 'c', 0.5],
      ['season_giver', 'b', 1.5],
      ['season_iron', 'c', 12],
      ['season_climber', 'b', 2],
    ]);
  });

  it('a month nobody qualified for has no places', () => {
    expect(seasonAwards([standing('a', null, 1, 3)], [], [])).toEqual([]);
  });
});
