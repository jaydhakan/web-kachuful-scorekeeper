import type { Copy, Rank, Suit } from '@/games/kaali-teeri/domain';
import { TR } from '@/theme/trumps';

/** A card as the table says it: "A♥", "10♣". */
export const cardText = (rank: Rank, suit: Suit) => `${rank}${TR[suit].sym}`;

const list = (xs: string[]) =>
  xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

/** Kaali Teeri's bidding, trump and call screens, and the card picker sheet. */
export const ktBidding = {
  frame: {
    bidding: 'Bidding',
    trump: 'Trump',
    dealt: (dealer: string, each: number) => `${dealer} deals · ${each} each`,
  },
  mode: {
    quick: 'Quick mode',
    quickHint: 'Bid out loud; enter only the result',
    auctionHint: 'Every bid and pass, turn by turn',
  },
  table: {
    bidsFirst: 'Bids 1st',
    pass: 'Pass',
    high: 'High',
  },
  quick: {
    who: 'Who won the bid?',
    tapSeat: 'Tap the seat that won the bid',
    picked: (name: string) => `${name} won the bid`,
    winningBid: 'Winning bid',
    amount: 'Winning bid',
    range: (min: number, step: number, max: number) =>
      `Minimum ${min} · steps of ${step} · up to ${max}`,
    confirm: (name: string, bid: number) => `${name} · ${bid}`,
    pickFirst: 'Pick the winner',
  },
  auction: {
    highBid: 'High bid',
    noBid: 'No bids yet',
    minBid: 'Minimum bid',
    mustTake: 'has to take it',
    toBid: 'to bid, or pass',
    atLeast: (min: number) => `next bid at least ${min}`,
    onlyPass: 'nobody can bid higher',
    amount: (name: string) => `Bid for ${name}`,
    pass: 'Pass',
    bid: (n: number) => `Bid ${n}`,
    forcedNote: (name: string, min: number) =>
      `Everyone passed with no bid, so ${name} takes it at ${min}.`,
    takeIt: (min: number) => `Take it at ${min}`,
    log: 'Auction so far',
    logEmpty: (name: string) => `${name} bids first`,
    logBid: (name: string, bid: number) => `${name} ${bid}`,
    logPass: (name: string) => `${name} pass`,
    logForced: (name: string, bid: number) => `${name} takes ${bid}`,
  },
  trump: {
    bidWon: 'Bid won',
    pick: (name: string) => `${name}, pick trump`,
    group: 'Trump',
    next: (n: number) => (n === 1 ? 'Next: call 1 partner card' : `Next: call ${n} partner cards`),
    pickFirst: 'Pick a trump suit',
  },
  call: {
    head: (n: number) => (n === 1 ? 'Call 1 partner card' : `Call ${n} partner cards`),
    trumpChip: (suit: Suit) => `${TR[suit].name} trump`,
    changeTrump: (suit: Suit) => `${TR[suit].name} trump. Change trump`,
    leads: (name: string) => `${name} leads`,
    slot: (k: number) => `Card ${k}`,
    picking: 'picking',
    remove: (card: string) => `Remove ${card}`,
    change: (card: string) => `Change ${card}`,
    empty: (k: number) => `Card ${k}, not picked yet`,
    rank: 'Rank',
    suit: 'Suit',
    copy: 'Which copy?',
    copyHint: 'Two decks: say which copy makes its player a partner.',
    copies: {
      1: '1st played',
      2: '2nd played',
      other: 'The other one',
    } satisfies Record<Copy, string>,
    otherHint: 'You hold one copy; whoever plays the other is your partner.',
    out: (card: string) => `${card} is taken out of the deck`,
    called: (card: string) => `${card} is already called`,
    allOut: (rank: string) => `Every ${rank} is taken out or called`,
    copyTaken: (copy: string) => `${copy} is already called`,
    confirm: (cards: string[]) => `Call ${list(cards)}`,
    left: (n: number) => (n === 1 ? 'Pick 1 more card' : `Pick ${n} more cards`),
  },
  picker: {
    unavailable: 'Nothing to change right now',
  },
} as const;
