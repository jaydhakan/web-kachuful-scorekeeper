import type { ClueCheck, ClueNumber, EndedBy, Identity, Team } from '@/games/ishaara/domain';
import type { IshaaraErrorReason } from '@/games/ishaara/sync/types';

const TEAM: Record<Team, string> = { sun: 'Sun', moon: 'Moon' };
const up = (w: string) => w.toUpperCase();
const num = (n: ClueNumber) => (n === 'inf' ? '∞' : String(n));

const REASONS: Partial<Record<IshaaraErrorReason, string>> = {
  'not-started': 'The game hasn’t started yet.',
  finished: 'The game is over.',
  'no-clue': 'There’s no clue to rule out yet.',
  'clue-given': 'A clue has already been given this turn.',
  'clue-format': 'One word only: letters, with hyphens between parts.',
  'clue-blocked': 'That clue matches a word still face down.',
  'too-late': 'Too late: they’ve already guessed.',
  revealed: 'That word is already revealed.',
  'not-yours': 'Pick one of your own words.',
  'penalty-pending': 'Waiting for a penalty pick first.',
  'no-penalty': 'There’s no penalty to pick for any more.',
};

/** The clue-giver's phone: Your games, the key gate and the key with its clue entry. */
export const clue = {
  team: TEAM,
  num,
  identity: {
    sun: 'Sun’s word',
    moon: 'Moon’s word',
    blank: 'blank',
    trap: 'the trap',
  } satisfies Record<Identity, string>,
  count: { sun: 'Sun', moon: 'Moon', blank: 'Blank', trap: 'Trap' } satisfies Record<
    Identity,
    string
  >,

  list: {
    title: 'Your games',
    back: 'Back to Ishaara',
    loading: 'Looking for your games…',
    emptyTitle: 'No games for you right now',
    empty:
      'When a host makes you a clue-giver, the game shows up here. Your key opens on this phone only.',
    error: 'Couldn’t load your games.',
    offline: 'You’re offline. These may be out of date.',
    retry: 'Try again',
    role: (team: Team, host: string) =>
      host
        ? `You’re ${TEAM[team]}’s clue-giver in ${host}’s game`
        : `You’re ${TEAM[team]}’s clue-giver`,
    meta: (ago: string, players: number) => `Ishaara · started ${ago} · ${players} players`,
    open: 'Open your key',
    footnote: 'Your key stays on this phone. Give your clue out loud or type it here on your turn.',
  },

  gate: {
    title: 'Make sure nobody else can see',
    body: 'Your key shows which words are Sun’s, Moon’s, blank, and the trap.',
    show: 'Show key',
    notYet: 'Not yet',
  },
  pill: (team: Team, name: string | null) =>
    name ? `${TEAM[team]} clue-giver · ${name}` : `${TEAM[team]} clue-giver`,
  hide: 'Hide',
  hideLabel: 'Hide key',

  load: {
    game: 'Opening the game…',
    key: 'Opening your key…',
    gameError: 'Couldn’t open this game.',
    keyError: 'Couldn’t open your key.',
    forbidden: 'This key isn’t yours: only the two clue-givers can see it.',
    gone: 'This game has ended or was deleted.',
    retry: 'Try again',
    back: 'Back to your games',
  },

  status: {
    yourClue: (t: Team) => `${TEAM[t]}’s turn: your clue`,
    yourGuessing: (t: Team) => `${TEAM[t]}’s turn: guessing`,
    theirs: (t: Team) => `Waiting: ${TEAM[t]}’s turn`,
    picking: 'Your pick',
    waiting: 'Waiting to start',
    finished: 'Game over',
    left: (t: Team, n: number) => `${TEAM[t]} ${n} left`,
  },
  countsLabel: 'Words on your key',
  keyLabel: 'Your key',
  card: (word: string, id: Identity, revealed: boolean) =>
    `${up(word)}, ${clue.identity[id]}${revealed ? ', revealed' : ''}`,

  entry: {
    label: 'Your clue · one word',
    placeholder: 'Type your clue',
    howMany: 'How many words',
    spokenHint: 'Say your clue out loud, then send how many words it points to.',
    send: (w: string, n: ClueNumber) => `Send ${up(w)} · ${num(n)}`,
    sendBare: 'Send clue',
    spokenSend: (n: ClueNumber) => `Clue given · ${num(n)}`,
    spokenBare: 'Pick how many words',
    infLabel: 'Any number',
    ok: 'Not on the board. The table can still rule it out.',
  },
  check: (c: Exclude<ClueCheck, { ok: true }>, typed: string): string => {
    if (!('word' in c))
      return c.reason === 'empty' ? '' : 'One word only: letters, with hyphens between parts.';
    const w = up(c.word);
    if (c.reason === 'same') return `${w} is on the board, still face down`;
    if (c.reason === 'form') return `${up(typed.trim())} is a form of ${w}, still face down`;
    return `${up(typed.trim())} contains ${w}, still face down`;
  },

  ours: {
    title: (t: Team) => `${TEAM[t]} is guessing`,
    typed: (w: string, n: ClueNumber) => `Your clue: ${up(w)} · ${num(n)}`,
    spoken: (n: ClueNumber) => `Clue given · ${num(n)}`,
    guessesLeft: (n: number | 'inf') =>
      n === 'inf' ? 'Guesses: as many as they want' : `${n} ${n === 1 ? 'guess' : 'guesses'} left`,
    hint: 'Keep a straight face while they talk it over.',
  },
  theirs: {
    title: (t: Team) => `${TEAM[t]} is guessing`,
    thinking: (t: Team) => `${TEAM[t]}’s clue-giver is thinking`,
    typed: (name: string, w: string, n: ClueNumber) => `${name}’s clue: ${up(w)} · ${num(n)}`,
    spoken: (name: string, n: ClueNumber) => `${name}: clue given · ${num(n)}`,
    hint: (t: Team) => `You’re up after ${TEAM[t]}’s turn. Keep your key covered while they talk.`,
    notAllowed: 'Not allowed',
    notAllowedHint:
      'Rule this clue out (a rhyme, a translation, a letter clue) before their first guess.',
    tooLate: 'They’ve guessed, so this clue stands.',
    confirmTitle: 'Rule this clue out?',
    confirmBody: (t: Team) =>
      `${TEAM[t]}’s turn ends now, and you pick one of your own words to reveal for free.`,
    confirm: 'Yes, not allowed',
    cancel: 'Cancel',
  },
  penalty: {
    pick: 'Pick one of your words to reveal',
    pickHint: 'Their clue was ruled out. Tap one of your face-down words, then confirm.',
    confirm: (w: string) => `Reveal ${up(w)}`,
    another: 'Choose another',
    chosen: (w: string) => `${up(w)} will be revealed for your team.`,
    against: (t: Team) =>
      `Your clue was ruled out. ${TEAM[t]}’s clue-giver is picking one of their words.`,
  },
  waiting: {
    title: 'Waiting for the game to start',
    body: 'It starts when both clue-givers have opened their key.',
  },
  timer: (s: string) => `${s} left`,
  timerLabel: 'Time left this turn',
  reconnecting: 'Reconnecting…',
  finished: {
    won: (t: Team) => `${TEAM[t]} wins`,
    by: {
      'all-found': 'All their words found.',
      trap: 'The trap was picked.',
      resign: 'The other team resigned.',
      abandoned: 'The game was left unfinished.',
    } satisfies Record<EndedBy, string>,
    you: (won: boolean) => (won ? 'Your team won.' : 'Your team lost this one.'),
    next: 'Next game',
    back: 'Back to your games',
  },

  errors: {
    offline: 'You’re offline. Try again once you’re reconnected.',
    notYourTurn: 'It isn’t your turn any more.',
    stale: 'The game moved on. Here’s the latest.',
    generic: 'That didn’t go through. Try again.',
    reasons: REASONS,
  },
} as const;
