import type { RoundOrder, Trump } from './types';

export const TRUMPS: Trump[] = ['spades', 'diamonds', 'clubs', 'hearts'];

export type Decks = 1 | 2;
export const DECK_OPTIONS: readonly Decks[] = [1, 2];

const DECK_SIZE = 52;
const PEAK = 10;
const MIN_PLAYERS = 3;
/** The most a table can seat: what the seating layout holds. Two decks deal 14 a 7-card peak, as one deck deals 7. */
const MAX_PLAYERS: Record<Decks, number> = { 1: 7, 2: 14 };

/** Most cards a player holds in a game: what the decks allow, never more than PEAK. */
export const maxFor = (n: number, decks: Decks): number =>
  Math.min(PEAK, Math.floor((DECK_SIZE * decks) / n));

export const playerCounts = (decks: Decks): number[] =>
  Array.from({ length: MAX_PLAYERS[decks] - MIN_PLAYERS + 1 }, (_, i) => MIN_PLAYERS + i);
export const cycleLen = (max: number): number => 2 * (max - 2);

/** Cards dealt in round `i`: 3 → max → 3 (`up`) or max → 3 → max (`down`), the turning count repeated once. */
export function cardsFor(i: number, max: number, order: RoundOrder = 'up'): number {
  const L = cycleLen(max),
    p = i % L,
    up = p < max - 2 ? 3 + p : max - (p - (max - 2));
  return order === 'down' ? max + 3 - up : up;
}
