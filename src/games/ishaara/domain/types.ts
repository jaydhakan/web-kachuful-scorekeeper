// One players registry for every game; relative, because the mock API loads the domain outside Vite.
import type { Player } from '../../../people/types';
export type { Player };

export type Team = 'sun' | 'moon';
export type Identity = Team | 'blank' | 'trap';
/** 0–9, or 'inf' for ∞. */
export type ClueNumber = number | 'inf';
export type Role = 'clue-giver' | 'guesser';
export type ClueEntry = 'typed' | 'spoken';
export type EndedBy = 'all-found' | 'trap' | 'resign' | 'abandoned';

export interface IshaaraRules {
  timerSec: 60 | 120 | 180 | null;
  clueEntry: ClueEntry;
  packs: string[];
  bestOf: 1 | 3;
}

export interface Seated extends Player {
  team: Team;
  role: Role;
}

export interface Clue {
  team: Team;
  /** Null in spoken mode: the clue was said aloud. */
  word: string | null;
  number: ClueNumber;
}

export type LogType =
  'clue' | 'guess' | 'end' | 'timeout' | 'undo' | 'not-allowed' | 'penalty' | 'skip';

export interface LogEntry {
  at: number;
  /** The team whose turn it was, or for not-allowed and penalty the team that acted. */
  team: Team;
  type: LogType;
  word?: string;
  number?: ClueNumber;
  card?: number;
  identity?: Identity;
}

/** What a mis-tapped reveal undoes: the turn as it was before the guess (all public). */
export interface UndoSlot {
  card: number;
  until: number;
  turn: Team;
  clue: Clue | null;
  guessesLeft: number | 'inf';
  guessedThisTurn: number;
  deadline: number | null;
}

/**
 * Everything the table and the clue phones see. It never holds an unrevealed card's identity: `solution` is filled
 * only once the game is finished.
 */
export interface IshaaraPublic {
  kind: 'ishaara';
  schemaVersion: 1;
  id: string;
  rev: number;
  createdAt: number;
  updatedAt: number;
  finishedAt?: number;
  players: Seated[];
  words: string[];
  revealed: Array<Identity | null>;
  starting: Team;
  turn: Team;
  clue: Clue | null;
  guessesLeft: number | 'inf';
  guessedThisTurn: number;
  deadline: number | null;
  /** `penaltyFor` is the team whose clue was ruled out; the other team's clue-giver picks a free word. */
  pending: { penaltyFor: Team; since: number } | null;
  undo: UndoSlot | null;
  /** Which clue-givers have opened their key; the game starts when both have. */
  joined: Record<Team, boolean>;
  log: LogEntry[];
  rules: IshaaraRules;
  match: { game: number; sunWins: number; moonWins: number };
  status: 'waiting' | 'active' | 'finished';
  winner: Team | null;
  endedBy: EndedBy | null;
  solution: Identity[] | null;
}

export type Action =
  | { type: 'clue'; word: string | null; number: ClueNumber }
  | { type: 'guess'; card: number }
  | { type: 'endTurn' }
  | { type: 'timeout' }
  | { type: 'undoLast' }
  | { type: 'resign'; team: Team }
  | { type: 'skip' }
  | { type: 'notAllowed' }
  | { type: 'penaltyReveal'; card: number };

export type ActionType = Action['type'];

/** Who sends an action: the table (the host's screen) or a team's clue-giver. */
export type Actor = { kind: 'table' } | { kind: 'clue-giver'; team: Team };

export type InvalidReason =
  | 'not-started'
  | 'finished'
  | 'no-clue'
  | 'clue-given'
  | 'clue-format'
  | 'clue-blocked'
  | 'no-guess'
  | 'no-guesses-left'
  | 'bad-card'
  | 'bad-team'
  | 'revealed'
  | 'not-yours'
  | 'penalty-pending'
  | 'no-penalty'
  | 'too-early'
  | 'too-late'
  | 'nothing-to-undo';

export type ActionError =
  { code: 'not_your_turn' } | { code: 'invalid_action'; reason: InvalidReason };

export type ActionResult =
  { ok: true; state: IshaaraPublic } | { ok: false; error: ActionError; state: IshaaraPublic };

/** Derived per seated player when a game ends (the server's ishaara_game_players rows). */
export interface IshaaraPlayerRow {
  playerId: string;
  team: Team;
  role: Role;
  won: boolean;
  wordsFound: number;
  wrongPicks: number;
  trapHit: boolean;
  cluesGiven: number;
  avgClueNumber: number | null;
  penalties: number;
}
