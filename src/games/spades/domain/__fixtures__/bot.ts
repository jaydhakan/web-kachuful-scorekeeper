import { allowedBids, blindAllowed } from '../bidding';
import { dealSeeded, shuffleSeeded, seeded } from '../cards';
import { legalPlays } from '../legal';
import { REACTIONS } from '../rules';
import { SEATS } from '../seats';
import { deadlineFor } from '../timer';
import type { Action, Actor, ApplyCtx, Card, Seat } from '../types';
import type { Table } from './kit';

export interface Move {
  actor: Actor;
  action: Action;
  ctx: Partial<ApplyCtx>;
  dt: number;
}

export { seeded };

const pick = <T>(rnd: () => number, xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
const anySeat = (rnd: () => number) => pick(rnd, SEATS);

/** A rough bid: aces and kings, plus spades from the queen up. */
function guessBid(hand: readonly Card[]): number {
  return hand.filter(
    (c) => c.rank === 'A' || c.rank === 'K' || (c.suit === 'spades' && c.rank === 'Q'),
  ).length;
}

/**
 * Mostly sensible play with some noise (wrong seats, illegal cards, timeouts, early Blind Nil), so a seeded run walks
 * through every path of the engine. `deals` counts deals made, so each one is a fresh seeded shuffle.
 */
export function botMove(t: Table, rnd: () => number, seed: number, deals: number): Move {
  const s = t.state;
  const step = (actor: Actor, action: Action, ctx: Partial<ApplyCtx> = {}, dt = 0): Move => ({
    actor,
    action,
    ctx,
    dt: dt || 500 + Math.floor(rnd() * 4000),
  });
  if (rnd() < 0.02) return step(anySeat(rnd), { type: 'react', emoji: pick(rnd, REACTIONS) });
  if (s.status === 'lobby') {
    const waiting = SEATS.find((x) => !s.seats[x].ready);
    if (waiting !== undefined) return step(waiting, { type: 'ready' });
    return step(s.host, { type: 'drawForDeal' }, { draw: shuffleSeeded(seed * 31).slice(0, 4) });
  }
  if (s.phase === 'deal' || s.phase === 'handEnd') {
    const late = rnd() < 0.15;
    const who = late ? anySeat(rnd) : (s.dealer as Seat);
    return step(
      who,
      { type: 'deal' },
      { deal: dealSeeded(seed * 1000 + deals) },
      late ? 16_000 : 0,
    );
  }
  const turn = s.turn as Seat;
  const r = rnd();
  if (r < 0.06) {
    const deadline = deadlineFor(s, (s.turnStartedAt as number) - 1);
    const wait = Math.max(0, (deadline ?? t.now) - t.now) + (rnd() < 0.2 ? -1000 : 10);
    const lastSeenAt = s.rules.timerSec === null ? (s.turnStartedAt as number) - 1 : undefined;
    return step(anySeat(rnd), { type: 'timeout' }, { rev: s.rev, lastSeenAt }, Math.max(1, wait));
  }
  const hands = t.hands as Card[][];
  if (s.phase === 'bidding') {
    const other = anySeat(rnd);
    if (r < 0.1 && blindAllowed(s.rules) && !s.looked[other] && s.bids[other] === null)
      return step(other, { type: 'blindNil' });
    if (!s.looked[turn]) return step(turn, { type: 'look' });
    if (r < 0.13) return step(turn, { type: 'bid', bid: pick(rnd, [-1, 14, 2.5, 0]) });
    if (r < 0.15) return step(((turn + 1) % 4) as Seat, { type: 'bid', bid: 3 });
    const allowed = allowedBids(turn, s.bids, s.rules);
    const want = rnd() < 0.12 ? 0 : guessBid(hands[turn]);
    const bid = allowed.includes(want) ? want : allowed[allowed.length > 1 ? 1 : 0];
    return step(turn, { type: 'bid', bid });
  }
  const hand = hands[turn];
  if (r < 0.1) return step(turn, { type: 'play', card: pick(rnd, hand) });
  if (r < 0.11) return step(((turn + 2) % 4) as Seat, { type: 'play', card: hand[0] });
  return step(turn, { type: 'play', card: pick(rnd, legalPlays(hand, s.trick, s.broken)) });
}
