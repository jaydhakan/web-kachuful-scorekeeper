import type { Card, Seat, SpPublic, SpView } from './types';

/** Whether a seat may hold its cards: in play, and looked (with Blind Nil off, everyone has looked at the deal). */
export function canSee(s: Pick<SpPublic, 'status' | 'looked'>, seat: Seat | null): boolean {
  return seat !== null && s.status === 'playing' && s.looked[seat];
}

/**
 * What one viewer receives: the public state plus their own hand once they may see it. A Blind Nil declared ahead
 * of its turn shows only to its own seat until the bid is made, so earlier bidders can't play against it.
 */
export function viewFor(
  state: SpPublic,
  hands: Card[][] | null,
  seat: Seat | null,
  now: number,
): SpView {
  const hidden = state.blind.some((b, i) => b && i !== seat && state.bids[i] === null);
  const table = hidden
    ? { ...state, blind: state.blind.map((b, i) => b && (i === seat || state.bids[i] !== null)) }
    : state;
  const hand = hands && canSee(state, seat) ? hands[seat as Seat].slice() : null;
  return { table, me: { seat, host: seat !== null && seat === state.host, hand }, serverNow: now };
}
