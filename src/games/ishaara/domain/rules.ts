import { clueAllowed, guessesFor, isClueNumber } from './clue';
import type {
  Action,
  ActionError,
  ActionResult,
  Actor,
  Identity,
  InvalidReason,
  IshaaraPublic,
  IshaaraRules,
  Seated,
  Team,
} from './types';

export const GRID = 25;
export const BLANKS = 7;
/** A mis-tapped reveal can be undone from the table for this long, if nothing else happened since. */
export const UNDO_MS = 10_000;
/** After this long the host can skip a penalty pick nobody made. */
export const SKIP_AFTER_MS = 60_000;
export const MIN_TEAM = 2;

export const other = (t: Team): Team => (t === 'sun' ? 'moon' : 'sun');
/** The starting team has 9 words, the other 8. */
export const wordsOf = (state: Pick<IshaaraPublic, 'starting'>, team: Team) =>
  team === state.starting ? 9 : 8;

/** Words of a team still face down, from public state alone. */
export function wordsLeft(state: Pick<IshaaraPublic, 'starting' | 'revealed'>, team: Team): number {
  return wordsOf(state, team) - state.revealed.filter((r) => r === team).length;
}

export const isOver = (state: Pick<IshaaraPublic, 'status'>) => state.status === 'finished';
export const clueGiverOf = (state: Pick<IshaaraPublic, 'players'>, team: Team) =>
  state.players.find((p) => p.team === team && p.role === 'clue-giver');

export interface NewGame {
  id: string;
  players: Seated[];
  words: string[];
  rules: IshaaraRules;
  starting: Team;
  now: number;
  match?: IshaaraPublic['match'];
}

/** A game as created on the server: waiting for both clue-givers to open their key. */
export function newGame(g: NewGame): IshaaraPublic {
  return {
    kind: 'ishaara',
    schemaVersion: 1,
    id: g.id,
    rev: 1,
    createdAt: g.now,
    updatedAt: g.now,
    players: g.players,
    words: g.words,
    revealed: Array<Identity | null>(GRID).fill(null),
    starting: g.starting,
    turn: g.starting,
    clue: null,
    guessesLeft: 0,
    guessedThisTurn: 0,
    deadline: null,
    pending: null,
    undo: null,
    joined: { sun: false, moon: false },
    log: [],
    rules: g.rules,
    match: g.match ?? { game: 1, sunWins: 0, moonWins: 0 },
    status: 'waiting',
    winner: null,
    endedBy: null,
    solution: null,
  };
}

/** A clue-giver opened their key; the game starts once both have. */
export function join(state: IshaaraPublic, team: Team, now: number): IshaaraPublic {
  if (state.joined[team] || state.status === 'finished') return state;
  const joined = { ...state.joined, [team]: true };
  const status = joined.sun && joined.moon ? 'active' : state.status;
  return { ...state, joined, status, rev: state.rev + 1, updatedAt: now };
}

type Step = IshaaraPublic | ActionError;
const bad = (reason: InvalidReason): ActionError => ({ code: 'invalid_action', reason });
const notYours: ActionError = { code: 'not_your_turn' };
const isErr = (s: Step): s is ActionError => 'code' in s;

function endTurn(s: IshaaraPublic): IshaaraPublic {
  return {
    ...s,
    turn: other(s.turn),
    clue: null,
    guessesLeft: 0,
    guessedThisTurn: 0,
    deadline: null,
  };
}

function finish(
  s: IshaaraPublic,
  winner: Team | null,
  endedBy: IshaaraPublic['endedBy'],
  key: Identity[],
  now: number,
) {
  const match = { ...s.match };
  if (winner === 'sun') match.sunWins++;
  if (winner === 'moon') match.moonWins++;
  return {
    ...s,
    status: 'finished' as const,
    winner,
    endedBy,
    finishedAt: now,
    clue: null,
    guessesLeft: 0,
    deadline: null,
    pending: null,
    undo: null,
    match,
    solution: [...key],
  };
}

/** After a card turns: the trap loses for whoever revealed it; a team with every word found wins, on any turn. */
function afterReveal(
  s: IshaaraPublic,
  by: Team,
  id: Identity,
  key: Identity[],
  now: number,
): IshaaraPublic | null {
  if (id === 'trap') return finish(s, other(by), 'trap', key, now);
  if (id === 'sun' || id === 'moon') {
    if (wordsLeft(s, id) === 0) return finish(s, id, 'all-found', key, now);
  }
  return null;
}

