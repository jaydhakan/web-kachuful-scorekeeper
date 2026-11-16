// Relative, because the mock API and the fixture export load the domain outside Vite.
import type { Rank, Suit } from '../../../lib/cards';
import type { Direction, Player } from '../../../people/types';
export type { Direction, Player, Rank, Suit };

/** Seats 0 and 2 are team 'a', seats 1 and 3 team 'b'; play goes 0 → 1 → 2 → 3. */
export type Seat = 0 | 1 | 2 | 3;
export type TeamId = 'a' | 'b';

/** On the wire as `{rank, suit}`. */
export interface Card {
  rank: Rank;
  suit: Suit;
}

export interface Play {
  seat: Seat;
  card: Card;
}

/** A finished trick; its leader is `plays[0].seat`. */
export interface TrickRec {
  plays: Play[];
  winner: Seat;
}

export interface SpRules {
  /** Points to win: 50–1000 in tens; null is Endless. */
  target: number | null;
  /** Online only. */
  timerSec: 30 | 60 | null;
  nil: boolean;
  /** Needs `nil`. */
  blindNil: boolean;
  /** 4 when on. */
  minTeamBid: number | null;
  /** −200 when on: a team below it loses. */
  mercy: number | null;
}

export const STANDARD_RULES: SpRules = {
  target: 200,
  timerSec: 30,
  nil: true,
  blindNil: false,
  minTeamBid: null,
  mercy: null,
};

/** One hand, in either mode. The scorer reads only bids, blind, teamTricks and nilTricks. */
export interface SpHand {
  index: number;
  dealer: Seat;
  /** By seat; 0 is Nil. */
  bids: (number | null)[];
  /** By seat; true only on a Nil bid. */
  blind: boolean[];
  /** [team a, team b], adding to 13. */
  teamTricks: [number, number] | null;
  /** By seat: the tricks a Nil bidder took; null for everyone else. */
  nilTricks: (number | null)[];
  /** Online: every trick, so all four hands are public once the hand is over. */
  tricks?: TrickRec[];
  /** Online: the registry player in each seat when the hand ended, for stats after a Replace. */
  players?: (string | null)[];
  phase: 'bidding' | 'tricks' | 'done';
  doneAt?: number;
}

export type SpEndedBy = 'target' | 'mercy' | 'end' | 'draw';

export interface SpResult {
  winner: TeamId | 'draw';
  endedBy: SpEndedBy;
}

/** A game kept at a real table (game kind `spades`); `players` are in seat order. */
export interface SpGame {
  kind: 'spades';
  schemaVersion: 1;
  id: string;
  syncId: string;
  rev: number;
  createdAt: number;
  updatedAt: number;
  finishedAt?: number;
  players: Player[];
  firstDealerIndex: number;
  /** Seat layout only; the deal and play always go clockwise. */
  direction: Direction;
  rules: SpRules;
  hands: SpHand[];
  status: 'active' | 'finished' | 'cancelled';
  result?: SpResult;
}

/** The account in an online seat. */
export interface SpWho {
  userId: string;
  playerId: string;
  name: string;
  emoji: string;
  color: string;
  photoUrl?: string | null;
}

export interface SpSeat {
  who: SpWho | null;
  ready: boolean;
  /** Two timeouts in a row: plays on a 5 s timer until the person acts again. */
  away: boolean;
  /** Timeouts in a row. */
  timeouts: number;
}

export type SpStatus = 'lobby' | 'playing' | 'finished' | 'cancelled';
/** 'draw' in the lobby (the draw for deal is next); 'deal' and 'handEnd' wait for the dealer. */
export type SpPhase = 'draw' | 'deal' | 'bidding' | 'playing' | 'handEnd';

/**
 * An online table (game kind `spades-online`): everything any viewer may see. It never holds a hand in play; the
 * private hands live beside it, and finished hands are public through `history[].tricks`.
 */
