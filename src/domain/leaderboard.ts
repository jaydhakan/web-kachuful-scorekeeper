import { minRoundsFor, previousWindow } from './ranges';
import type { Facts } from './timeline';

export const METRICS = [
  'avgPerRound',
  'points',
  'wins',
  'winRate',
  'accuracy',
  'bestRound',
  'longestHot',
  'games',
  'rounds',
] as const;
export type Metric = (typeof METRICS)[number];

/** Rate metrics rank only players with more than the minimum rounds; count metrics rank everyone. */
export const RATE_METRICS: readonly Metric[] = ['avgPerRound', 'accuracy', 'winRate'];

/** What one player did in a range. */
export interface Tally {
  playerId: string;
  points: number;
  rounds: number;
  made: number;
  /** Games with a round done in the range. */
  games: number;
  /** Games that ended in the range, and how many of those were won. */
  gamesEnded: number;
  wins: number;
  bestRound: number;
  worstRound: number;
  longestHot: number;
  longestCold: number;
  hookHits: number;
}

export interface BoardRow {
  rank: number | null;
  qualified: boolean;
  playerId: string;
  /** Exact; avgPerRound is points ÷ rounds as a float (shown rounded). */
  value: number;
  points: number;
  games: number;
  rounds: number;
  wins: number;
  accuracy: number;
  longestHot: number;
  rankDelta: number | null;
}

export interface Board {
  rows: BoardRow[];
  minRounds: number;
}

/** Each player's tally over rounds done in [from, to) and games ended in it. */
export function tallies(f: Facts, from: number, to: number): Map<string, Tally> {
  const out = new Map<string, Tally>();
  const get = (id: string) => {
    let t = out.get(id);
    if (!t) {
      t = {
        playerId: id,
        points: 0,
        rounds: 0,
        made: 0,
        games: 0,
        gamesEnded: 0,
        wins: 0,
        bestRound: -Infinity,
        worstRound: Infinity,
        longestHot: 0,
        longestCold: 0,
        hookHits: 0,
      };
      out.set(id, t);
    }
    return t;
  };
  const seen = new Set<string>();
  for (const r of f.rounds) {
    if (r.doneAt < from || r.doneAt >= to) continue;
    const t = get(r.playerId);
    t.points += r.points;
    t.rounds++;
    if (r.outcome === 'made') t.made++;
    t.bestRound = Math.max(t.bestRound, r.points);
    t.worstRound = Math.min(t.worstRound, r.points);
    t.longestHot = Math.max(t.longestHot, r.runHot);
    t.longestCold = Math.max(t.longestCold, r.runCold);
    t.hookHits += r.hookHits;
    const k = r.gameId + '|' + r.playerId;
    if (!seen.has(k)) {
      seen.add(k);
      t.games++;
    }
  }
  for (const p of f.players) {
    if (p.endedAt == null || p.endedAt < from || p.endedAt >= to || p.place == null) continue;
    const t = get(p.playerId);
    t.gamesEnded++;
    if (p.won) t.wins++;
  }
  return out;
}

export const accuracyOf = (t: Pick<Tally, 'made' | 'rounds'>) => (t.rounds ? t.made / t.rounds : 0);
export const avgOf = (t: Pick<Tally, 'points' | 'rounds'>) => (t.rounds ? t.points / t.rounds : 0);
export const winRateOf = (t: Pick<Tally, 'wins' | 'gamesEnded'>) =>
  t.gamesEnded ? t.wins / t.gamesEnded : 0;

export function valueOf(t: Tally, m: Metric): number {
  switch (m) {
    case 'avgPerRound':
      return avgOf(t);
    case 'points':
      return t.points;
    case 'wins':
      return t.wins;
    case 'winRate':
      return winRateOf(t);
    case 'accuracy':
      return accuracyOf(t);
    case 'bestRound':
      return t.rounds ? t.bestRound : 0;
    case 'longestHot':
      return t.longestHot;
    case 'games':
      return t.games;
    case 'rounds':
      return t.rounds;
  }
}

/** Sorted rows with ranks for one window; ties on the exact value share a rank (1, 1, 3). */
function ranked(
  tal: Map<string, Tally>,
  metric: Metric,
  minRounds: number,
): Omit<BoardRow, 'rankDelta'>[] {
  const rate = RATE_METRICS.includes(metric);
  const rows = [...tal.values()]
    // A rate needs something to be a rate of; nobody is listed without a round or an ended game.
    .filter((t) => t.rounds > 0 || t.gamesEnded > 0)
    .map((t) => ({
      rank: null as number | null,
      qualified: !rate || t.rounds > minRounds,
      playerId: t.playerId,
      value: valueOf(t, metric),
      points: t.points,
      games: t.games,
      rounds: t.rounds,
      wins: t.wins,
      accuracy: accuracyOf(t),
      longestHot: t.longestHot,
    }));
  rows.sort(
    (a, b) =>
      Number(b.qualified) - Number(a.qualified) ||
      b.value - a.value ||
      b.points - a.points ||
      b.rounds - a.rounds ||
      (a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0),
  );
  let k = 0;
  rows.forEach((r, i) => {
    if (!r.qualified) return;
    const prev = rows[i - 1];
    k = i > 0 && prev.qualified && prev.value === r.value ? k : i + 1;
    r.rank = k;
  });
  return rows;
}

export interface BoardQuery {
  from: number;
  to: number;
  metric?: Metric;
  minRounds?: number;
}

/** The leaderboard for a range, as the server's GET /api/leaderboard computes it. */
export function leaderboard(f: Facts, q: BoardQuery): Board {
  const metric = q.metric ?? 'avgPerRound';
  const minRounds = q.minRounds ?? minRoundsFor(q.from, q.to);
  const rows = ranked(tallies(f, q.from, q.to), metric, minRounds);
  const [pf, pt] = previousWindow(q.from, q.to);
  const before = new Map(
    pt > pf ? ranked(tallies(f, pf, pt), metric, minRounds).map((r) => [r.playerId, r.rank]) : [],
  );
  return {
    minRounds,
    rows: rows.map((r) => {
      const was = before.get(r.playerId);
      return { ...r, rankDelta: r.rank != null && was != null ? was - r.rank : null };
    }),
  };
}
