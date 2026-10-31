import type { Decks } from './cards';

export type Trump = 'spades' | 'diamonds' | 'clubs' | 'hearts';
export type Direction = 'cw' | 'ccw';
export type LengthMode = 'endless' | '1cycle' | '2cycles';
export type Phase = 'bidding' | 'playing' | 'results' | 'done';
export type Outcome = 'made' | 'missed';
export type GameStatus = 'active' | 'finished';

export interface Player {
  id: string;
  name: string;
  emoji: string;
  color: string;
  /** The registry player this seat is (schema 3); absent until the player is first archived or uploaded. */
  playerId?: string;
}

/** What every round derives from the seating order alone. */
export interface RoundPlan {
  index: number;
  cards: number;
  trump: Trump;
  dealerIndex: number;
  firstPlayerIndex: number;
}

export interface Round extends RoundPlan {
  bids: Record<string, number>;
  results: Record<string, Outcome>;
  tricks: Record<string, number> | null;
  hookHits: number;
  phase: Phase;
  /** When the round was confirmed (schema 3); older rounds fall back to the game's updatedAt. */
  doneAt?: number;
}

export interface GameUi {
  view: 'round' | 'summary';
  bidIdx: number;
  hookWarn?: boolean;
}

export interface Game {
  id: string;
  /** The game's id everywhere outside this device (schema 3). */
  syncId: string;
  /** Goes up by one on every committed change, undo included (schema 3). */
  rev: number;
  createdAt: number;
  updatedAt: number;
  players: Player[];
  direction: Direction;
  firstDealerIndex: number;
  decks: Decks;
  maxCards: number;
  lengthMode: LengthMode;
  rounds: Round[];
  status: GameStatus;
  /** When the game ended (schema 3); older finished games use updatedAt. */
  finishedAt?: number;
  ui: GameUi;
  schemaVersion?: number;
}

export interface Standing {
  p: Player;
  i: number;
  t: number;
  rank: number;
}

export type Totals = Record<string, number>;
