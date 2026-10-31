import type { Trump } from './types';

export const TRUMPS: Trump[] = ['spades', 'diamonds', 'clubs', 'hearts'];

export const maxFor = (n: number): number => (n <= 5 ? 10 : n === 6 ? 8 : 7);
export const cycleLen = (max: number): number => 2 * (max - 2);

/** Cards dealt in round `i`: 3 → max → 3, with max and 3 each repeated once. */
export function cardsFor(i: number, max: number): number {
  const L = cycleLen(max),
    p = i % L;
  return p < max - 2 ? 3 + p : max - (p - (max - 2));
}
