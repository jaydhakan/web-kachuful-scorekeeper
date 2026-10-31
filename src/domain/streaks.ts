import { doneRounds } from './rounds';
import type { Game, Player } from './types';

/** A run of made bids is hot, a run of missed bids cold. */
export type StreakKind = 'hot' | 'cold';

export interface Streak {
  kind: StreakKind;
  n: number;
}

export interface StreakEvent extends Streak {
  p: Player;
  /** Index into STREAK_STEPS of the step just reached. */
  tier: number;
}

/** The runs worth a celebration. */
export const STREAK_STEPS = [3, 5, 8] as const;

/** The last step a run has passed (0, 1 or 2), or -1 below the first. */
export function streakTier(n: number): number {
  let tier = -1;
  STREAK_STEPS.forEach((s, i) => {
    if (n >= s) tier = i;
  });
  return tier;
}

/** Each player's run of made or missed bids through the last finished round; null before the first. */
export function currentStreaks(g: Game): Record<string, Streak | null> {
  const out: Record<string, Streak | null> = {};
  const done = doneRounds(g);
  for (const p of g.players) {
    out[p.id] = done.reduce<Streak | null>((s, r) => {
      const kind: StreakKind = r.results[p.id] === 'made' ? 'hot' : 'cold';
      return { kind, n: s?.kind === kind ? s.n + 1 : 1 };
    }, null);
  }
  return out;
}

/** Players whose run reached a step in the last finished round: hot before cold, longest first. */
export function streakMilestones(g: Game): StreakEvent[] {
  const cur = currentStreaks(g);
  return g.players
    .flatMap((p): StreakEvent[] => {
      const s = cur[p.id];
      return s && (STREAK_STEPS as readonly number[]).includes(s.n)
        ? [{ ...s, p, tier: streakTier(s.n) }]
        : [];
    })
    .sort((a, b) => (a.kind === b.kind ? b.n - a.n : a.kind === 'hot' ? -1 : 1));
}