/** Applies an overdue timer before anything else (§2.3): the next action after the deadline ends the turn first. */
export function settle(state: IshaaraPublic, now: number): IshaaraPublic {
  if (state.status !== 'active' || state.deadline === null || now < state.deadline) return state;
  const s = endTurn({ ...state, undo: null });
  return {
    ...s,
    log: [...s.log, { at: now, team: state.turn, type: 'timeout' }],
    rev: state.rev + 1,
    updatedAt: now,
  };
}

function clue(
  s: IshaaraPublic,
  a: Extract<Action, { type: 'clue' }>,
  actor: Actor,
  now: number,
): Step {
  if (actor.kind !== 'clue-giver' || actor.team !== s.turn) return notYours;
  if (s.pending) return bad('penalty-pending');
  if (s.clue) return bad('clue-given');
  if (!isClueNumber(a.number)) return bad('clue-format');
  let word: string | null = null;
  if (s.rules.clueEntry === 'typed') {
    if (typeof a.word !== 'string') return bad('clue-format');
    const check = clueAllowed(a.word, s);
    if (!check.ok)
      return bad(
        check.reason === 'empty' || check.reason === 'format' ? 'clue-format' : 'clue-blocked',
      );
    word = a.word.normalize('NFC').trim();
  } else if (a.word !== null && a.word !== undefined) return bad('clue-format');
  const deadline = s.rules.timerSec ? now + s.rules.timerSec * 1000 : null;
  return {
    ...s,
    clue: { team: s.turn, word, number: a.number },
    guessesLeft: guessesFor(a.number),
    guessedThisTurn: 0,
    deadline,
    log: [
      ...s.log,
      { at: now, team: s.turn, type: 'clue', number: a.number, ...(word !== null && { word }) },
    ],
  };
}

const cardOk = (card: unknown): card is number =>
  typeof card === 'number' && Number.isInteger(card) && card >= 0 && card < GRID;

function guess(s: IshaaraPublic, card: number, actor: Actor, key: Identity[], now: number): Step {
  if (actor.kind !== 'table') return notYours;
  if (s.pending) return bad('penalty-pending');
  if (!s.clue) return bad('no-clue');
  if (s.guessesLeft !== 'inf' && s.guessesLeft <= 0) return bad('no-guesses-left');
  if (!cardOk(card)) return bad('bad-card');
  if (s.revealed[card] !== null) return bad('revealed');
  const id = key[card];
  const team = s.turn;
  const revealed = s.revealed.slice();
  revealed[card] = id;
  const undo = {
    card,
    until: now + UNDO_MS,
    turn: s.turn,
    clue: s.clue,
    guessesLeft: s.guessesLeft,
    guessedThisTurn: s.guessedThisTurn,
    deadline: s.deadline,
  };
  let next: IshaaraPublic = {
    ...s,
    revealed,
    guessedThisTurn: s.guessedThisTurn + 1,
    guessesLeft: s.guessesLeft === 'inf' ? 'inf' : s.guessesLeft - 1,
    undo,
    log: [...s.log, { at: now, team, type: 'guess', card, word: s.words[card], identity: id }],
  };
  const over = afterReveal(next, team, id, key, now);
  if (over) return over;
  if (id !== team || next.guessesLeft === 0) next = endTurn(next);
  return next;
}

function endTurnAction(s: IshaaraPublic, actor: Actor, now: number): Step {
  if (actor.kind !== 'table') return notYours;
  if (s.pending) return bad('penalty-pending');
  if (!s.clue) return bad('no-clue');
  if (s.guessedThisTurn < 1) return bad('no-guess');
  return { ...endTurn(s), log: [...s.log, { at: now, team: s.turn, type: 'end' }] };
}

function undoLast(s: IshaaraPublic, actor: Actor, now: number): Step {
  if (actor.kind !== 'table') return notYours;
  const u = s.undo;
  if (!u) return bad('nothing-to-undo');
  if (now > u.until) return bad('too-late');
  const revealed = s.revealed.slice();
  revealed[u.card] = null;
  // The guess leaves the log with its identity, so the card is face down in every sense again.
  const log = s.log.slice();
  const at = log.map((e) => e.type === 'guess' && e.card === u.card).lastIndexOf(true);
  if (at >= 0) log.splice(at, 1);
  log.push({ at: now, team: u.turn, type: 'undo', card: u.card, word: s.words[u.card] });
  return {
    ...s,
    revealed,
    turn: u.turn,
    clue: u.clue,
    guessesLeft: u.guessesLeft,
    guessedThisTurn: u.guessedThisTurn,
    deadline: u.deadline,
    undo: null,
    log,
  };
}

