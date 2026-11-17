import type { Ladder } from './types';

export interface NextLevel<L extends Ladder = Ladder> {
  ladder: L;
  code: string;
  step: number;
  count: number;
}

/** The level a count reaches next, or null once every level is reached. */
export function nextLevel<L extends Ladder>(ladder: L, count: number): NextLevel<L> | null {
  const k = ladder.steps.findIndex((s) => count < s);
  return k < 0 ? null : { ladder, code: ladder.codes[k], step: ladder.steps[k], count };
}

/** The next level closest to being reached, at least `min` of the way there; a ladder with `goal: false` never is. */
export function nearestLevel<L extends Ladder>(
  ladders: readonly L[],
  counts: Partial<Record<L['id'], number>>,
  min = 0.5,
): NextLevel<L> | null {
  let best: NextLevel<L> | null = null;
  for (const l of ladders) {
    const c = counts[l.id as L['id']];
    const n = l.goal === false || c == null ? null : nextLevel(l, c);
    if (n && n.count / n.step >= min && (!best || n.count / n.step > best.count / best.step))
      best = n;
  }
  return best;
}
