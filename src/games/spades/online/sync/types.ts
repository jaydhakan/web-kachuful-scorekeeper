import type {
  Action,
  Seat,
  SpPhase,
  SpPublic,
  SpResult,
  SpRules,
  SpStatus,
  SpView,
  SpGame,
} from '../../domain';
import type { Look } from '@/people';

/** The /api/spades/tables/* shapes (backend-requests.md §4). Times are epoch ms. */

/** A seat's pending seat invite, as `SpViewOut.invites` carries it. */
export interface SpSeatInviteOut {
  id: string;
  userId: string;
  name: string;
  emoji: string;
  color: string;
  photoUrl: string | null;
}

/** Every table read, write, error body and SSE `state` frame: the viewer's SpView plus each seat's pending invite. */
export interface SpViewOut extends SpView {
  invites: (SpSeatInviteOut | null)[];
}

export interface CreateTableIn {
  id: string;
  name?: string;
  rules: SpRules;
}

/** An action as sent: the domain's Action plus a fresh `actionId` (a resend never acts twice) and the rev seen. */
export type SpActionBody = Action & { actionId: string; rev: number };

export interface SpSummarySeat {
  playerId: string;
  name: string;
  emoji: string;
  color: string;
  photoUrl?: string | null;
  look?: Look | null;
}

/** A table in "my tables" (`GET /api/spades/tables`): read from the summary, never the payload. */
export interface SpTableSummary {
  id: string;
  kind: 'spades-online';
  code: string;
  name: string;
  status: SpStatus;
  phase: SpPhase;
  paused: 'replace' | null;
  rules: SpRules;
  host: Seat;
  seats: (SpSummarySeat | null)[];
  scores: { a: number; b: number };
  /** Finished hands. */
  hands: number;
  result: SpResult | null;
  createdAt: number;
  updatedAt: number;
  finishedAt: number | null;
  mySeat: Seat | null;
  isHost: boolean;
  /** The seat to act. Not in the backend's summary yet, so "Your turn" shows only where it is sent. */
  turn?: Seat | null;
}

/** A share link's body for a scorekeeper game (kind `spades`): the saved game as the scorer uploaded it. */
export interface SpGameShareOut {
  kind: 'spades';
  game: SpGame;
  updatedAt: number;
}

/** Either kind's share-link body, live or recap; `kind` says which. */
export type SpShareOut = SpLiveOut | SpGameShareOut;

/** `GET /api/public/live/{token}` for a Spades table: the table no seat sees, with account ids taken out. */
export interface SpLiveOut {
  kind: 'spades-online';
  game: SpPublic;
  summary: SpTableSummary;
  updatedAt: number;
  scorerSeenAt: number | null;
  reactions?: boolean;
  recapToken?: string | null;
}
