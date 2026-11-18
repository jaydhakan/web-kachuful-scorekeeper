/** What the winner screen shows from a finished game: its reel of achievements, and the ladders it moved up. */
import type { AchievementDef, Earned, Ladder } from './types';

/**
 * What one game earned, for the winner screen's reel: big ones first, then game finish and career, then the other
 * moments; one per player and code (a run reached twice shows once). Within a rank, a card every player earned
 * (Night Owl) goes last, so it never crowds a winner out of a capped reel; otherwise oldest first. `earned` is oldest
 * first.
 */
export function reelOrder(
  catalogue: ReadonlyMap<string, AchievementDef>,
  earned: readonly Earned[],
  gameId: string,
): Earned[] {
  const rank = (code: string) =>
    (catalogue.get(code)?.big ? 0 : 2) + (catalogue.get(code)?.group === 'moment' ? 1 : 0);
  const seen = new Set<string>();
  const mine = earned
    .filter((e) => e.gameId === gameId)
    .filter((e) => {
      const k = e.playerId + e.code;
      return !seen.has(k) && seen.add(k);
    });
  const players = new Set(mine.map((e) => e.playerId)).size;
  const count = new Map<string, number>();
  for (const e of mine) count.set(e.code, (count.get(e.code) ?? 0) + 1);
  const everyone = (code: string) => (players > 2 && count.get(code) === players ? 1 : 0);
  return mine.sort(
    (a, b) =>
      rank(a.code) - rank(b.code) || everyone(a.code) - everyone(b.code) || a.earnedAt - b.earnedAt,
  );
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
