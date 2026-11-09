/** A playing card, shared by every card game (Kaali Teeri's domain spells the same unions). */
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';

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

/** The card's short key, as the stand-in files are named: 10♦ → `10d`, Q♥ → `qh`. */
export const cardKey = (rank: Rank, suit: Suit): string => rank.toLowerCase() + suit[0];

/** The theme token holding this card's photo art (`none` until a real file exists): 10♦ → `--art-card-10-diamonds`. */
export const artToken = (rank: Rank, suit: Suit): string =>
  `--art-card-${rank.toLowerCase()}-${suit}`;

export const isRed = (suit: Suit) => suit === 'hearts' || suit === 'diamonds';
