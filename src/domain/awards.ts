import { accuracyOf, leaderboard, tallies, type BoardRow } from './leaderboard';
import { profileStats, type ProfileStats } from './profile';
import { dayOf, dayRange, monthOf, monthRange } from './ranges';
import type { Facts, RoundFact } from './timeline';
import type { Trump } from './types';
import { allAchievements } from './achievements';

/** One daily or season award. */
export interface Award {
  code: string;
  playerId: string;
  value: number;
  gameId?: string;
  roundIndex?: number;
}

/** Everyone tied on the best value wins together; nothing is awarded when no value passes `ok`. */
function best(
  vals: [string, number][],
  code: string,
  dir: 1 | -1 = 1,
  ok: (v: number) => boolean = () => true,
): Award[] {
  const good = vals.filter(([, v]) => ok(v));
  if (!good.length) return [];
  const top = dir === 1 ? Math.max(...good.map(([, v]) => v)) : Math.min(...good.map(([, v]) => v));
  return good
    .filter(([, v]) => v === top)
    .map(([playerId]) => ({ code, playerId, value: top }))
    .sort((a, b) => (a.playerId < b.playerId ? -1 : 1));
}

/** The single round that is best by `cmp`; the earliest wins a tie. */
function bestRound(
  rounds: RoundFact[],
  code: string,
  pick: (a: number, b: number) => boolean,
): Award[] {
  let w: RoundFact | null = null;
  const order = [...rounds].sort(
    (a, b) => a.doneAt - b.doneAt || (a.playerId < b.playerId ? -1 : 1),
  );
  for (const r of order) if (!w || pick(r.points, w.points)) w = r;
  return w
    ? [{ code, playerId: w.playerId, value: w.points, gameId: w.gameId, roundIndex: w.roundIndex }]
    : [];
}

/** The day's awards (§8.4) from rounds done that day in `tz`. */
export function dailyAwards(f: Facts, day: string, tz?: string): Award[] {
  const [from, to] = dayRange(day, tz);
  const rounds = f.rounds.filter((r) => r.doneAt >= from && r.doneAt < to);
  if (!rounds.length) return [];
  const t = [...tallies(f, from, to).values()].filter((x) => x.rounds > 0);
  return [
    ...best(
      t.map((x) => [x.playerId, x.points]),
      'day_star',
      1,
      (v) => v > 0,
    ),
    ...bestRound(rounds, 'day_bang', (a, b) => a > b).filter((a) => a.value > 0),
    ...bestRound(rounds, 'day_ouch', (a, b) => a < b).filter((a) => a.value < 0),
    ...best(
      t.map((x) => [x.playerId, x.longestHot]),
      'day_hot',
      1,
      (v) => v >= 3,
    ),
    ...best(
      t.map((x) => [x.playerId, x.longestCold]),
      'day_ice',
      1,
      (v) => v >= 3,
    ),
    ...best(
      t.filter((x) => x.rounds >= 10).map((x) => [x.playerId, accuracyOf(x)]),
      'day_sharp',
    ),
    ...best(
      t.map((x) => [x.playerId, x.rounds]),
      'day_grinder',
    ),
    ...best(
      t.map((x) => [x.playerId, x.hookHits]),
      'day_hooked',
      1,
      (v) => v >= 1,
    ),
  ];
}

/** Every day with a round done, newest first. */
export const playedDays = (f: Facts, tz?: string): string[] =>
  [...new Set(f.rounds.map((r) => dayOf(r.doneAt, tz)))].sort().reverse();

export const SEASON_MIN_ROUNDS = 50;

export interface Season {
  season: string;
  standings: BoardRow[];
  awards: Award[];
}

const prevMonth = (m: string) => {
  const [y, mm] = m.split('-').map(Number);
  return mm === 1 ? `${y - 1}-12` : `${y}-${String(mm - 1).padStart(2, '0')}`;
};

/** A calendar month's standings (average per round, more than 50 rounds) and its awards (§8.5). */
export function season(f: Facts, month: string, tz?: string): Season {
  const [from, to] = monthRange(month, tz);
  const standings = leaderboard(f, {
    from,
    to,
    metric: 'avgPerRound',
    minRounds: SEASON_MIN_ROUNDS,
  }).rows;
  const q = standings.filter((r) => r.qualified);
  const awards: Award[] = [];
  for (const [rank, code] of [
    [1, 'season_champion'],
    [2, 'season_runner_up'],
    [3, 'season_third'],
  ] as const)
    for (const r of q.filter((x) => x.rank === rank))
      awards.push({ code, playerId: r.playerId, value: r.value });
  awards.push(
    ...best(
      q.filter((r) => r.rounds >= 30).map((r) => [r.playerId, r.accuracy]),
      'season_sharpest',
    ),
  );
  awards.push(
    ...best(
      q.map((r) => [r.playerId, r.games]),
      'season_iron',
    ),
  );
  const [pf, pt] = monthRange(prevMonth(month), tz);
  const before = new Map(
    leaderboard(f, { from: pf, to: pt, metric: 'avgPerRound', minRounds: SEASON_MIN_ROUNDS })
      .rows.filter((r) => r.qualified)
      .map((r) => [r.playerId, r.rank!]),
  );
  awards.push(
    ...best(
      q
        .filter((r) => before.has(r.playerId))
        .map((r) => [r.playerId, before.get(r.playerId)! - r.rank!]),
      'season_climber',
      1,
      (v) => v > 0,
    ),
  );
  return { season: month, standings, awards };
}

