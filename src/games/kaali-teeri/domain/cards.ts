import type { CardRef, KtRules, Rank, Suit } from './types';

export const SUITS: readonly Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const RANKS: readonly Rank[] = [
  'A',
  'K',
  'Q',
  'J',
  '10',
  '9',
  '8',
  '7',
  '6',
  '5',
  '4',
  '3',
  '2',
];

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 10;
const DECK = 52;

export const decksFor = (n: number): 1 | 2 => (n <= 6 ? 1 : 2);
/** 4p 1 · 5p 1 · 6p 2 · 7p 2 · 8p 3 · 9p 3 · 10p 4. */
export const partnersFor = (n: number): number => Math.floor(n / 2) - 1;
export const deckTotal = (decks: 1 | 2): number => 250 * decks;

export const cardPoints = ({ rank, suit }: Pick<CardRef, 'rank' | 'suit'>): number =>
  rank === '3' && suit === 'spades'
    ? 30
    : rank === '5'
      ? 5
      : ['A', 'K', 'Q', 'J', '10'].includes(rank)
        ? 10
        : 0;

/** Zero-point cards in the order they come out to make the deal even. */
export const REMOVAL_ORDER: readonly CardRef[] = (
  [
    ['2', 'clubs'],
    ['2', 'diamonds'],
    ['2', 'hearts'],
    ['2', 'spades'],
    ['3', 'clubs'],
    ['3', 'diamonds'],
    ['3', 'hearts'],
    ['4', 'clubs'],
    ['4', 'diamonds'],
    ['4', 'hearts'],
    ['4', 'spades'],
  ] as const
).map(([rank, suit]) => ({ rank, suit }));

/** The first `count` cards out; with two decks both copies of a card go before the next. */
export const takeOut = (count: number, decks: 1 | 2): CardRef[] =>
  REMOVAL_ORDER.flatMap((c) => Array.from({ length: decks }, () => ({ ...c }))).slice(0, count);

/** One entry per physical card taken out, so a card out of both decks appears twice. */
export const removedCards = (n: number): CardRef[] => {
  const decks = decksFor(n);
  return takeOut((DECK * decks) % n, decks);
};

export const cardsEach = (n: number): number => Math.floor((DECK * decksFor(n)) / n);

export const sameCard = (a: CardRef, b: CardRef): boolean => a.rank === b.rank && a.suit === b.suit;

export const copiesInPlay = (card: CardRef, n: number): number =>
  decksFor(n) - removedCards(n).filter((c) => sameCard(c, card)).length;

export const defaultRules = (n: number): KtRules => {
  const decks = decksFor(n);
  return {
    decks,
    partners: partnersFor(n),
    minBid: decks === 1 ? 150 : 350,
    step: 5,
    length: 'endless',
  };
};

/** Advanced: the minimum bid goes from half the deck + 5 up to the deck − 5. */
export const minBidRange = (decks: 1 | 2) => ({
  lo: deckTotal(decks) / 2 + 5,
  hi: deckTotal(decks) - 5,
});

/**
 * Whether a game's rules fit its table. The minimum must sit on the step, so every bid is a multiple of it and the
 * whole deck (250 / 500) can always be bid.
 */
export function rulesOk(r: KtRules, n: number): boolean {
  const { lo, hi } = minBidRange(r.decks);
  return (
    r.decks === decksFor(n) &&
    r.partners === partnersFor(n) &&
    (r.step === 5 || r.step === 10) &&
    Number.isInteger(r.minBid) &&
    r.minBid >= lo &&
    r.minBid <= hi &&
    r.minBid % r.step === 0 &&
    (r.length === 'endless' || r.length === 'to1000')
  );
}
