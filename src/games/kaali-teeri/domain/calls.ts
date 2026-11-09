import { RANKS, SUITS, copiesInPlay, partnersFor, sameCard } from './cards';
import type { CardRef, KtHand } from './types';

/** A called card names its copy only when both copies are in play; a card out of one deck has a single copy left. */
export const copyNeeded = (card: CardRef, n: number): boolean => copiesInPlay(card, n) === 2;

const callable = (card: CardRef, n: number): boolean => {
  if (!RANKS.includes(card.rank) || !SUITS.includes(card.suit)) return false;
  const left = copiesInPlay(card, n);
  if (left === 0) return false;
  return left === 2
    ? card.copy === 1 || card.copy === 2 || card.copy === 'other'
    : card.copy === undefined;
};

/** Two calls of one card clash when they name the same copy, or when either is "the other one". */
const clash = (a: CardRef, b: CardRef): boolean =>
  sameCard(a, b) && (a.copy === b.copy || a.copy === 'other' || b.copy === 'other');

/** Whether `card` can join the cards already called: in play, marked right, no clash, a partner left to call. */
export const canAdd = (card: CardRef, called: CardRef[], n: number): boolean =>
  called.length < partnersFor(n) && callable(card, n) && !called.some((c) => clash(c, card));

/** The finished call: exactly one card per partner, each one addable in turn. */
export const validCalled = (called: CardRef[], n: number): boolean =>
  called.length === partnersFor(n) && called.every((c, i) => canAdd(c, called.slice(0, i), n));

/** One entry per called card: a seat at the table or null; "the other one" is never the bidder's. */
export const validPlayedBy = (
  h: Pick<KtHand, 'called' | 'playedBy' | 'bidder'>,
  ids: string[],
): boolean =>
  h.playedBy.length === h.called.length &&
  h.playedBy.every(
    (p, i) => p === null || (ids.includes(p) && !(h.called[i].copy === 'other' && p === h.bidder)),
  );
