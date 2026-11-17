import type { AchievementDef, AchievementGroup, Earned, Ladder } from './types';

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

export const ladderOf = <L extends Ladder>(ladders: readonly L[]) =>
  new Map(ladders.flatMap((l) => l.codes.map((c) => [c, l] as const)));

export type Card<L extends Ladder = Ladder> =
  { x: AchievementDef; l?: never } | { l: L; x?: never };

/** A group's cards: each ladder of levels takes the place of its first level. */
export function cardsOf<L extends Ladder>(
  catalogue: readonly AchievementDef[],
  ladders: readonly L[],
  g: AchievementGroup,
): Card<L>[] {
  const of = ladderOf(ladders);
  return catalogue
    .filter((x) => x.group === g)
    .flatMap((x): Card<L>[] => {
      const l = of.get(x.code);
      return !l ? [{ x }] : l.codes[0] === x.code ? [{ l }] : [];
    });
}

/**
 * What one game earned, for the winner screen's reel: big ones first, then game finish and career, then the other
 * moments; one per player and code (a run reached twice shows once). `earned` is oldest first.
 */
export function reelOrder(
  catalogue: ReadonlyMap<string, AchievementDef>,
  earned: readonly Earned[],
  gameId: string,
): Earned[] {
  const rank = (code: string) =>
    (catalogue.get(code)?.big ? 0 : 2) + (catalogue.get(code)?.group === 'moment' ? 1 : 0);
  const seen = new Set<string>();
  return earned
    .filter((e) => e.gameId === gameId)
    .filter((e) => {
      const k = e.playerId + e.code;
      return !seen.has(k) && seen.add(k);
    })
    .sort((a, b) => rank(a.code) - rank(b.code) || a.earnedAt - b.earnedAt);
}

export interface LevelUp<L extends Ladder = Ladder> {
  playerId: string;
  ladder: L;
  before: boolean[];
  after: boolean[];
}

/** Each player's ladders that gained a level in one game: levels held before it started, and after. */
export function levelUps<L extends Ladder>(
  ladders: readonly L[],
  earned: readonly Earned[],
  players: Iterable<string>,
  game: { id: string; startedAt: number },
): LevelUp<L>[] {
  const out: LevelUp<L>[] = [];
  for (const id of new Set(players)) {
    const mine = earned.filter((e) => e.playerId === id);
    const had = new Set(mine.filter((e) => e.earnedAt < game.startedAt).map((e) => e.code));
    const now = new Set(mine.filter((e) => e.gameId === game.id).map((e) => e.code));
    for (const ladder of ladders) {
      const before = ladder.codes.map((c) => had.has(c));
      const after = ladder.codes.map((c, k) => before[k] || now.has(c));
      if (after.some((x, k) => x && !before[k])) out.push({ playerId: id, ladder, before, after });
    }
  }
  return out;
}
