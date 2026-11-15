import { scorable, scoreHand, BAG_LIMIT, BAG_PENALTY, type TeamScore } from './scoring';
import type { SpHand, SpResult, SpRules, TeamId } from './types';

export interface TeamTotal {
  /** Σ hand points − 100 × floor(bags ÷ 10). */
  score: number;
  /** Every bag this game; the meter shows `bags % 10`. */
  bags: number;
  penalties: number;
}
export type Totals = Record<TeamId, TeamTotal>;
export type Scores = Record<TeamId, number>;

export interface HandLine {
  index: number;
  a: TeamScore;
  b: TeamScore;
  /** Both teams' totals after this hand. */
  after: Scores;
}

/** Each finished hand scored in order, with the bags carried between them. */
export function handLines(hands: readonly SpHand[]): HandLine[] {
  const out: HandLine[] = [];
  const bags = { a: 0, b: 0 };
  const points = { a: 0, b: 0 };
  for (const h of hands) {
    if (h.phase !== 'done' || !scorable(h)) continue;
    const s = scoreHand(h, bags);
    for (const t of ['a', 'b'] as const) {
      bags[t] = s[t].bagsAfter;
      points[t] += s[t].points;
    }
    out.push({ index: h.index, a: s.a, b: s.b, after: scoresFrom(points, bags) });
  }
  return out;
}

const scoresFrom = (points: Scores, bags: Scores): Scores => ({
  a: points.a - BAG_PENALTY * Math.floor(bags.a / BAG_LIMIT),
  b: points.b - BAG_PENALTY * Math.floor(bags.b / BAG_LIMIT),
});

/** Derived from the finished hands; never stored. */
export function totals(hands: readonly SpHand[]): Totals {
  const lines = handLines(hands);
  const team = (t: TeamId): TeamTotal => {
    const bags = lines.reduce((n, l) => n + l[t].bags, 0);
    const penalties = Math.floor(bags / BAG_LIMIT);
    const points = lines.reduce((n, l) => n + l[t].points, 0);
    return { score: points - BAG_PENALTY * penalties, bags, penalties };
  };
  return { a: team('a'), b: team('b') };
}

export const scoresOf = (t: Totals): Scores => ({ a: t.a.score, b: t.b.score });

/**
 * Checked at the end of each hand. The game ends when a team reaches the target or (mercy on) falls below it; the
 * higher score then wins, and equal scores play another hand ('tie').
 */
export function gameOver(s: Scores, r: SpRules): SpResult | 'tie' | null {
  const reached = r.target !== null && (s.a >= r.target || s.b >= r.target);
  const sunk = r.mercy !== null && (s.a < r.mercy || s.b < r.mercy);
  if (!reached && !sunk) return null;
  if (s.a === s.b) return 'tie';
  return { winner: s.a > s.b ? 'a' : 'b', endedBy: reached ? 'target' : 'mercy' };
}

/** The host's End game: completed hands count, the higher total wins, equal totals draw. */
export function endResult(s: Scores): SpResult {
  return { winner: s.a === s.b ? 'draw' : s.a > s.b ? 'a' : 'b', endedBy: 'end' };
}

export const DRAW_RESULT: SpResult = { winner: 'draw', endedBy: 'draw' };
