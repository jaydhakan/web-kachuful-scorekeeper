// One players registry for every game; relative, because the mock API loads the domain outside Vite.
import type { Direction, Player } from '../../../people/types';
export type { Direction, Player };

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';
/** Two decks only: first played, second played, or the copy the bidder doesn't hold. */
export type Copy = 1 | 2 | 'other';

export interface CardRef {
  rank: Rank;
  suit: Suit;
  /** Present only when both copies of the card are in play. */
  copy?: Copy;
}

export type KtLength = 'endless' | 'to1000';

/** Stored in the game, so history and the backend check against what was played. */
export interface KtRules {
  decks: 1 | 2;
  partners: number;
  minBid: number;
  step: 5 | 10;
  length: KtLength;
}

export type Call =
  | { playerId: string; bid: number }
  | { playerId: string; pass: true }
  | { playerId: string; forced: number };

export type KtPhase = 'bidding' | 'calling' | 'playing' | 'result' | 'done';
export type KtMode = 'quick' | 'auction';
export type CountedBy = 'defenders' | 'bidders';
export type Sweep = 'none' | 'bidders' | 'defenders';

export interface KtHand {
  index: number;
  /** Derived from index and firstDealerIndex; stored for checks. */
  dealerIndex: number;
  phase: KtPhase;
  mode: KtMode;
  /** The auction in order; empty in quick mode. */
  calls: Call[];
  bidder: string | null;
  bid: number | null;
  trump: Suit | null;
  called: CardRef[];
  /** Per called card: the seat that played it (the bidder allowed); null until marked. */
  playedBy: Array<string | null>;
  /** The bidding team's points: scoring reads only this. */
  teamPoints: number | null;
  /** Which side the table entered, so an edit shows the same number back. */
  countedBy: CountedBy | null;
  doneAt?: number;
}

export interface KtGame {
  kind: 'kaali-teeri';
  schemaVersion: 1;
  id: string;
  syncId: string;
  rev: number;
  createdAt: number;
  updatedAt: number;
  finishedAt?: number;
  players: Player[];
  firstDealerIndex: number;
  direction: Direction;
  rules: KtRules;
  hands: KtHand[];
  status: 'active' | 'finished';
  ui: { view: 'hand' | 'summary' };
}

export interface KtStanding {
  p: Player;
  i: number;
  t: number;
  rank: number;
}

export type KtTotals = Record<string, number>;
