/** The Achievements page's cards, group by group. */
import type { AchievementDef, AchievementGroup, Ladder } from './types';

export const GROUPS: AchievementGroup[] = ['moment', 'game', 'career', 'daily', 'season'];

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
