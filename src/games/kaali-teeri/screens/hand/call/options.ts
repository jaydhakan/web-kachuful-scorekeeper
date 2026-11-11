import {
  RANKS,
  SUITS,
  canAdd,
  copiesInPlay,
  copyNeeded,
  type CardRef,
  type Copy,
  type Rank,
  type Suit,
} from '@/games/kaali-teeri/domain';

const COPIES: readonly Copy[] = [1, 2, 'other'];

/** Why a card can't be called next: taken out of the deck, or every way of calling it is already used. */
export type CardWhy = 'out' | 'called';

export interface CardOption {
  /** Both copies in play: the call must say which copy. */
  needsCopy: boolean;
  /** The copies that can still be called (empty for a single-copy card). */
  copies: Copy[];
  why: CardWhy | null;
}

/** The picker's view of one card, read from the domain's canAdd so the screen never decides the rules itself. */
export function cardOption(rank: Rank, suit: Suit, called: CardRef[], n: number): CardOption {
  const card: CardRef = { rank, suit };
  if (copiesInPlay(card, n) === 0) return { needsCopy: false, copies: [], why: 'out' };
  const needsCopy = copyNeeded(card, n);
  const copies = needsCopy ? COPIES.filter((copy) => canAdd({ ...card, copy }, called, n)) : [];
  const ok = needsCopy ? copies.length > 0 : canAdd(card, called, n);
  return { needsCopy, copies, why: ok ? null : 'called' };
}

/** A rank is open while at least one suit of it can be called. */
export const rankOpen = (rank: Rank, called: CardRef[], n: number): boolean =>
  SUITS.some((s) => cardOption(rank, s, called, n).why === null);

/** A suit is open while at least one rank of it can be called. */
export const suitOpen = (suit: Suit, called: CardRef[], n: number): boolean =>
  RANKS.some((r) => cardOption(r, suit, called, n).why === null);
