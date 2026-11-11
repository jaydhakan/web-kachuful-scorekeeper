import { dealerFor } from './auction';
import { defaultRules } from './cards';
import type { Call, CardRef, KtGame, KtHand, Player, Suit } from './types';

// Kachuful's first avatar colours (src/domain/avatars.ts); stored as hex like every saved player.
const COLORS = ['#FF8A65', '#4FC3F7', '#FFD54F', '#81C784', '#BA68C8'];
const MIN = 60e3;

/** Five friends four hands in: a made bid, a full auction with a double slot, a miss, a sweep, one in play. */
export function demoGame(): KtGame {
  const now = Date.now(),
    start = now - 50 * MIN;
  const players: Player[] = (
    [
      ['Aarav', '🦁'],
      ['Riya', '🐯'],
      ['Kabir', '🦊'],
      ['Meera', '🐼'],
      ['Dev', '🐸'],
    ] as const
  ).map(([name, emoji], i) => ({ id: 'p' + i, name, emoji, color: COLORS[i] }));
  const g: KtGame = {
    kind: 'kaali-teeri',
    schemaVersion: 1,
    id: 'demo',
    syncId: '00000000-0000-8000-8000-00000000000d',
    rev: 1,
    createdAt: start,
    updatedAt: now - 2 * MIN,
    players,
    firstDealerIndex: 0,
    direction: 'cw',
    rules: defaultRules(5),
    hands: [],
    status: 'active',
    ui: { view: 'hand' },
  };
  const hand = (
    bidder: number,
    bid: number,
    trump: Suit,
    card: CardRef,
    by: number | null,
    teamPoints: number | null,
    calls: Call[] = [],
  ): KtHand => {
    const index = g.hands.length,
      done = teamPoints != null;
    return {
      index,
      dealerIndex: dealerFor(g, index),
      phase: done ? 'done' : 'playing',
      mode: calls.length ? 'auction' : 'quick',
      calls,
      bidder: 'p' + bidder,
      bid,
      trump,
      called: [card],
      playedBy: [by == null ? null : 'p' + by],
      teamPoints,
      countedBy: done ? (index === 1 ? 'bidders' : 'defenders') : null,
      ...(done && { doneAt: start + (index + 1) * 10 * MIN }),
    };
  };
  const say = (who: number, what: number | 'pass'): Call =>
    what === 'pass' ? { playerId: 'p' + who, pass: true } : { playerId: 'p' + who, bid: what };
  const auction = [
    say(2, 160),
    say(3, 'pass'),
    say(4, 170),
    say(0, 'pass'),
    say(1, 'pass'),
    say(2, 'pass'),
    say(3, 'pass'),
  ];
  g.hands.push(hand(1, 180, 'spades', { rank: 'A', suit: 'hearts' }, 3, 190));
  g.hands.push(hand(4, 170, 'hearts', { rank: 'K', suit: 'spades' }, 4, 175, auction));
  g.hands.push(hand(0, 200, 'diamonds', { rank: 'Q', suit: 'clubs' }, 2, 140));
  g.hands.push(hand(3, 150, 'spades', { rank: 'A', suit: 'spades' }, 1, 250));
  g.hands.push(hand(2, 165, 'clubs', { rank: 'J', suit: 'diamonds' }, null, null));
  return g;
}
