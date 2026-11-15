import { sameCard } from './cards';
import { ledSuit } from './trick';
import type { Card, Play } from './types';

export type PlayProblem = 'not-in-hand' | 'must-follow' | 'spades-locked';

/** Whether a card may lead: spades only once broken, or from a hand of nothing but spades. */
export function canLead(card: Card, hand: readonly Card[], broken: boolean): boolean {
  return broken || card.suit !== 'spades' || hand.every((c) => c.suit === 'spades');
}

export function legalPlays(hand: readonly Card[], trick: readonly Play[], broken: boolean): Card[] {
  const led = ledSuit(trick);
  if (led === null) return hand.filter((c) => canLead(c, hand, broken));
  const follow = hand.filter((c) => c.suit === led);
  return follow.length ? follow : hand.slice();
}

/** Why a card can't be played now, or null when it can. */
export function playProblem(
  card: Card,
  hand: readonly Card[],
  trick: readonly Play[],
  broken: boolean,
): PlayProblem | null {
  if (!hand.some((c) => sameCard(c, card))) return 'not-in-hand';
  const led = ledSuit(trick);
  if (led === null) return canLead(card, hand, broken) ? null : 'spades-locked';
  if (card.suit !== led && hand.some((c) => c.suit === led)) return 'must-follow';
  return null;
}
