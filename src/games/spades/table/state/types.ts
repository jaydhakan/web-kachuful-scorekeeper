import type { Seat as SeatK, SpGame, SpRules } from '@/games/spades/domain/types';
import type { Direction, Seat } from '@/people';

/** The scorekeeper's screens; Spades' own Home (`/spades`) is outside table mode. */
export type SpScreen = 'setup' | 'game' | 'winner';
/** What a reload reopens: a game in progress, else a new setup. */
export type SpSavedScreen = 'setup' | 'game';
export type Dir = 1 | -1;

/** The last four seated on this device and the rules they played, offered at the next setup. */
export interface SpLastGroup {
  players: Pick<Seat, 'name' | 'emoji' | 'color' | 'playerId'>[];
  direction: Direction;
  rules: SpRules;
  /** When it was saved (epoch ms). */
  at: number;
}

export interface SpSetup {
  /** 1: the four players and the rules; 2: the first dealer. */
  step: 1 | 2;
  seats: (Seat | null)[];
  dir: Direction;
  dealer: SeatK;
  rules: SpRules;
  lg: SpLastGroup | null;
}

/** The scorer's numbers for the hand being entered: team a's tricks and each Nil bidder's. Not saved. */
export interface SpEntry {
  index: number;
  teamA: number;
  nilTricks: (number | null)[];
}

export type SpSheet =
  | { type: 'menu' | 'rules' | 'board' | 'share' | 'editRules' }
  | { type: 'edit'; i: number }
  | { type: 'seat' | 'rename' | 'avatar'; k: number }
  | { type: 'addPlayer'; name?: string };

/** End game, Call it a draw and Cancel game each ask first (plan D14). */
export type SpModal = 'end' | 'draw' | 'cancel';

/** A page opened over the screens: a finished game's recap from History. */
export type SpRoute = { page: 'game'; id: string };

export interface SpToast {
  id: number;
  msg: string;
  undo: boolean;
}

export interface SpTableState {
  /** Null when no game is on the table (none started, or one cancelled before any hand was scored). */
  game: SpGame | null;
  screen: SpScreen;
  dir: Dir;
  setup: SpSetup | null;
  entry: SpEntry | null;
  pages: SpRoute[];
  undo: string[];
  sheet: SpSheet | null;
  modal: SpModal | null;
  toast: SpToast | null;
  noteSeq: number;
  /** The hand summary or winner screen's first showing (count-up, confetti), not a reopening. */
  fresh: boolean;
  /** The saved game couldn't be read: saving waits until the player chooses Reset or Keep backup. */
  corrupt: boolean;
}

/** Everything the Edit sheet sets on a scored hand; the totals follow from it. */
export interface SpHandEdit {
  bids: number[];
  blind: boolean[];
  teamA: number;
  nilTricks: (number | null)[];
}

export type SpAction =
  // Screens and overlays
  | { type: 'go'; screen: SpScreen; dir?: Dir }
  | { type: 'sheet'; sheet: SpSheet | null }
  | { type: 'openPage'; route: SpRoute }
  | { type: 'closePage' }
  | { type: 'modal'; modal: SpModal | null }
  | { type: 'say'; msg: string; undo?: boolean }
  | { type: 'toastDone' }
  | { type: 'setFresh'; v: boolean }
  // Setup
  | { type: 'startSetup'; lg: SpLastGroup | null }
  | { type: 'setupStep'; step: 1 | 2 }
  | { type: 'setupSeat'; k: number; seat: Seat | null }
  | { type: 'setupSeatPatch'; k: number; patch: Partial<Seat> }
  | { type: 'setupSwap'; a: number; b: number }
  | { type: 'setupLastGroup' }
  | { type: 'setupDealer'; k: number }
  | { type: 'setupRules'; rules: SpRules }
  | { type: 'beginGame'; id: string; syncId: string; now: number; playerIds: string[] }
  // A hand
  | { type: 'bid'; bid: number; blind: boolean }
  | { type: 'unbid' }
  | { type: 'toTricks' }
  | { type: 'toBids' }
  | { type: 'entry'; teamA?: number; seat?: SeatK; nil?: number }
  | { type: 'saveHand' }
  | { type: 'nextHand' }
  | { type: 'editHand'; i: number; edit: SpHandEdit }
  // Ending (plan D14) and after
  | { type: 'endGame' }
  | { type: 'drawGame' }
  | { type: 'cancelGame' }
  | { type: 'rematch'; id: string; syncId: string; now: number; swap: boolean }
  | { type: 'undo' }
  | { type: 'openGame'; game: SpGame }
  /** The repair prompt's answer: the unreadable save is set aside and the table starts empty. */
  | { type: 'repaired' }
  // Sync (signed in)
  /** The same game from the server or a settled conflict; `fresh` also clears Undo. */
  | { type: 'syncGame'; game: SpGame; fresh: boolean }
  /** The server deleted this id (undone to no hand done): the game goes on under a new one. */
  | { type: 'renewSyncId'; syncId: string };
