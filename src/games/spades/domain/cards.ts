import { RANKS, SUITS, cardKey } from '../../../lib/cards';
import type { Card, Rank, Seat, Suit } from './types';

const RANK_VALUE: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};
/** Bridge order, for the draw for deal's ties and the timeout's choice between equal ranks. */
const SUIT_RANK: Record<Suit, number> = { clubs: 0, diamonds: 1, hearts: 2, spades: 3 };
/** Colours alternate with spades on the right. */
const DISPLAY: Record<Suit, number> = { diamonds: 0, clubs: 1, hearts: 2, spades: 3 };

/** Cards in each hand, and tricks in each hand. */
export const TRICKS = 13;

export const rankValue = (c: Card) => RANK_VALUE[c.rank];
export const sameCard = (a: Card, b: Card) => a.rank === b.rank && a.suit === b.suit;
export const cardId = (c: Card) => cardKey(c.rank, c.suit);

export function isCard(x: unknown): x is Card {
  if (!x || typeof x !== 'object') return false;
  const c = x as Record<string, unknown>;
  return RANKS.includes(c.rank as Rank) && SUITS.includes(c.suit as Suit);
}

/** The 52 cards in a fixed order. */
export function deck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })));
}

/** mulberry32: tests and the mock API deal the same cards every time. Real deals are the server's. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleSeeded(seed: number): Card[] {
  const rnd = seeded(seed);
  const d = deck();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/** A seeded shuffle dealt 13 to each seat. */
export function dealSeeded(seed: number): Card[][] {
  const d = shuffleSeeded(seed);
  return [0, 1, 2, 3].map((s) => d.slice(s * 13, s * 13 + 13));
}

export function displaySort(cards: readonly Card[]): Card[] {
  return cards
    .slice()
    .sort((a, b) => DISPLAY[a.suit] - DISPLAY[b.suit] || RANK_VALUE[a.rank] - RANK_VALUE[b.rank]);
}

/** Higher first: by rank, then spades, hearts, diamonds, clubs. */
const drawOrder = (a: Card, b: Card) =>
  RANK_VALUE[b.rank] - RANK_VALUE[a.rank] || SUIT_RANK[b.suit] - SUIT_RANK[a.suit];

/** Who drew the highest card for deal. */
export function drawWinner(draw: readonly Card[]): Seat {
  const best = draw.slice().sort(drawOrder)[0];
  return draw.findIndex((c) => sameCard(c, best)) as Seat;
}

/** Spades count above every other suit, since they are trump; then by rank, then bridge order. */
export function lowestCard(cards: readonly Card[]): Card {
  const trump = (c: Card) => (c.suit === 'spades' ? 1 : 0);
  return cards
    .slice()
    .sort(
      (a, b) =>
        trump(a) - trump(b) ||
        RANK_VALUE[a.rank] - RANK_VALUE[b.rank] ||
        SUIT_RANK[a.suit] - SUIT_RANK[b.suit],
    )[0];
}

/** `n` distinct real cards. */
export function distinctCards(x: unknown, n: number): x is Card[] {
  if (!Array.isArray(x) || x.length !== n || !x.every(isCard)) return false;
  return new Set(x.map(cardId)).size === n;
}

/** Four hands of 13 that together are the whole deck. */
export function isDeal(x: unknown): x is Card[][] {
  return (
    Array.isArray(x) &&
    x.length === 4 &&
    x.every((h) => Array.isArray(h) && h.length === 13) &&
    distinctCards(x.flat(), 52)
  );
}
