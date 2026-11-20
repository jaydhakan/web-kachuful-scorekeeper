/**
 * The table intel line at round 1's deal (REWARDS-PLAN §6.5): the most interesting fact about the people seated, from
 * the games they have finished. Pure and game-agnostic; the crown lines (medals, Kursi) come first, from the table.
 */
import type { KursiGame } from './kursi';

export type Intel =
  | { kind: 'rivalry'; winner: string; loser: string; won: number; of: number }
  | { kind: 'milestone'; player: string; nth: number };

/** A rivalry counts over this many of a pair's latest games together, from this many on, when one side won most. */
export const RIVAL_WINDOW = 9;
export const RIVAL_MIN = 5;
export const RIVAL_SHARE = 0.7;
export const MILESTONES = [50, 100, 250, 500, 1000] as const;

/** Who finished above whom between two players, in the games both finished (newest first). */
function headToHead(games: readonly KursiGame[], a: string, b: string): (string | null)[] {
  const out: (string | null)[] = [];
  for (const g of games) {
    const pa = g.seats.find((s) => s.playerId === a)?.place,
      pb = g.seats.find((s) => s.playerId === b)?.place;
    if (pa == null || pb == null) continue;
    out.push(pa < pb ? a : pb < pa ? b : null);
  }
  return out;
}

/**
 * The line for a table: a milestone this game reaches (a player's 50th, 100th… finished game), else the most
 * one-sided rivalry between two seated players. Null when nothing is worth saying.
 */
export function tableIntel(games: readonly KursiGame[], seated: readonly string[]): Intel | null {
  const newest = [...games].sort((x, y) => y.endedAt - x.endedAt);
  for (const id of seated) {
    const nth = newest.filter((g) => g.seats.some((s) => s.playerId === id)).length + 1;
    if ((MILESTONES as readonly number[]).includes(nth))
      return { kind: 'milestone', player: id, nth };
  }
  let best: Extract<Intel, { kind: 'rivalry' }> | null = null;
  for (let i = 0; i < seated.length; i++)
    for (let j = i + 1; j < seated.length; j++) {
      const h = headToHead(newest, seated[i], seated[j]).slice(0, RIVAL_WINDOW);
      if (h.length < RIVAL_MIN) continue;
      for (const [w, l] of [
        [seated[i], seated[j]],
        [seated[j], seated[i]],
      ]) {
        const won = h.filter((x) => x === w).length;
        if (won / h.length < RIVAL_SHARE) continue;
        if (
          !best ||
          won / h.length > best.won / best.of ||
          (won / h.length === best.won / best.of && h.length > best.of)
        )
          best = { kind: 'rivalry', winner: w, loser: l, won, of: h.length };
      }
    }
  return best;
}