export interface SpPublic {
  kind: 'spades-online';
  schemaVersion: 1;
  id: string;
  code: string;
  name: string;
  rev: number;
  createdAt: number;
  updatedAt: number;
  finishedAt?: number;
  status: SpStatus;
  paused: 'replace' | null;
  host: Seat;
  rules: SpRules;
  seats: SpSeat[];
  /** The draw for deal, by seat. */
  drawn: Card[] | null;
  dealer: Seat | null;
  phase: SpPhase;
  bids: (number | null)[];
  /** Blind Nil, by seat; a declaration not yet bid is shown only to its own seat (`viewFor`). */
  blind: boolean[];
  /** Whether each seat may see its cards. */
  looked: boolean[];
  /** The trick on the table. */
  trick: Play[];
  /** This hand's finished tricks. */
  tricks: TrickRec[];
  broken: boolean;
  /** The seat to act; in 'deal' and 'handEnd', the dealer. */
  turn: Seat | null;
  turnStartedAt: number | null;
  /** The timer's deadline (rules or the away timer); absence with the timer off is judged on `timeout`. */
  deadline: number | null;
  history: SpHand[];
  result: SpResult | null;
  /** The rematch's id, once the host starts one. */
  next: string | null;
}

export type Action =
  | { type: 'ready' }
  | { type: 'unready' }
  | { type: 'shufflePartners' }
  | { type: 'drawForDeal' }
  | { type: 'deal' }
  | { type: 'look' }
  | { type: 'blindNil' }
  | { type: 'bid'; bid: number }
  | { type: 'play'; card: Card }
  | { type: 'timeout' }
  | { type: 'react'; emoji: string }
  | { type: 'replace'; seat: Seat }
  | { type: 'endGame' }
  | { type: 'drawGame' }
  | { type: 'cancelGame' }
  | { type: 'rematch'; id: string; swap?: boolean };

export type ActionType = Action['type'];

/** The acting account's seat; null for someone not seated. */
export type Actor = Seat | null;

export type SpReason =
  | 'not-started'
  | 'finished'
  | 'not-finished'
  | 'started'
  | 'paused'
  | 'wrong-phase'
  | 'full'
  | 'seat-taken'
  | 'bad-seat'
  | 'bad-rules'
  | 'not-ready'
  | 'bad-draw'
  | 'bad-deal'
  | 'too-early'
  | 'looked'
  | 'blind-locked'
  | 'blind-off'
  | 'nil-off'
  | 'look-first'
  | 'already-bid'
  | 'bad-bid'
  | 'below-min'
  | 'bad-card'
  | 'not-in-hand'
  | 'must-follow'
  | 'spades-locked'
  | 'bad-emoji'
  | 'not-away'
  | 'host-seat'
  | 'mid-trick'
  | 'already';

/** 403 `not_your_turn` (wrong seat, not seated, not the host) or 422 `invalid_action {reason}`. */
export type Refusal = { code: 'not_your_turn' } | { code: 'invalid_action'; reason: SpReason };

/** What the server supplies with an action: its clock, the private hands, and any randomness. */
export interface ApplyCtx {
  now: number;
  /** By seat; null before the first deal. */
  hands: Card[][] | null;
  /** `drawForDeal`: one card per seat, distinct, drawn by the server. */
  draw?: Card[];
  /** `deal`: 13 cards per seat, the whole deck, shuffled by the server. */
  deal?: Card[][];
  /** The rev the sender saw; a `timeout` from an older rev whose turn has moved on is a no-op. */
  rev?: number;
  /** `timeout` with the timer off: when the seat to act was last seen. */
  lastSeenAt?: number | null;
}

/** `noop`: accepted, nothing changed (rev not bumped); `react` is sent on as an event. */
export type ApplyResult =
  | { ok: true; state: SpPublic; hands: Card[][] | null; noop: boolean }
  | { ok: false; error: Refusal; state: SpPublic; hands: Card[][] | null };

export type SeatResult =
  { ok: true; state: SpPublic } | { ok: false; error: Refusal; state: SpPublic };

export interface SpView {
  table: SpPublic;
  me: { seat: Seat | null; host: boolean; hand: Card[] | null };
  serverNow: number;
}
