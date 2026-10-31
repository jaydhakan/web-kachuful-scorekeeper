import type { ReactNode } from 'react';
import type { Direction, Trump } from '@/domain';
import { messages } from './messages';
import { SuitGlyph } from '@/components/ui/SuitGlyph';
import { TR } from '@/theme/trumps';

/**
 * Every user-visible string lives here (English only, no i18n library). Sentences that carry markup are
 * functions returning JSX so a translator sees the whole sentence in one place.
 */
const side = (dir: Direction) => (dir === 'cw' ? 'left' : 'right');
const b = (s: ReactNode) => <b>{s}</b>;
// A two-line segmented option, so "2 cycles / 14 rounds" never has to wrap mid-label.
const stacked = (title: string, rounds: number) => (
  <span className="flex flex-col items-center leading-[1.15]">
    {title}
    <span className="text-13 font-medium">{rounds} rounds</span>
  </span>
);

export const t = {
  appName: 'Kachuful',
  tagline: 'Judgement scorekeeper',
  common: {
    cancel: 'Cancel',
    back: 'Back',
    close: 'Close',
    next: 'Next',
    done: 'Done',
    content: 'Content',
    save: 'Save',
    home: 'Home',
    undo: 'Undo',
  },

  table: {
    deals: 'DEALS',
    first: '1st',
    seat: (k: number, name?: string) => (name ? `Seat ${k}: ${name}` : `Seat ${k}`),
    made: '✓',
    missed: '✗',
  },
  suit: {
    cards: (n: number) => `${n} cards`,
    big: (name: string, n: number): ReactNode => (
      <>
        {b(name)} · {n} cards
      </>
    ),
  },

  home: {
    resume: 'Resume game',
    demoBadge: 'Demo',
    demoTitle: 'Try the demo',
    demoBody: 'A 5-player game, 6 rounds in. Tap around — your own games start with New Game.',
    finished: 'Game finished',
    wonWith: (name: string, pts: string) => `${name} won with ${pts}`,
    roundsPlayed: (n: number) => `${n} rounds played`,
    roundLine: (round: number, cards: number, trump: Trump) => (
      <>
        Round {round} · {cards} cards · <SuitGlyph trump={trump} /> {TR[trump].name}
      </>
    ),
    dealing: (name: string) => `${name} is dealing`,
    leads: (name: string, pts: string) => `${name} leads · ${pts}`,
    saved: (ago: string) => `Saved ${ago}`,
    howToPlay: 'How to play',
    newGame: 'New Game',
  },

  modals: {
    endGame: { text: 'End the game and crown the winner?', ok: 'End game' },
    repair: {
      text: "Saved game couldn't be read. Reset starts fresh. Keep backup starts fresh too, but stores a copy of the unreadable data on this device.",
      keep: 'Keep backup',
      reset: 'Reset',
    },
  },

  setup: {
    stepOf: (n: number) => `Step ${n} of 3`,
    step1Title: 'How many players?',
    useLastGroup: (names: string[]) =>
      `↺ Use last group: ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3}` : ''}`,
    players: (n: number) => `${n} players`,
    playerCount: 'Number of players',
    directionLabel: 'Seating direction',
    seats: (n: number) => `${n} seats`,
    tapNumber: 'Pick a player count',
    cw: '⟳ Clockwise',
    ccw: '⟲ Anticlockwise',
    info: (n: number | null, max: number) =>
      n
        ? `Max ${max} cards · 3 → ${max} → 3, repeating`
        : 'Pick the number of players to see the table',
    step2Title: 'Seat the table',
    everyoneSeated: 'Everyone is seated',
    dealingFirst: "Who's dealing first?",
    finally: (prev: string, dir: Direction) => `And finally, on ${prev}'s ${side(dir)}?`,
    sittingOn: (prev: string, dir: Direction) => `Who's sitting on ${prev}'s ${side(dir)}?`,
    thePlayerBefore: 'the player before',
    typeName: 'Type a name',
    recentNames: 'Recent names',
    recentHint: 'Names you add are remembered for next time.',
    playerName: 'Player name',
    add: 'Add',
    alreadySeated: (name: string) => `${name} is already at the table.`,
    seated: (filled: number, n: number) => `${filled} of ${n} seated`,
    step3Title: 'Ready to deal',
    deal: 'Deal!',
    dealsFirst: (name: string): ReactNode => <>👑 {b(name)} deals first</>,
    firstCardTo: (name: string): ReactNode => <>👉 First card to {b(name)}</>,
    roundOne: '🃏 3 cards each · ♠ Spades are trump',
    random: '🎲 Random',
    dragHint: 'Tap a seat to move the dealer. Press and hold, then drag, to swap seats.',
    dragHintShort: 'Tap a seat to move the dealer. Hold and drag to swap.',
    gameLength: 'Game length',
    lengthOptions: (L: number) => [
      { v: 'endless' as const, label: 'Endless' },
      {
        v: '1cycle' as const,
        label: stacked('1 cycle', L),
      },
      {
        v: '2cycles' as const,
        label: stacked('2 cycles', 2 * L),
      },
    ],
  },

  round: {
    menu: 'Menu',
    scoreboard: 'Scoreboard',
    title: (n: number) => `Round ${n}`,
    banner: messages.banner,
    deal: (
      dealer: string,
      cards: number,
      first: string,
      trump: Trump,
      arrow: string,
    ): ReactNode => (
      <>
        👑 {b(dealer)} deals {b(cards)} cards each · first card to {b(first)} ·{' '}
        <SuitGlyph trump={trump} /> {TR[trump].name} trump{' '}
        <b className="text-[var(--accent)]">{arrow}</b>
      </>
    ),
  },

  bidding: {
    earlierBidInvalid: 'Your earlier bid isn’t allowed any more. Pick again.',
    dealerLast: 'Dealer — bids last',
    first: 'Bids 1st · gets the first card',
    nth: (i: number, n: number) => `Bids ${i} of ${n}`,
    cantBid: (forb: number, cards: number) =>
      `Can’t bid ${forb} — total would equal ${cards} cards`,
    cantBidShort: (forb: number, cards: number) => `Can’t bid ${forb}: total would be ${cards}`,
    startPlaying: 'Start playing',
    bidsIn: (cnt: number, n: number) => `${cnt} of ${n} bids in`,
    bid: (v: number) => `Bid ${v}`,
    bidFor: (name: string) => `Bid for ${name}`,
    locked: (v: number) => `Locked ${v}`,
    total: (sum: number, cards: number) => `Bids ${sum} / ${cards} cards`,
    under: (d: number) => `Under by ${d}`,
    over: (d: number) => `Over by ${d}`,
    level: 'Exactly level',
  },

  play: {
    editBids: 'Edit bids',
    enterResults: 'Enter results',
    leadsFirst: 'Leads first',
    summary: (sum: number, cards: number): ReactNode => (
      <>
        {b(`Bids ${sum}`)} · Cards {cards} —{' '}
        <span className="text-[var(--warn)]">someone will miss!</span>
      </>
    ),
    leadsTrick: (name: string) => `${name} leads the first trick`,
  },

  results: {
    title: 'Who made their bid?',
    confirm: 'Confirm round',
    exactSwitch: 'Enter exact tricks',
    bid: (n: number) => `Bid ${n}`,
    resultFor: (name: string) => `Result for ${name}`,
    made: '✓ Made',
    missed: '✗ Missed',
    fewer: (name: string) => `Fewer tricks for ${name}`,
    more: (name: string) => `More tricks for ${name}`,
    totalTricks: (sum: number, cards: number) => `Total tricks: ${sum} of ${cards}`,
    tricksMismatch: messages.tricksMismatch,
    allMade: messages.allMade,
    allMadeEdit: 'Someone has to miss — the bids can’t all be right. Check again.',
  },

  summary: {
    title: (n: number) => `After Round ${n}`,
    endGame: 'End game',
    nextRound: 'Next round',
    nextUp: 'Next up',
    peak: 'Peak round!',
    backTo3: 'Back to 3',
    nextLine: (round: number, cards: number, trump: Trump): ReactNode => (
      <>
        Round {round} · {b(`${cards} cards`)} · <SuitGlyph trump={trump} /> {TR[trump].name}
      </>
    ),
    dealsFirst: (dealer: string, first: string): ReactNode => (
      <>
        👑 {b(dealer)} deals · first card to {b(first)}
      </>
    ),
    standings: 'Standings',
    /** The Next-up card on a short screen: the two lines above, as one. */
    nextShort: (
      round: number,
      cards: number,
      trump: Trump,
      dealer: string,
      first: string,
    ): ReactNode => (
      <>
        Round {round} · {b(`${cards} cards`)} ·{' '}
        <span role="img" aria-label={TR[trump].name}>
          <SuitGlyph trump={trump} />
        </span>{' '}
        · {b(dealer)} deals, {b(first)} first
      </>
    ),
  },

  start: {
    skip: 'Skip the deal animation',
    trumpIs: (name: string) => `${name} are trump`,
    dealsCards: (dealer: string, cards: number): ReactNode => (
      <>
        👑 {b(dealer)} deals {cards} cards each
      </>
    ),
    firstCard: (name: string): ReactNode => <>First card to {b(name)}</>,
    tapToSkip: 'Tap to skip',
    clickToSkip: 'Click or press Space to skip',
  },

  winner: {
    finalScores: 'Final scores',
    share: 'Share',
    rematch: 'Rematch',
    first: '1st',
    second: '2nd',
    third: '3rd',
    highlights: 'Game highlights',
    rankingRegion: 'Ranking and highlights',
    sharp: 'Sharpshooter',
    big: 'Big round',
    streak: 'Hot streak',
    hook: 'Hook victim',
    ouch: 'Ouch',
    exactBids: (n: number) => `${n} exact bids`,
    inOneRound: (pts: string) => `${pts} in one round`,
    exactInRow: (n: number) => `${n} exact in a row`,
    blocked: (n: number) => (n ? `blocked ${n}× as dealer` : 'nobody got hooked'),
  },

  sheets: {
    menu: {
      title: 'Menu',
      rules: 'Rules',
      board: 'Scoreboard',
      upcoming: 'Upcoming rounds',
      undo: 'Undo last action',
      end: 'End game',
      quit: 'Quit to home',
    },
    rulesTitle: 'How to play',
    boardTitle: 'Scoreboard',
    boardEmpty: 'No finished rounds yet. Scores appear here after each round.',
    boardHint: 'Tap a round to edit it.',
    boardRound: 'Round',
    editRow: (n: number) => `Edit round ${n}`,
    editTitle: (n: number) => `Edit round ${n}`,
    editInfo: (cards: number, trump: string, dealer: string) =>
      `${cards} cards · ${trump} · dealt by ${dealer}`,
    lowerBid: (name: string) => `Lower bid for ${name}`,
    raiseBid: (name: string) => `Raise bid for ${name}`,
    upcomingTitle: 'Upcoming rounds',
    upcomingNow: 'NOW · ',
    upcomingNext: 'NEXT · ',
    upcomingRound: (n: number) => `ROUND ${n}`,
    upcomingPeak: 'Peak round',
    upcomingBack: 'Back to 3',
    upcomingDeals: (dealer: string, first: string) => `👑 ${dealer} deals → ${first} first`,
    upcomingFoot: 'Cards, trump and dealer come straight from the seating order.',
    rename: 'Rename',
    changeAvatar: 'Change avatar',
    clearSeat: 'Clear seat',
    seatTitle: 'Seat',
    avatarTitle: 'Choose avatar',
    avatar: (e: string) => `Avatar ${e}`,
    colour: 'Colour',
    shareTitle: 'Share',
    shareDirect: 'Share',
    shareSave: 'Save image',
    copyText: 'Copy text',
    imageAlt: 'Final scores card',
  },

  toasts: {
    ...messages.toasts,
    imageSaved: 'Image saved · summary copied',
    shareFailed: 'Couldn’t share — try again',
    copied: 'Summary copied',
    copyFailed: 'Couldn’t copy',
    offlineReady: 'Ready to work offline',
  },

  update: { newVersion: 'New version', reload: 'Reload', notNow: 'Not now' },
} as const;
