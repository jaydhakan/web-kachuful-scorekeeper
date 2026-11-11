import type { KtPhase, Suit } from '@/games/kaali-teeri/domain';
import { TR } from '@/theme/trumps';

type Step = Exclude<KtPhase, 'done'>;

const PHASE: Record<Step, string> = {
  bidding: 'Bidding',
  calling: 'Trump and call',
  playing: 'Playing',
  result: 'Points',
};

/** Kaali Teeri's large-screen shell: the rail, the workspace headings, the score panel and the shortcuts. */
export const ktDesk = {
  logo: '3♠',
  nav: {
    label: 'Main',
    home: 'Home',
    game: 'Game',
    scores: 'Scores',
    rules: 'Rules',
    undo: 'Undo',
    menu: 'Menu',
    keys: 'Keys',
    setup: 'New game',
  },
  steps: {
    label: 'Hand steps',
    names: ['Bid', 'Call', 'Play', 'Points'] as const,
  },
  eyebrow: (n: number, phase: Step) => `Hand ${n} · ${PHASE[phase]}`,
  title: {
    quickPick: 'Who won the bid?',
    quickPicked: (name: string, bid: number) => `${name} · ${bid}`,
    high: (bid: number, name: string) => `High bid ${bid} · ${name}`,
    noBid: (name: string) => `${name} bids first`,
    won: (name: string, bid: number) => `${name} won at ${bid}`,
    trump: (suit: Suit, name: string, bid: number) => `${TR[suit].name} trump · ${name} ${bid}`,
  },
  endGame: 'End game',
  quick: {
    pickSeat: 'Pick the seat that won the bid',
    picked: 'Won the bid',
  },
  play: {
    bidLine: (name: string, bid: number) => `${name} bid ${bid}`,
  },
  scores: {
    title: 'Scores',
    after: (n: number) => (n ? `After hand ${n}` : 'No hands yet'),
    projected: (n: number) => `If hand ${n} is confirmed`,
    open: 'Open full scoreboard →',
  },
  hints: {
    seat: 'winner',
    amount: 'amount',
    confirm: 'confirm',
    pass: 'pass',
    mode: 'quick mode',
    trump: 'trump',
    card: 'who played',
    back: 'back to play',
  },
  keys: {
    title: 'Keyboard shortcuts',
    open: 'Keyboard shortcuts',
    list: [
      ['← →', 'Pick the winning bidder (quick mode)'],
      ['↑ ↓', 'Change the bid or the points'],
      ['0 – 9', 'Type the bid or the points (1, 8, 5 for 185)'],
      ['⏎', 'Confirm: the bid, trump, the call, hand over, the points, next hand'],
      ['P', 'Pass (full auction)'],
      ['M', 'Quick mode on or off'],
      ['S H D C', 'Name trump'],
      ['1 – 4', 'Who played a called card, while playing'],
      ['E', 'Back to play from the points'],
      ['Z', 'Undo'],
      ['B', 'Scoreboard'],
      ['I', 'Rules'],
      ['R', 'Rematch when the game is over'],
      ['N', 'New game, from Home or the end'],
      ['Esc', 'Close a panel'],
      ['?', 'Show this list'],
    ] as const,
  },
} as const;
