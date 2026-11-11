import type { Game, Round } from './types';

/** The number the dealer may not bid, or null while it is undecided or out of range. */
export function forbiddenFor(
  g: Game,
  r: Pick<Round, 'bids' | 'cards' | 'dealerIndex'>,
): number | null {
  const dl = g.players[r.dealerIndex];
  let s = 0;
  for (const p of g.players) {
    if (p.id === dl.id) continue;
    if (r.bids[p.id] === undefined) return null;
    s += r.bids[p.id];
  }
  const f = r.cards - s;
  return f >= 0 && f <= r.cards ? f : null;
}

export const sumBids = (r: Pick<Round, 'bids'>): number =>
  Object.values(r.bids).reduce((a, b) => a + b, 0);
