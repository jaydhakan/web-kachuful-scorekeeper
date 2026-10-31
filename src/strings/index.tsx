import type { ReactNode } from 'react';
import type { Direction, Trump } from '@/domain';
import { messages } from './messages';
import { hub } from './hub';
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
  hub,
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
    step1Title: 'Decks and players',
    useLastGroup: (names: string[]) =>
      `↺ Use last group: ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3}` : ''}`,
    players: (n: number) => `${n} players`,
    playerCount: 'Number of players',
    decksLabel: 'Decks of cards',
    deck: (d: number) => `${d} ${d === 1 ? 'deck' : 'decks'}`,
    decksHint: (max: number) => `Seats 3 to ${max} players`,
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
    dealSub: (first: string, trump: Trump, arrow: string): ReactNode => (
      <>
        First card to {b(first)} · <SuitGlyph trump={trump} /> {TR[trump].name} trump{' '}
        <b className="text-[var(--accent)]">{arrow}</b>
      </>
    ),
  },

  deal: {
    /** The line read from across the table. The count is marked so each screen can size it up. */
    head: (dealer: string, cards: number): ReactNode => (
      <>
        👑 {b(dealer)} deals <b data-n>{cards}</b> cards each
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
    made: 'Made',
    missed: 'Missed',
    fewer: (name: string) => `Fewer tricks for ${name}`,
    more: (name: string) => `More tricks for ${name}`,
    totalTricks: (sum: number, cards: number) => `Total tricks: ${sum} of ${cards}`,
    tricksMismatch: messages.tricksMismatch,
    allMade: messages.allMade,
    allMadeEdit: 'Someone has to miss — the bids can’t all be right. Check again.',
    tricksLeft: 'Tricks left',
    tricksOf: (cards: number) => ` of ${cards}`,
    onlyOption: 'Only option',
    onlyLeft: (n: number) => `Only ${n} ${n === 1 ? 'trick' : 'tricks'} left`,
    noFit: 'Doesn’t add up with the other results',
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
    firstCard: (name: string): ReactNode => <>First card to {b(name)}</>,
    tapToSkip: 'Tap to skip',
    clickToSkip: 'Click or press Space to skip',
  },

  streak: {
    /** One look per step of STREAK_STEPS (3, 5, 8 in a row). */
    hot: [
      { emoji: '🔥', title: 'is on fire!' },
      { emoji: '🚀', title: 'is unstoppable!' },
      { emoji: '🐐', title: 'is the G.O.A.T.!' },
    ],
    cold: [
      { emoji: '🥶', title: 'has gone ice cold' },
      { emoji: '💀', title: 'is cursed' },
      { emoji: '🪦', title: 'rest in peace' },
    ],
    count: (kind: 'hot' | 'cold', n: number) =>
      kind === 'hot' ? `${n} bids made in a row` : `${n} bids missed in a row`,
    kicker: (kind: 'hot' | 'cold', n: number) =>
      kind === 'hot' ? `${n} in a row` : `${n} misses in a row`,
    of: (i: number, n: number) => `${i} of ${n}`,
    tapToContinue: 'Tap to continue',
    clickToContinue: 'Click or press Space to continue',
    continue: 'Continue',
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
    editBidsEqual: (cards: number) =>
      `Bids can’t add up to ${cards} — that’s the total the dealer can’t reach.`,
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

  desk: {
    nav: {
      label: 'Main',
      home: 'Home',
      game: 'Game',
      scores: 'Scores',
      rules: 'Rules',
      rounds: 'Rounds',
      undo: 'Undo',
      menu: 'Menu',
      scoreboard: 'Scoreboard',
      keys: 'Keys',
    },
    logo: 'K',
    endGame: 'End game',
    roundEyebrow: (n: number) => `Round ${n}`,
    roundTitle: (cards: number, trump: Trump): ReactNode => (
      <>
        {cards} cards · <SuitGlyph trump={trump} /> {TR[trump].name} trump
      </>
    ),
    roundShort: (n: number, cards: number, trump: Trump): ReactNode => (
      <>
        R{n} · {cards} cards · <SuitGlyph trump={trump} /> {TR[trump].name}
      </>
    ),
    steps: {
      label: 'Round steps',
      bid: 'Bid',
      play: 'Play',
      results: 'Results',
      done: 'done',
      now: 'current step',
    },
    bid: {
      order: (i: number, n: number) => ` · ${i} of ${n}`,
      lockIn: (v: number) => `Lock in ${v}`,
      pick: 'Pick a bid',
      keyHint: 'pick a bid',
      confirmHint: 'confirm',
      undoHint: 'undo',
      soFar: 'Bids so far',
      change: (name: string, v: number) => `${name} bid ${v}. Change it`,
      level: 'Exactly level: the dealer has to break it',
    },
    /** `delta` is the change in cards from the last round; null for the first round. */
    dealSub: (first: string, trump: Trump, delta: number | null): ReactNode => (
      <>
        First card to {b(first)} · <SuitGlyph trump={trump} /> {TR[trump].name} trump{' '}
        {delta != null && delta !== 0 && (
          <>
            · <b className="text-[var(--accent)]">{delta > 0 ? '↑' : '↓'}</b> one{' '}
            {delta > 0 ? 'more' : 'fewer'} card than last round
          </>
        )}
        {delta === 0 && <>· same cards as last round</>}
      </>
    ),
    comingUp: 'Coming up',
    peak: 'Peak',
    deals: (name: string) => `${name} deals`,
    leads: (name: string) => `${name} leads`,
    roundN: (n: number) => `Round ${n}`,
    lastRound: 'Last round of the game',
    play: {
      title: (sum: number, cards: number) => `Bids ${sum} · Cards ${cards}`,
      over: (d: number) => `Over by ${d}: someone will miss.`,
      under: (d: number) => `Under by ${d}: someone will miss.`,
      leads: 'Leads',
      dealer: 'dealer',
      hint: (name: string): ReactNode => (
        <>
          {b(name)} leads the first trick. Follow the led suit if you can, otherwise play a trump or
          discard.
        </>
      ),
      order: 'Bids in playing order',
    },
    results: {
      valid: 'The results add up, so the round is valid',
      validShort: 'Round is valid',
      pending: (k: number) => `${k} still to mark`,
      bidsCards: (sum: number, cards: number): ReactNode => (
        <>
          {b(`Bids ${sum}`)} · Cards {cards}
        </>
      ),
      hint: 'A tick on the table means the bid was made. Change a result and the table and scores update.',
      dealer: ' · dealer',
      exactShort: 'Exact',
    },
    scores: {
      title: 'Scores',
      after: (n: number) => (n ? `After round ${n}` : 'Before round 1'),
      projected: (n: number) => `Projected after round ${n}`,
      open: 'Open full scoreboard →',
      up: (k: number) => `▲ up ${k}`,
      down: (k: number) => `▼ down ${k}`,
      holds: '— holds',
      holdsFirst: 'holds 1st',
      newLeader: 'takes the lead',
      leader: 'Leader',
      empty: 'Scores appear after the first round.',
    },
    summary: {
      eyebrow: (n: number) => `Round ${n} complete`,
      history: 'Score history',
      chart: (n: number) => `Total score after each round for all ${n} players`,
      chartEmpty: 'The chart fills in as rounds are played.',
      full: 'Full scoreboard',
      nextLine: (round: number, cards: number, trump: Trump): ReactNode => (
        <>
          {b(`Round ${round}`)} · {b(`${cards} cards`)} · <SuitGlyph trump={trump} />{' '}
          {TR[trump].name}
        </>
      ),
      dealsFirst: (dealer: string, first: string): ReactNode => (
        <>
          {b(dealer)} deals · first card to {b(first)}
        </>
      ),
      axis: (n: number) => `R${n}`,
    },
    winner: {
      eyebrow: (n: number) => `Game over · ${n} ${n === 1 ? 'round' : 'rounds'}`,
      title: (name: string, pts: string) => `${name} wins with ${pts}`,
      tie: (names: string, pts: string) => `${names} share the win with ${pts}`,
      trophy: 'Trophy',
      mostExact: 'Most exact bids',
      exactOf: (k: number, n: number) => `${k} of ${n}`,
      biggestRound: 'Biggest round',
      biggestMiss: 'Biggest miss',
      hotStreak: 'Hot streak',
      hookVictim: 'Hook victim',
      ranking: 'Final ranking',
    },
    home: {
      eyebrow: 'Judgement scorekeeper',
      pitch:
        'One screen on the table. It deals out every round, enforces the dealer’s restriction and keeps the score, so everyone just plays cards.',
      players: (max: number) => `3 to ${max} players`,
      hook: 'Dealer’s hook built in',
      offline: 'Works offline',
      newGame: 'New game',
      howToPlay: 'How to play',
      resume: 'Resume',
      results: 'See results',
      firstCard: (dealer: string, first: string): ReactNode => (
        <>
          {b(dealer)} is dealing · first card to {b(first)}
        </>
      ),
      leadsWith: (name: string, pts: string): ReactNode => (
        <>
          {name} leads with <b className="tick text-[var(--tx)]">{pts}</b>
        </>
      ),
    },
    setup: {
      eyebrow: 'New game',
      title: 'Set the table',
      count: '1 · How many players?',
      seats: '2 · Who sits where?',
      dealer: '3 · Who deals first?',
      seatHint: 'Seat 1 is at the bottom of the table · drag to swap',
      seatName: (k: number) => `Seat ${k} name`,
      move: (name: string) => `Move ${name}: drag, or use the up and down arrow keys`,
      avatar: (name: string) => `Change ${name}’s avatar`,
      dealerTag: 'Dealer',
      firstTag: '1st card',
      recent: 'Recent',
      randomDealer: '🎲 Random dealer',
      makeDealer: (name: string) => `${name} deals first`,
      preview: 'Table preview',
      pickCount: 'Pick how many are playing to lay out the seats.',
      dealsFirst: (name: string): ReactNode => <>👑 {b(name)} deals first</>,
      cardsEach: '🃏 3 cards each',
      firstCardTo: (first: string, dealer: string, dir: Direction): ReactNode => (
        <>
          👉 First card to {b(first)}, on {dealer}’s {side(dir)}
        </>
      ),
      spades: (
        <>
          <SuitGlyph trump="spades" /> Spades are trump
        </>
      ),
      missing: (k: number) =>
        k === 1 ? 'One seat still needs a name' : `${k} seats still need a name`,
      dupe: (name: string) => `${name} is at the table twice`,
      lengthRounds: (L: number) => `${L} rounds`,
    },
    board: {
      eyebrow: (n: number) => `${n} ${n === 1 ? 'round' : 'rounds'} played`,
      hint: 'Pick a round to edit it · totals recalculate',
      header: 'Round · cards · dealer',
      grid: 'Rounds by player',
      edit: 'Edit round',
      note: 'Totals and every later round recalculate when you save. You can undo this change.',
      saveChanges: 'Save changes',
      back: 'Back to game',
      row: (n: number, cards: number, trump: Trump, dealer: string): ReactNode => (
        <>
          R{n} · {cards} <SuitGlyph trump={trump} /> · {dealer}
        </>
      ),
      empty: 'No finished rounds yet. Scores appear here after each round.',
    },
    rules: {
      eyebrow: 'How to play',
      title: 'Rules',
      close: 'Close rules',
      keyboard: 'Keyboard',
    },
    upcoming: {
      eyebrow: 'Schedule',
      title: 'Upcoming rounds',
      note: 'Cards, trump and dealer are fixed from the start, so you can plan who deals when.',
      now: 'Now',
      next: 'Next',
      leads: (name: string) => `${name} leads`,
      end: 'The game ends after this round.',
    },
    keys: {
      title: 'Keyboard shortcuts',
      open: 'Keyboard shortcuts',
      list: [
        ['0 – 9', 'Pick a bid (type 1 then 0 for 10)'],
        [
          '⏎',
          'Confirm: lock in a bid, start playing, enter results, confirm a round, next round, deal',
        ],
        ['Z', 'Undo'],
        ['E', 'Edit bids while playing'],
        ['R', 'Rematch when the game is over'],
        ['N', 'New game, from Home'],
        ['Esc', 'Close a drawer or panel'],
        ['?', 'Show this list'],
      ] as const,
      bid: 'bid',
      confirm: 'confirm',
      undo: 'undo',
      shortcuts: 'shortcuts',
      esc: 'Esc',
    },
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
