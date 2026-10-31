import { messages } from '@/strings/messages';
import type { Outcome } from './types';

type Bids = Record<string, number>;
type Marks = Partial<Record<string, Outcome>>;

/** Tricks not yet spoken for: a player marked Made won exactly their bid. */
export function tricksLeft(cards: number, bids: Bids, marks: Marks): number {
  let used = 0;
  for (const [id, m] of Object.entries(marks)) if (m === 'made') used += bids[id] ?? 0;
  return cards - used;
}

/** Whether `target` tricks can be shared out so that none of these players wins exactly their own bid. */
function shareOut(bidsOfMissed: number[], target: number): boolean {
  let sums = new Set([0]);
  for (const bid of bidsOfMissed) {
    const next = new Set<number>();
    for (const s of sums) for (let t = 0; t + s <= target; t++) if (t !== bid) next.add(s + t);
    sums = next;
  }
  return sums.has(target);
}

/**
 * Whether results for every player can add up to the tricks played: the Made bids fit in the cards, and what
 * is left can go to the players who missed without any of them winning exactly their bid.
 */
export function fits(cards: number, ids: string[], bids: Bids, marks: Marks): boolean {
  const left = tricksLeft(cards, bids, marks);
  if (left < 0) return false;
  const missed = ids.filter((id) => marks[id] === 'missed').map((id) => bids[id] ?? 0);
  return shareOut(missed, left);
}

/** Whether the players still unmarked can be given results that make the whole round add up. */
export function canFinish(cards: number, ids: string[], bids: Bids, marks: Marks): boolean {
  if (tricksLeft(cards, bids, marks) < 0) return false;
  const open = ids.filter((id) => !marks[id]);
  for (let mask = 0; mask < 1 << open.length; mask++) {
    const full: Marks = { ...marks };
    open.forEach((id, i) => (full[id] = mask & (1 << i) ? 'made' : 'missed'));
    if (fits(cards, ids, bids, full)) return true;
  }
  return false;
}

export type Blocked = { kind: 'left'; left: number } | { kind: 'sum' };

/**
 * Why a player cannot be given `choice` right now, or null when they can. The player's own current mark is
 * ignored, so a mark can always be changed to something that works.
 */
export function blockedReason(
  cards: number,
  ids: string[],
  bids: Bids,
  marks: Marks,
  id: string,
  choice: Outcome,
): Blocked | null {
  const others = { ...marks };
  delete others[id];
  if (canFinish(cards, ids, bids, { ...others, [id]: choice })) return null;
  const left = tricksLeft(cards, bids, others);
  return choice === 'made' && (bids[id] ?? 0) > left ? { kind: 'left', left } : { kind: 'sum' };
}

/** What is wrong with a complete set of results, in words, or '' when they can add up. */
export function resultsProblem(cards: number, ids: string[], bids: Bids, marks: Marks): string {
  const left = tricksLeft(cards, bids, marks);
  if (left < 0) return messages.tricksOver(cards - left, cards);
  return fits(cards, ids, bids, marks) ? '' : messages.resultsDontFit(cards);
}

/** The one result a player can have, when the other is ruled out by everyone else's marks; otherwise null. */
export function onlyResult(
  cards: number,
  ids: string[],
  bids: Bids,
  marks: Marks,
  id: string,
): Outcome | null {
  const made = blockedReason(cards, ids, bids, marks, id, 'made') === null;
  const missed = blockedReason(cards, ids, bids, marks, id, 'missed') === null;
  return made === missed ? null : made ? 'made' : 'missed';
}
