/** WOW-MOMENTS-PLAN A3: this many different players sending the same reaction within the window make it rain. */
export const RAIN_PLAYERS = 3;
export const RAIN_WINDOW_MS = 2000;

export interface Reaction {
  seat: number;
  emoji: string;
  at: number;
}

/**
 * Adds a reaction to the recent ones and says whether it starts a rain. Pure: every phone receives the same
 * reactions, so every phone rains together. A rain uses up the reactions that made it, so it never fires twice.
 */
export function rainOf(
  recent: Reaction[],
  r: Reaction,
): { recent: Reaction[]; rain: string | null } {
  const kept = [...recent.filter((x) => r.at - x.at <= RAIN_WINDOW_MS), r];
  const seats = new Set(kept.filter((x) => x.emoji === r.emoji).map((x) => x.seat));
  if (seats.size < RAIN_PLAYERS) return { recent: kept, rain: null };
  return { recent: kept.filter((x) => x.emoji !== r.emoji), rain: r.emoji };
}
