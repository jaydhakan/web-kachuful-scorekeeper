/** Aaj ka Sitara and Legend (REWARDS-PLAN §6.1): tonight's leader, and the most season titles all-time. */

/** The night needs this many games before it has a Sitara, so the only game of a day crowns nobody. */
export const SITARA_MIN_GAMES = 2;

/** Tonight's leader(s) on points (ties share; nobody with nothing above zero). */
export function sitaraOf(points: ReadonlyMap<string, number>, games: number): string[] {
  if (games < SITARA_MIN_GAMES) return [];
  const best = Math.max(0, ...points.values());
  return best > 0
    ? [...points]
        .filter(([, v]) => v === best)
        .map(([id]) => id)
        .sort()
    : [];
}

/** Adds one game's points to tonight's. */
export function plusPoints(
  a: ReadonlyMap<string, number>,
  b: ReadonlyMap<string, { points: number }>,
): Map<string, number> {
  const out = new Map(a);
  for (const [id, t] of b) out.set(id, (out.get(id) ?? 0) + t.points);
  return out;
}

/** The Legend: whoever holds the most closed seasons' titles, at least two (ties share). */
export function legendOf(champions: readonly (string | null)[]): string[] {
  const n = new Map<string, number>();
  for (const id of champions) if (id) n.set(id, (n.get(id) ?? 0) + 1);
  const best = Math.max(0, ...n.values());
  return best >= 2
    ? [...n]
        .filter(([, v]) => v === best)
        .map(([id]) => id)
        .sort()
    : [];
}