function notAllowed(s: IshaaraPublic, actor: Actor, now: number): Step {
  if (actor.kind !== 'clue-giver' || actor.team === s.turn) return notYours;
  if (s.pending) return bad('penalty-pending');
  if (!s.clue) return bad('no-clue');
  if (s.guessedThisTurn > 0) return bad('too-late');
  const offender = s.turn;
  const next = endTurn(s);
  return {
    ...next,
    pending: { penaltyFor: offender, since: now },
    log: [...s.log, { at: now, team: actor.team, type: 'not-allowed' }],
  };
}

function penaltyReveal(
  s: IshaaraPublic,
  card: number,
  actor: Actor,
  key: Identity[],
  now: number,
): Step {
  if (!s.pending) return bad('no-penalty');
  const picker = other(s.pending.penaltyFor);
  if (actor.kind !== 'clue-giver' || actor.team !== picker) return notYours;
  if (!cardOk(card)) return bad('bad-card');
  if (s.revealed[card] !== null) return bad('revealed');
  if (key[card] !== picker) return bad('not-yours');
  const revealed = s.revealed.slice();
  revealed[card] = picker;
  const next: IshaaraPublic = {
    ...s,
    revealed,
    pending: null,
    log: [
      ...s.log,
      { at: now, team: picker, type: 'penalty', card, word: s.words[card], identity: picker },
    ],
  };
  return afterReveal(next, picker, picker, key, now) ?? next;
}

function skip(s: IshaaraPublic, actor: Actor, now: number): Step {
  if (actor.kind !== 'table') return notYours;
  if (!s.pending) return bad('no-penalty');
  if (now < s.pending.since + SKIP_AFTER_MS) return bad('too-early');
  return {
    ...s,
    pending: null,
    log: [...s.log, { at: now, team: other(s.pending.penaltyFor), type: 'skip' }],
  };
}

function timeout(actor: Actor): Step {
  if (actor.kind !== 'table') return notYours;
  // settle() has already ended an overdue turn; reaching here means the deadline hasn't passed.
  return bad('too-early');
}

function resign(s: IshaaraPublic, team: unknown, actor: Actor, key: Identity[], now: number): Step {
  if (actor.kind !== 'table') return notYours;
  if (team !== 'sun' && team !== 'moon') return bad('bad-team');
  return finish(s, other(team), 'resign', key, now);
}

function step(s: IshaaraPublic, a: Action, actor: Actor, key: Identity[], now: number): Step {
  switch (a.type) {
    case 'clue':
      return clue(s, a, actor, now);
    case 'guess':
      return guess(s, a.card, actor, key, now);
    case 'endTurn':
      return endTurnAction(s, actor, now);
    case 'timeout':
      return timeout(actor);
    case 'undoLast':
      return undoLast(s, actor, now);
    case 'resign':
      return resign(s, a.team, actor, key, now);
    case 'skip':
      return skip(s, actor, now);
    case 'notAllowed':
      return notAllowed(s, actor, now);
    case 'penaltyReveal':
      return penaltyReveal(s, a.card, actor, key, now);
  }
}

/**
 * The game's one rule engine: the server (and the mock API) run every action through it. On an error `state` is the
 * settled state (an overdue timer still ends the turn), otherwise the new one with `rev` bumped.
 */
export function applyAction(
  state: IshaaraPublic,
  key: Identity[],
  action: Action,
  actor: Actor,
  now: number,
): ActionResult {
  if (state.status === 'finished') return { ok: false, error: bad('finished'), state };
  if (state.status === 'waiting') return { ok: false, error: bad('not-started'), state };
  const settled = settle(state, now);
  if (action.type === 'timeout' && settled !== state) return { ok: true, state: settled };
  // Anything after a reveal closes its undo window, except the undo itself.
  const base = action.type === 'undoLast' ? settled : { ...settled, undo: null };
  const out = step(base, action, actor, key, now);
  if (isErr(out)) return { ok: false, error: out, state: settled };
  return { ok: true, state: { ...out, rev: settled.rev + 1, updatedAt: now } };
}
