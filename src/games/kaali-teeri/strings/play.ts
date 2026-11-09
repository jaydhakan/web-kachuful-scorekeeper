import type { CountedBy, KtInvalidReason, Suit } from '@/games/kaali-teeri/domain';

const SUIT_NAME: Record<Suit, string> = {
  spades: 'Spades',
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
};
const COUNT = ['', 'one', 'two', 'three', 'four', 'five'];
const list = (names: string[]) =>
  names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
const team = (bidder: string) => `${bidder}’s team`;

/** Kaali Teeri's play, result, summary, scoreboard and edit strings. */
export const kp = {
  suitName: (s: Suit) => SUIT_NAME[s],
  hand: {
    title: (n: number) => `Hand ${n}`,
    trump: 'trump',
    bidLine: (name: string, bid: number) => `${name} bid ${bid}`,
    points: 'Points',
    menu: 'Menu',
    scoreboard: 'Scoreboard',
    back: 'Back to play',
  },
  role: {
    bidder: 'Bidder',
    partner: 'Partner',
    slots: (n: number) => `${n}× · ${COUNT[n] ?? n} cards`,
    sweep: 'Sweep',
  },
  play: {
    leads: 'Leads',
    trumpCentre: (s: Suit) => `${SUIT_NAME[s]} trump`,
    leadsLine: (name: string) => `${name} leads`,
    called: 'Called cards',
    secret: 'Secret until played',
    revealed: (k: number, n: number) => `${k} of ${n} revealed`,
    allRevealed: 'Everyone’s revealed',
    playedBy: 'Played by…',
    by: (name: string) => name,
    change: (card: string, name: string) => `${card}: played by ${name}. Change`,
    hidden: (card: string) => `${card}, not played yet`,
    joined: (name: string, bidder: string) =>
      name === bidder ? `${bidder} played their own called card` : `${name} is ${bidder}’s partner`,
    stillHidden: (n: number) =>
      n === 0
        ? 'Every called card is out'
        : `${n} called card${n > 1 ? 's are' : ' is'} still hidden`,
    handOver: 'Hand over · enter points',
    optional: 'Mark who plays each card as it lands, or at the end.',
  },
  copy: {
    1: 'first played',
    2: 'second played',
    other: 'the other one',
  } as Record<string, string>,
  playedBy: {
    title: 'Who played it?',
    who: 'Who played',
    question: (card: string) => `Who played ${card}?`,
    joins: (bidder: string) => `They join ${team(bidder)} for this hand.`,
    holds: 'holds it',
    otherNote: (bidder: string) => `${bidder} isn’t listed: they hold the other copy.`,
    already: (k: number) => `${k}× if they played this too`,
    clear: 'Not played yet',
    missing: 'This card is no longer in the hand.',
  },
  result: {
    title: 'Points',
    question: (by: CountedBy) =>
      by === 'defenders'
        ? 'How many points did the defenders take?'
        : 'How many points did the bidding team take?',
    side: 'Points counted by',
    defenders: 'Defenders',
    bidders: (bidder: string) => team(bidder),
    biddersShort: 'Bidding team',
    need: (names: string[], bid: number) => `${list(names)} · need ${bid}`,
    amount: (by: CountedBy) => (by === 'defenders' ? 'Defenders’ points' : 'Bidding team’s points'),
    range: (total: number) => `0–${total} · steps of 5`,
    flow: (by: CountedBy, entered: number, other: number, bidder: string) =>
      by === 'defenders'
        ? `Defenders ${entered} → ${team(bidder)} ${other}`
        : `${team(bidder)} ${entered} → Defenders ${other}`,
    made: (over: number) => (over === 0 ? 'Made · exactly' : `Made · ${over} over`),
    missed: (by: number) => `Missed by ${by}`,
    sweepBidders: 'Bidding team swept',
    sweepDefenders: 'Defenders swept',
    markFirst: 'Who played these?',
    markNote: 'Every called card was played by someone.',
    needMarks: (n: number) =>
      `Mark who played ${n === 1 ? 'the called card' : 'each called card'} first`,
    changes: 'This hand',
    confirm: (n: number) => `Confirm hand ${n}`,
  },
  summary: {
    title: (n: number) => `After hand ${n}`,
    made: (bidder: string, pts: number, bid: number) => `${team(bidder)} made ${pts} of ${bid}`,
    missed: (bidder: string, pts: number, bid: number) =>
      `${team(bidder)} missed: ${pts} of ${bid}`,
    sweptBy: (bidder: string) => `${team(bidder)} swept the hand`,
    sweptDef: 'The defenders swept the hand',
    trump: 'trump',
    standings: 'Standings',
    next: (n: number, dealer: string, first: string) =>
      `Hand ${n} · ${dealer} deals · ${first} bids first`,
    nextShort: (n: number) => `Hand ${n}`,
    deals: (name: string) => `${name} deals`,
    bidsFirst: (name: string) => `${name} bids first`,
    endGame: 'End game',
    nextHand: 'Next hand',
    announce: (rows: { name: string; d: string; t: string }[]) =>
      rows.map((r) => `${r.name} ${r.d}, ${r.t}`).join('; '),
  },
  board: {
    title: 'Scoreboard',
    empty: 'No hands yet. Scores show here once the first hand is confirmed.',
    hint: 'Tap a hand to edit it.',
    hand: 'Hand',
    row: (n: number) => `Edit hand ${n}`,
    made: '✓',
    missed: '✗',
    madeWord: 'made',
    missedWord: 'missed',
    total: 'Total',
  },
  edit: {
    title: (n: number) => `Edit hand ${n}`,
    bidder: 'Bidder',
    bid: 'Bid',
    trump: 'Trump',
    called: 'Called cards',
    card: (k: number) => `Called card ${k}`,
    rank: 'Rank',
    suit: 'Suit',
    copy: 'Which copy',
    copyShort: { 1: '1st played', 2: '2nd played', other: 'The other one' } as Record<
      string,
      string
    >,
    playedBy: 'Played by',
    points: 'Points',
    save: 'Save hand',
    missing: 'That hand isn’t in this game any more.',
    why: {
      bid: 'The bid must be between the minimum and the deck total, in the game’s steps.',
      trump: 'Pick a trump suit.',
      called: 'A card can’t be called twice, or be one that was taken out.',
      played_by: 'The other one can’t be played by the bidder.',
      team_points: 'Points go from 0 to the deck total in steps of 5.',
      other: 'This change doesn’t add up. Check the hand.',
    } as Record<KtInvalidReason | 'other', string>,
  },
} as const;
