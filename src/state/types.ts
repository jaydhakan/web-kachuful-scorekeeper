import type {
  Decks,
  Direction,
  Game,
  LengthMode,
  Outcome,
  Phase,
  Round,
  StreakEvent,
} from '@/domain';
import type { LastGroup } from './persistence';

export type Screen = 'home' | 'setup' | 'round' | 'winner';

/** Screens opened over the game screens; the stack is what Back walks through. */
export type RouteName =
  | 'history'
  | 'game'
  | 'leaderboard'
  | 'player'
  | 'h2h'
  | 'achievements'
  | 'awards'
  | 'wrapped'
  | 'activity'
  | 'players'
  | 'signin'
  | 'invite'
  | 'reset'
  | 'account'
  | 'admin'
  | 'live'
  | 'recap'
  | 'import';

export interface Route {
  screen: RouteName;
  params?: Record<string, string>;
}
export type Dir = 1 | -1;

export interface Seat {
  name: string;
  emoji: string;
  color: string;
  /** The registry player picked for this seat, when picked from the list. */
  playerId?: string;
}

export interface SetupState {
  step: 1 | 2 | 3;
  decks: Decks;
  n: number | null;
  dir: Direction;
  seats: (Seat | null)[];
  dealer: number;
  length: LengthMode;
  lg: LastGroup | null;
}

export type SheetState =
  | { type: 'menu' | 'rules' | 'board' | 'upcoming' | 'share' }
  | { type: 'edit'; i: number }
  | { type: 'seat' | 'rename' | 'avatar'; k: number };

export type ModalKind = 'endGame';

export interface Toast {
  id: number;
  msg: string;
  undo: boolean;
  /** A screen the toast offers to open instead of Undo. */
  link?: { label: string; route: Route };
}

export interface Banner {
  id: number;
  text: string;
}

/** The deal animation shown at the start of each round. */
export interface RoundStartSeq {
  round: Round;
  prev: number | null;
  banner: string | null;
}

export interface AppState {
  game: Game;
  screen: Screen;
  /** Screens opened on top of `screen`, last one showing. Never saved: a reload starts at the game screens. */
  nav: Route[];
  dir: Dir;
  setup: SetupState | null;
  undo: string[];
  sheet: SheetState | null;
  modal: ModalKind | null;
  toast: Toast | null;
  banner: Banner | null;
  seq: RoundStartSeq | null;
  fresh: boolean;
  sumAnim: boolean;
  /** Streaks that reached a step in the round just confirmed, celebrated before the summary counts up. */
  streakFx: StreakEvent[] | null;
  /** A pending move of the "who bids now" pointer, applied shortly after a bid. */
  advance: { idx: number } | null;
  noteSeq: number;
  corrupt: boolean;
  /** The player whose result the app filled in because only one could work; cleared by the next action. */
  autoResult: string | null;
}

export type Action =
  | { type: 'go'; screen: Screen; dir?: Dir }
  | { type: 'startSetup'; lg: LastGroup | null }
  | { type: 'setupPatch'; patch: Partial<SetupState> }
  | { type: 'setupSeat'; k: number; seat: Seat | null }
  | { type: 'setupSeatPatch'; k: number; patch: Partial<Seat> }
  | { type: 'setupSwap'; a: number; b: number }
  | { type: 'beginGame'; id: string; syncId: string; now: number; playerIds?: string[] }
  | { type: 'resume' }
  | { type: 'bid'; v: number }
  | { type: 'advanceBid'; idx: number }
  | { type: 'pickSeat'; k: number }
  | { type: 'phase'; phase: Phase; dir?: Dir }
  | { type: 'setResult'; id: string; v: Outcome }
  | { type: 'setTricks'; id: string; d: number }
  | { type: 'toggleExact' }
  | { type: 'confirmRound' }
  | { type: 'nextRound' }
  | { type: 'finishGame' }
  | { type: 'rematch'; id: string; syncId: string; now: number }
  | { type: 'editRound'; i: number; bids: Record<string, number>; results: Record<string, Outcome> }
  | { type: 'undo' }
  | { type: 'sheet'; sheet: SheetState | null }
  | { type: 'modal'; modal: ModalKind | null }
  | { type: 'seqDone' }
  | { type: 'say'; msg: string; undo?: boolean; link?: Toast['link'] }
  | { type: 'navPush'; route: Route }
  | { type: 'navPop' }
  | { type: 'navReset'; routes?: Route[] }
  | { type: 'toastDone' }
  | { type: 'bannerDone' }
  | { type: 'setFresh'; v: boolean }
  | { type: 'setSumAnim'; v: boolean }
  | { type: 'streakDone' }
  | { type: 'replaceGame'; game: Game }
  /** Makes a saved game the current one (the current one is already in History). */
  | { type: 'openGame'; game: Game };
