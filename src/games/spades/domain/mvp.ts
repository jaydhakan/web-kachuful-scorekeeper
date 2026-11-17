import { pidOf } from '@/people/pid';
import { scoreHand } from './scoring';
import { teamOf, SEATS } from './seats';
import type { SpGame } from './types';

/** The player of the game, for the winner screen's reel (WOW-MOMENTS-PLAN A4). */
export interface SpMvp {
  playerId: string;
  /** What they owned: Nils made, or tricks bid and made with their partner. */
  kind: 'nils' | 'bids';
  n: number;
}

/**
 * Whoever made the most Nils, if anyone made one; else whoever bid the most tricks for contracts their team made.
 * Read from what both modes record (bids, team tricks and each Nil's tricks), never from scores.
 */
export function mvpOf(g: Pick<SpGame, 'players' | 'hands'>): SpMvp | null {
  const nils = new Map<number, number>(),
    bid = new Map<number, number>();
  for (const h of g.hands) {
    if (h.phase !== 'done' || !h.teamTricks) continue;
    const score = scoreHand(h);
    for (const s of SEATS) {
      const b = h.bids[s];
      if (b === 0 && h.nilTricks[s] === 0) nils.set(s, (nils.get(s) ?? 0) + 1);
      if (b && b > 0 && score[teamOf(s)].made) bid.set(s, (bid.get(s) ?? 0) + b);
    }
  }
  const best = (m: Map<number, number>) =>
    [...m].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0] as [number, number] | undefined;
  const pick = (m: Map<number, number>, kind: SpMvp['kind']): SpMvp | null => {
    const top = best(m);
    const p = top && g.players[top[0]];
    return p && top[1] > 0 ? { playerId: pidOf(p), kind, n: top[1] } : null;
  };
  return pick(nils, 'nils') ?? pick(bid, 'bids');
}
