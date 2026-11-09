import type { ReactNode } from 'react';
import type { Direction } from '@/people';
import { Icon } from '@/components/ui/Icons';

const b = (s: ReactNode) => <b>{s}</b>;
const side = (dir: Direction) => (dir === 'cw' ? 'left' : 'right');

/** Kaali Teeri's setup: players and rules, seating, first dealer and the deal. */
export const ktSetup = {
  stepOf: (n: number) => `Step ${n} of 3`,
  back: 'Back',
  step1Title: 'Players and rules',
  players: 'Players',
  playersRange: '4 to 10',
  fewer: 'One player fewer',
  more: 'One player more',
  count: (n: number) => `${n} players`,
  seats: (n: number) => `${n} seats`,
  rulesLine: (decks: 1 | 2, minBid: number, partners: number) =>
    `${decks === 1 ? '1 deck' : '2 decks'} · min bid ${minBid} · call ${partners} ${partners === 1 ? 'partner' : 'partners'}`,
  rulesLabel: 'Rules for this table',
  nothingOut: 'Nothing to take out',
  dealEach: (n: number) => `Deal ${n} each`,
  /** "Take out 2♣ and 2♦", "… from both decks" when every card goes twice, else "both 2♣, both 2♦ and one 2♥". */
  takeOutLine: (cards: { name: string; copies: number }[]) => {
    const all2 = cards.every((c) => c.copies === 2),
      mixed = !all2 && cards.some((c) => c.copies === 2);
    const names = cards.map((c) =>
      mixed ? `${c.copies === 2 ? 'both' : 'one'} ${c.name}` : c.name,
    );
    const list =
      names.length > 1
        ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
        : names[0];
    return `Take out ${list}${all2 ? ' from both decks' : ''}`;
  },
  /** The whole line for screen readers: "Take out 2 of clubs and 2 of diamonds · deal 10 each". */
  takeOutSay: (cards: string[], each: number) =>
    cards.length
      ? `Take out ${cards.length > 1 ? `${cards.slice(0, -1).join(', ')} and ${cards[cards.length - 1]}` : cards[0]} · deal ${each} each`
      : `Nothing to take out · deal ${each} each`,
  copies: (name: string, n: number) => (n > 1 ? `${name}, both decks` : name),
  inPlay: (total: number) => `${total} points in play · the 3♠ alone is worth 30`,
  gameLength: 'Game length',
  lengthOptions: [
    { v: 'endless' as const, label: 'Endless' },
    { v: 'to1000' as const, label: 'First to 1000' },
  ],
  advanced: 'Advanced',
  advancedSummary: (dir: Direction, minBid: number, step: number) =>
    `${dir === 'cw' ? 'Clockwise' : 'Anticlockwise'} · ${minBid} · +${step}`,
  directionLabel: 'Seating direction',
  cw: '⟳ Clockwise',
  ccw: '⟲ Anticlockwise',
  minBid: 'Minimum bid',
  minBidHint: (lo: number, hi: number) => `${lo} to ${hi}`,
  minBidLower: 'Lower the minimum bid',
  minBidRaise: 'Raise the minimum bid',
  bidStep: 'Bids go up by',
  stepOptions: [
    { v: '5' as const, label: '5' },
    { v: '10' as const, label: '10' },
  ],
  useLastGroup: (names: string[]) =>
    `↺ Use last group: ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3}` : ''}`,
  nextSeat: 'Next: seat the table',

  step2Title: 'Seat the table',
  dealingFirst: "Who's dealing first?",
  bidsFirst: 'Bids 1st',
  next: 'Next',

  step3Title: 'First dealer',
  deals: (name: string): ReactNode => (
    <>
      {Icon.crownInline} {b(name)} deals
    </>
  ),
  bidsFirstThen: (name: string, dir: Direction): ReactNode => (
    <>
      {Icon.point} {b(name)} bids first, then round to the {side(dir)}
    </>
  ),
  random: <>{Icon.dice} Random</>,
  randomLabel: 'Pick a random dealer',
  tapHint: 'Tap a seat to make them the dealer.',
  makeDealer: (name: string) => `${name} deals first`,
  deal: 'Deal!',

  // The deal at the start of every hand.
  hand: (n: number) => `Hand ${n}`,
  dealerDeals: (name: string): ReactNode => <>{b(name)} deals</>,
  skip: 'Skip the deal',
  tapToSkip: 'Tap to skip',
  clickToSkip: 'Click to skip',
} as const;
