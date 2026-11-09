import type {
  CardRef,
  Copy,
  CountedBy,
  KtGame,
  KtLength,
  KtMode,
  Suit,
} from '@/games/kaali-teeri/domain';
import type { Direction, Seat } from '@/people';

/** The game screens; a hand's own step (bid, call, play, result) and the summary follow from the game itself. */
export type KtScreen = 'home' | 'setup' | 'game' | 'winner';
/** What a reload reopens: a game in progress, else home. */
export type KtSavedScreen = 'home' | 'game';
export type Dir = 1 | -1;

/** This device's choices, remembered across games. */
export interface KtPrefs {
  /** Quick mode (record the winning bid) rather than the full auction. */
  quick: boolean;
  /** Which side's points the result screen asks for first. */
  countedBy: CountedBy;
}

export const DEFAULT_PREFS: KtPrefs = { quick: true, countedBy: 'defenders' };

/** The last table seated on this device, offered at the next setup. */
export interface KtLastGroup {
  players: Pick<Seat, 'name' | 'emoji' | 'color' | 'playerId'>[];
  direction: Direction;
  minBid: number;
  step: 5 | 10;
  length: KtLength;
  /** When it was saved (epoch ms). */
  at: number;
}

export interface KtSetup {
  step: 1 | 2 | 3;
  /** 4 to 10; the decks, partners and default minimum follow from it. */
  n: number;
  dir: Direction;
  /** Null follows the deck's default (150 / 350), so changing the count never strands a custom minimum. */
  minBid: number | null;
  bidStep: 5 | 10;
  length: KtLength;
  seats: (Seat | null)[];
  dealer: number;
  lg: KtLastGroup | null;
}

export type KtSheet =
  | { type: 'menu' | 'rules' | 'board' | 'share' | 'theme' }
  | { type: 'edit'; i: number }
  /** The card picker: a new called card (i null) or called card i. */
  | { type: 'card'; i: number | null }
  | { type: 'playedBy'; i: number }
  | { type: 'seat' | 'rename' | 'avatar'; k: number }
  | { type: 'addPlayer'; name?: string };

/** Home's hub links. */
export type KtHubPage = 'history' | 'leaderboard' | 'stats';

/** A page opened over the game screens; ids are player keys (`playerKey`) and game sync ids. */
export type KtRoute =
  | { page: 'history' | 'leaderboard' | 'players' }
  | { page: 'game'; id: string }
  | { page: 'player'; id: string }
  | { page: 'h2h'; a: string; b: string };

export type KtModal = 'finish' | 'abandon';

export interface KtToast {
  id: number;
  msg: string;
  undo: boolean;
}

export interface KtBanner {
  id: number;
  text: string;
}

export interface KtState {
  /** Null when no game is on the table (none started, or one abandoned before any hand was done). */
  game: KtGame | null;
  screen: KtScreen;
  dir: Dir;
  setup: KtSetup | null;
  /** Pages open over the screen, top last; any screen change closes them all. */
  pages: KtRoute[];
  undo: string[];
  prefs: KtPrefs;
  sheet: KtSheet | null;
  modal: KtModal | null;
  toast: KtToast | null;
  banner: KtBanner | null;
  /** The deal animation for the hand just started; `prev` is the previous dealer's seat. */
  deal: { index: number; prev: number | null } | null;
  noteSeq: number;
  /** The winner screen's first showing (confetti), not a reopening. */
  fresh: boolean;
  /** The saved game couldn't be read: saving waits until the player chooses Reset or Keep backup. */
  corrupt: boolean;
}

/** Everything the Edit sheet sets on a done hand; totals recompute from it. */
export interface KtHandEdit {
  bidder: string;
  bid: number;
  trump: Suit;
  called: CardRef[];
  playedBy: string[];
  /** The number the table entered, for the side in `countedBy`. */
  entered: number;
  countedBy: CountedBy;
}

/** One auction turn for whoever speaks next: a bid, a pass, or taking it at the minimum when everyone passed. */
export type KtCallWhat = number | 'pass' | 'forced';

export type KtAction =
  // Screens and overlays
  | { type: 'go'; screen: KtScreen; dir?: Dir }
  | { type: 'resume' }
  | { type: 'sheet'; sheet: KtSheet | null }
  | { type: 'openPage'; route: KtRoute }
  | { type: 'closePage' }
  | { type: 'modal'; modal: KtModal | null }
  | { type: 'say'; msg: string; undo?: boolean }
  | { type: 'toastDone' }
  | { type: 'bannerDone' }
  | { type: 'dealDone' }
  | { type: 'setFresh'; v: boolean }
  // Setup
  | { type: 'startSetup'; lg: KtLastGroup | null }
  | { type: 'setupStep'; step: 1 | 2 | 3 }
  | { type: 'setupCount'; n: number }
  | { type: 'setupDir'; dir: Direction }
  | { type: 'setupMinBid'; minBid: number | null }
  | { type: 'setupBidStep'; step: 5 | 10 }
  | { type: 'setupLength'; length: KtLength }
  | { type: 'setupSeat'; k: number; seat: Seat | null }
  | { type: 'setupSeatPatch'; k: number; patch: Partial<Seat> }
  | { type: 'setupSwap'; a: number; b: number }
  | { type: 'setupLastGroup' }
  | { type: 'setupDealer'; k: number }
  | { type: 'beginGame'; id: string; syncId: string; now: number; playerIds: string[] }
  // Bidding
  | { type: 'setMode'; mode: KtMode }
  | { type: 'quickBid'; bidder: string; bid: number }
  | { type: 'call'; what: KtCallWhat }
  // Trump and the call
  | { type: 'trump'; suit: Suit }
  | { type: 'addCard'; card: CardRef }
  | { type: 'removeCard'; i: number }
  | { type: 'setCopy'; i: number; copy: Copy }
  | { type: 'confirmCall' }
  // Play and result
  | { type: 'markPlayed'; i: number; by: string | null }
  | { type: 'toResult' }
  | { type: 'toPlay' }
  | { type: 'countedBy'; by: CountedBy }
  | { type: 'points'; entered: number | null }
  | { type: 'confirmHand' }
  // Between hands and after
  | { type: 'nextHand' }
  | { type: 'finishGame' }
  | { type: 'abandon' }
  | { type: 'editHand'; i: number; edit: KtHandEdit }
  | { type: 'rematch'; id: string; syncId: string; now: number }
  | { type: 'undo' }
  | { type: 'openGame'; game: KtGame }
  /** The repair prompt's answer: the unreadable save is set aside and the table starts empty. */
  | { type: 'repaired' };
