import { rankValue } from './cards';
import type { Card, Play, Seat, Suit } from './types';

export const ledSuit = (trick: readonly Play[]): Suit | null => trick[0]?.card.suit ?? null;

/** The highest spade, or with none the highest card of the suit led. */
export function trickWinner(plays: readonly Play[]): Seat {
  let best = plays[0];
  for (const p of plays.slice(1)) {
    const a = p.card,
      b = best.card;
    if (a.suit === b.suit ? rankValue(a) > rankValue(b) : a.suit === 'spades') best = p;
  }
  return best.seat;
}

/** Any spade played breaks spades: one can only be led once broken or from an all-spade hand, both of which count. */
export const breaksSpades = (card: Card, broken: boolean) => !broken && card.suit === 'spades';