/** Every month with a round done, newest first. */
export const playedMonths = (f: Facts, tz?: string): string[] =>
  [...new Set(f.rounds.map((r) => monthOf(r.doneAt, tz)))].sort().reverse();

/** A player's year (§8.5), as plain data the app turns into story slides. */
export interface Wrapped {
  year: number;
  playerId: string;
  totals: ProfileStats;
  bestMonth: { month: string; points: number } | null;
  bestDay: { day: string; points: number } | null;
  favouriteTrump: { trump: Trump; accuracy: number; rounds: number } | null;
  nemesis: { playerId: string; losses: number } | null;
  partner: { playerId: string; games: number } | null;
  biggestRound: { points: number; gameId: string; roundIndex: number } | null;
  longestRun: number;
  achievements: number;
  topDays: { day: string; rounds: number }[];
  rank: { rank: number | null; outOf: number };
}

export function wrapped(f: Facts, playerId: string, year: number, tz?: string): Wrapped {
  const [from] = monthRange(`${year}-01`, tz);
  const [, to] = monthRange(`${year}-12`, tz);
  const rounds = f.rounds.filter(
    (r) => r.playerId === playerId && r.doneAt >= from && r.doneAt < to,
  );
  const sumBy = (key: (r: RoundFact) => string) => {
    const m = new Map<string, { points: number; rounds: number; made: number }>();
    for (const r of rounds) {
      const e = m.get(key(r)) ?? { points: 0, rounds: 0, made: 0 };
      e.points += r.points;
      e.rounds++;
      if (r.outcome === 'made') e.made++;
      m.set(key(r), e);
    }
    return [...m.entries()];
  };
  const top = <T>(xs: T[], v: (x: T) => number) =>
    xs.reduce<T | null>((a, x) => (a === null || v(x) > v(a) ? x : a), null);
  const months = sumBy((r) => monthOf(r.doneAt, tz)).sort();
  const days = sumBy((r) => dayOf(r.doneAt, tz)).sort();
  const trumps = sumBy((r) => r.trump)
    .filter(([, e]) => e.rounds >= 10)
    .sort();
  const bm = top(months, ([, e]) => e.points),
    bd = top(days, ([, e]) => e.points),
    ft = top(trumps, ([, e]) => e.made / e.rounds);
  const ended = f.players.filter(
    (p) => p.endedAt != null && p.place != null && p.endedAt >= from && p.endedAt < to,
  );
  const mine = ended.filter((p) => p.playerId === playerId);
  const losses = new Map<string, number>(),
    together = new Map<string, number>();
  for (const p of mine)
    for (const o of ended)
      if (o.gameId === p.gameId && o.playerId !== playerId) {
        together.set(o.playerId, (together.get(o.playerId) ?? 0) + 1);
        if (o.place! < p.place!) losses.set(o.playerId, (losses.get(o.playerId) ?? 0) + 1);
      }
  const byCount = (m: Map<string, number>) =>
    top(
      [...m.entries()].sort(([a], [b]) => (a < b ? -1 : 1)),
      ([, n]) => n,
    );
  const nem = byCount(losses),
    par = byCount(together);
  const big = top(
    [...rounds].sort((a, b) => a.doneAt - b.doneAt),
    (r) => r.points,
  );
  const board = leaderboard(f, { from, to, metric: 'avgPerRound', minRounds: SEASON_MIN_ROUNDS });
  const me = board.rows.find((r) => r.playerId === playerId);
  return {
    year,
    playerId,
    totals: profileStats(f, playerId, from, to),
    bestMonth: bm && { month: bm[0], points: bm[1].points },
    bestDay: bd && { day: bd[0], points: bd[1].points },
    favouriteTrump: ft && {
      trump: ft[0] as Trump,
      accuracy: ft[1].made / ft[1].rounds,
      rounds: ft[1].rounds,
    },
    nemesis: nem && { playerId: nem[0], losses: nem[1] },
    partner: par && { playerId: par[0], games: par[1] },
    biggestRound: big && { points: big.points, gameId: big.gameId, roundIndex: big.roundIndex },
    longestRun: Math.max(0, ...rounds.map((r) => r.runHot)),
    achievements: allAchievements(f, tz).filter(
      (e) => e.playerId === playerId && e.earnedAt >= from && e.earnedAt < to,
    ).length,
    topDays: days
      .map(([day, e]) => ({ day, rounds: e.rounds }))
      .sort((a, b) => b.rounds - a.rounds || (a.day < b.day ? -1 : 1))
      .slice(0, 3),
    rank: { rank: me?.rank ?? null, outOf: board.rows.filter((r) => r.qualified).length },
  };
}
