/** How many tied players one step can hold before their avatars and names stop reading. */
export const STEP_SEATS = 3;

interface Ranked {
  rank: number | null;
}

/**
 * Splits a board (best first, unranked last) into who stands on the podium and who stays in the list. A place with
 * more tied players than a step holds stays in the list along with every place below it, and a podium needs two
 * people on it: a lone winner or a first place shared by a crowd reads better as rows.
 */
export function podiumSplit<T extends Ranked>(rows: T[]): { stand: T[]; rest: T[] } {
  const stand: T[] = [];
  for (const k of [1, 2, 3]) {
    const tied = rows.filter((r) => r.rank === k);
    if (tied.length > STEP_SEATS) break;
    stand.push(...tied);
  }
  if (stand.length < 2 || stand[0].rank !== 1) return { stand: [], rest: rows };
  const on = new Set(stand);
  return { stand, rest: rows.filter((r) => !on.has(r)) };
}

/** The nearest player ranked above `rows[i]`, to chase: null for the leader, an unranked row or a board of one. */
export function aheadOf<T extends Ranked>(rows: T[], i: number): T | null {
  const me = rows[i]?.rank;
  if (me == null) return null;
  for (let k = i - 1; k >= 0; k--) {
    const r = rows[k].rank;
    if (r != null && r < me) return rows[k];
  }
  return null;
}
