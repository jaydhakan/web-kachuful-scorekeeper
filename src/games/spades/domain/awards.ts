/**
 * Spades' daily awards and monthly seasons (plan §3). A day or month counts the games that finished in it, as the
 * boards do; seasons rank on win rate from SEASON_MIN_GAMES games. Ties share; nobody passing a minimum gets nothing.
 * Pure, with relative imports; the backend mirrors it in app/domain/spades/awards.py.
 */
import { best } from '../../../progression/awards';
import { winRateSeason } from '../../../progression/rules';
import type { Award, SeasonResult, WinRateRow } from '../../../progression/types';
import { dayRange, monthOf, monthRange } from '../../../progression/zone';
import { gameAchievements, playerFacts } from './achievements';
import { allFacts, type SpFact } from './boards';
import type { SpGame } from './types';

export const SEASON_MIN_GAMES = 10;
const DAY_SHARP_BIDS = 5;
const SEASON_SHARP_BIDS = 40;
const SEASON_PAIR_GAMES = 6;

const endOf = (g: SpGame) => g.finishedAt ?? g.updatedAt;
const finished = (g: SpGame) => g.status === 'finished' && !!g.result;

/** Each player's sum of something over their rows. */
function sums(rows: readonly SpFact[], of: (r: SpFact) => number): [string, number][] {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.player, (m.get(r.player) ?? 0) + of(r));
  return [...m];
}

/** Bids made over bids, for players with at least `min` bids. */
function madeRates(rows: readonly SpFact[], min: number): [string, number][] {
  const bids = new Map(sums(rows, (r) => r.tally.bids));
  return sums(rows, (r) => r.tally.bidsMade)
    .filter(([p]) => bids.get(p)! >= min)
    .map(([p, made]) => [p, made / bids.get(p)!]);
}

const nilsMade = (r: SpFact) => r.tally.nilsMade + r.tally.blindNilsMade;

/** Games and wins of each pair of partners (seated together at the end), keyed both ways round. */
function pairs(rows: readonly SpFact[]): Map<string, { games: number; wins: number }> {
  const m = new Map<string, { games: number; wins: number }>();
  for (const r of rows) {
    if (!r.result || !r.partner) continue;
    const k = `${r.player}|${r.partner}`;
    const p = m.get(k) ?? { games: 0, wins: 0 };
    p.games++;
    p.wins += +(r.result === 'win');
    m.set(k, p);
  }
  return m;
}

/** Each player's best value over their pairs: a pair's best is then exactly its two players' best. */
function bestPair(
  rows: readonly SpFact[],
  value: (p: { games: number; wins: number }) => number | null,
): [string, number][] {
  const m = new Map<string, number>();
  for (const [k, p] of pairs(rows)) {
    const v = value(p);
    const who = k.split('|')[0];
    if (v !== null) m.set(who, Math.max(m.get(who) ?? -Infinity, v));
  }
  return [...m];
}

/** How often each player earned a moment in these games. */
function momentCounts(games: readonly SpGame[], code: string, tz?: string): [string, number][] {
  const m = new Map<string, number>();
  for (const e of games.flatMap((g) => gameAchievements(g, tz)))
    if (e.code === code) m.set(e.playerId, (m.get(e.playerId) ?? 0) + 1);
  return [...m];
}

/** A 'YYYY-MM-DD' day's awards, over the games that finished that day (`tz`, else the device's zone). */
export function dailyAwards(games: readonly SpGame[], day: string, tz?: string): Award[] {
  const [from, to] = dayRange(day, tz);
  const inDay = games.filter((g) => finished(g) && endOf(g) >= from && endOf(g) < to);
  const rows = allFacts(inDay);
  const bostons = momentCounts(inDay, 'boston', tz).sort(([a], [b]) => (a < b ? -1 : 1));
  return [
    ...best(
      bestPair(rows, (p) => p.wins),
      'day_pair',
      1,
      (v) => v >= 2,
    ),
    ...best(madeRates(rows, DAY_SHARP_BIDS), 'day_sharp'),
    ...best(sums(rows, nilsMade), 'day_nil', 1, (v) => v >= 1),
    ...best(momentCounts(inDay, 'set_them', tz), 'day_setter', 1, (v) => v >= 2),
    ...bostons.map(([playerId, value]) => ({ code: 'day_boston', playerId, value })),
    ...best(
      sums(rows, (r) => r.tally.bags),
      'day_bags',
      1,
      (v) => v >= 5,
    ),
    ...best(
      sums(rows, (r) => r.tally.hands),
      'day_grinder',
      1,
      (v) => v > 0,
    ),
  ];
}

/** A 'YYYY-MM' month: win-rate standings, the podium, its own awards and the climber, in catalogue order. */
export function spSeason(
  games: readonly SpGame[],
  month: string,
  tz?: string,
): SeasonResult<WinRateRow> {
  const rows = allFacts(games);
  const base = winRateSeason(playerFacts(rows), month, SEASON_MIN_GAMES, tz);
  const [from, to] = monthRange(month, tz);
  const inMonth = rows.filter((r) => r.endedAt >= from && r.endedAt < to);
  const qualified = base.standings.filter((r) => r.qualified);
  return {
    ...base,
    awards: [
      ...base.awards.filter((a) => a.code !== 'season_climber'),
      ...best(madeRates(inMonth, SEASON_SHARP_BIDS), 'season_sharpest'),
      ...best(sums(inMonth, nilsMade), 'season_nil', 1, (v) => v >= 1),
      ...best(
        bestPair(inMonth, (p) => (p.games >= SEASON_PAIR_GAMES ? p.wins / p.games : null)),
        'season_pair',
        1,
        (v) => v > 0,
      ),
      ...best(
        qualified.map((r) => [r.playerId, r.games]),
        'season_iron',
      ),
      ...base.awards.filter((a) => a.code === 'season_climber'),
    ],
  };
}

/** Months with a finished game, newest first (`tz`, else the device's zone). */
export const playedMonths = (games: readonly SpGame[], tz?: string): string[] =>
  [...new Set(games.filter(finished).map((g) => monthOf(endOf(g), tz)))].sort().reverse();
