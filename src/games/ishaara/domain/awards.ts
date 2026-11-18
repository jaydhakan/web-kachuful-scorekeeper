/**
 * Ishaara's daily awards and the season's own awards (plan §5), over finished games' player rows. Pure; the server
 * mirrors it (app/domain/ishaara/awards.py). Ties share; nothing is awarded when nobody passes the minimum.
 */
// Relative, because the mock API loads the domain outside Vite.
import { best } from '../../../progression/awards';
import { climber, seasonPlaces } from '../../../progression/rules';
import type { Award, WinRateRow } from '../../../progression/types';
import type { EndedBy, Role, Team } from './types';

export const SEASON_MIN_GAMES = 8;
export const DAY_GIVER_MIN_CLUES = 4;
export const SEASON_GIVER_MIN_CLUES = 20;

/** One seat of a finished (not abandoned) game: the server's ishaara_game_players row, as awards read it. */
export interface IshPlayRow {
  gameId: string;
  playerId: string;
  team: Team;
  role: Role;
  won: boolean;
  wordsFound: number;
  cluesGiven: number;
  /** The team hit the trap (every seat of the team has it). */
  trapHit: boolean;
  finishedAt: number;
}

/** One finished game of the day: how it ended and when its first clue was given (null without one). */
export interface IshDayGame {
  gameId: string;
  endedBy: Exclude<EndedBy, 'abandoned'>;
  startedAt: number | null;
  finishedAt: number;
}

const tally = (rows: readonly IshPlayRow[], f: (r: IshPlayRow) => number): [string, number][] => {
  const by = new Map<string, number>();
  for (const r of rows) by.set(r.playerId, (by.get(r.playerId) ?? 0) + f(r));
  return [...by];
};

/** Cards found per clue as clue-giver, for those who gave at least `min` clues. */
function perClue(rows: readonly IshPlayRow[], min: number): [string, number][] {
  const by = new Map<string, { found: number; clues: number }>();
  for (const r of rows) {
    if (r.role !== 'clue-giver') continue;
    const x = by.get(r.playerId) ?? { found: 0, clues: 0 };
    x.found += r.wordsFound;
    x.clues += r.cluesGiven;
    by.set(r.playerId, x);
  }
  return [...by].filter(([, x]) => x.clues >= min).map(([id, x]) => [id, x.found / x.clues]);
}

/** Each winner's quickest all-found win, first clue to last card, in ms. */
function quickest(rows: readonly IshPlayRow[], games: readonly IshDayGame[]): [string, number][] {
  const took = new Map<string, number>();
  for (const g of games)
    if (g.endedBy === 'all-found' && g.startedAt !== null)
      took.set(g.gameId, g.finishedAt - g.startedAt);
  const by = new Map<string, number>();
  for (const r of rows) {
    const ms = took.get(r.gameId);
    if (r.won && ms !== undefined) by.set(r.playerId, Math.min(by.get(r.playerId) ?? Infinity, ms));
  }
  return [...by];
}

/** One day's awards from the rows and games that finished that day. */
export function dailyAwards(rows: readonly IshPlayRow[], games: readonly IshDayGame[]): Award[] {
  return [
    ...best(
      tally(rows, (r) => (r.won ? 1 : 0)),
      'day_star',
      1,
      (v) => v >= 2,
    ),
    ...best(perClue(rows, DAY_GIVER_MIN_CLUES), 'day_giver', 1, (v) => v > 0),
    ...best(quickest(rows, games), 'day_speed', -1),
    ...best(
      tally(rows, (r) => (r.role === 'guesser' && r.trapHit ? 1 : 0)),
      'day_trapped',
      1,
      (v) => v >= 1,
    ),
    ...best(
      tally(rows, () => 1),
      'day_grinder',
    ),
  ];
}

/** A month's awards: the podium, the clue-giver of the month, the iron player and the climber. */
export function seasonAwards(
  standings: readonly WinRateRow[],
  last: readonly WinRateRow[],
  rows: readonly IshPlayRow[],
): Award[] {
  return [
    ...seasonPlaces(standings),
    ...best(perClue(rows, SEASON_GIVER_MIN_CLUES), 'season_giver', 1, (v) => v > 0),
    ...best(
      standings.filter((r) => r.qualified).map((r) => [r.playerId, r.games]),
      'season_iron',
    ),
    ...climber(standings, last),
  ];
}
