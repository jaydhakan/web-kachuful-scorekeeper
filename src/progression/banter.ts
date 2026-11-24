/**
 * Table banter's shared parts (REWARDS-PLAN §6.7): the marks a line can be about, the cooldown and the stable pick.
 * Each game keeps its own rule table (`games/<game>/domain/banter.ts`) and its own lines.
 */

/** What a seated player holds: a medal, Aaj ka Sitara or the Legend. */
export type Mark = 'gold' | 'silver' | 'bronze' | 'sitara' | 'legend';

export const MARK_OF: Record<1 | 2 | 3, Mark> = { 1: 'gold', 2: 'silver', 3: 'bronze' };

/** Who a line is about, first to last: the medals by rank, then the Sitara, then the Legend. */
export const MARK_ORDER: readonly Mark[] = ['gold', 'silver', 'bronze', 'sitara', 'legend'];

/** The same kind of line isn't heard twice within this many hands. */
export const COOLDOWN = 3;

/** One hand's line: a kind of the game's own, about a seat (`who`, a game seat id), maybe naming another. */
export interface BanterOf<K extends string> {
  kind: K;
  who: string;
  mark: Mark;
  other?: string;
  otherMark?: Mark;
}

/**
 * The line for each hand, in order, from each hand's candidates (best first): the first whose kind wasn't heard in
 * the last `COOLDOWN - 1` hands, else null. A hand's line depends on the ones before it, so it runs over the game.
 */
export function cooldownLog<B extends { kind: string }>(
  hands: readonly (readonly B[])[],
  cooldown = COOLDOWN,
): (B | null)[] {
  const log: (B | null)[] = [];
  hands.forEach((cands, i) => {
    const recent = new Set(log.slice(Math.max(0, i - (cooldown - 1))).map((b) => b?.kind));
    log.push(cands.find((b) => !recent.has(b.kind)) ?? null);
  });
  return log;
}

/** The seats holding a mark, in `MARK_ORDER`: the order a hand's candidates are tried. */
export const bySubject = (marks: ReadonlyMap<string, Mark>): [string, Mark][] =>
  [...marks].sort((a, b) => MARK_ORDER.indexOf(a[1]) - MARK_ORDER.indexOf(b[1]));

/** A stable pick from a pool, the same on every phone for the same game and hand. */
export function pickIndex(seed: string, n: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return (h >>> 0) % Math.max(1, n);
}
