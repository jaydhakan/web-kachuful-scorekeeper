import { deckTotal } from './cards';
import type { Call, KtGame, KtRules } from './types';

// As in Kachuful, `direction` only lays the seats out; the index order is the play order.
export const dealerFor = (g: Pick<KtGame, 'players' | 'firstDealerIndex'>, index: number): number =>
  (g.firstDealerIndex + index) % g.players.length;

export const firstSpeaker = (
  g: Pick<KtGame, 'players' | 'firstDealerIndex'>,
  index: number,
): number => (dealerFor(g, index) + 1) % g.players.length;

/** Player ids in speaking order for hand `index`, starting with the first speaker. */
export const speakingOrder = (
  g: Pick<KtGame, 'players' | 'firstDealerIndex'>,
  index: number,
): string[] => {
  const n = g.players.length,
    f = firstSpeaker(g, index);
  return g.players.map((_, k) => g.players[(f + k) % n].id);
};

export interface AuctionState {
  high: number | null;
  holder: string | null;
  /** Whose call it is; null once the auction is over. */
  toSpeak: string | null;
  done: boolean;
  /** Nobody bid and everyone passed: this player must take it at the minimum. */
  forcedTo: string | null;
  /** The first illegal call; the state is the auction up to it. */
  invalidAt: number | null;
}

/** A legal amount for the winning bid: the minimum up to the whole deck, on the step. */
export const validBid = (bid: number, r: KtRules): boolean =>
  Number.isInteger(bid) && bid >= r.minBid && bid <= deckTotal(r.decks) && bid % r.step === 0;

/** `order` is the speaking order (speakingOrder): its first player speaks first and is the one forced. */
export function auction(calls: Call[], order: string[], r: KtRules): AuctionState {
  const n = order.length;
  let high: number | null = null,
    holder: string | null = null,
    turn = 0,
    passes = 0,
    done = false;
  for (const [i, c] of calls.entries()) {
    const forcedTo = high == null && passes === n ? order[0] : null;
    const ok =
      !done &&
      c.playerId === order[turn % n] &&
      ('forced' in c
        ? forcedTo != null && c.forced === r.minBid
        : forcedTo == null &&
          ('pass' in c || (validBid(c.bid, r) && (high == null || c.bid > high))));
    if (!ok)
      return { high, holder, toSpeak: done ? null : order[turn % n], done, forcedTo, invalidAt: i };
    if ('pass' in c) passes++;
    else {
      high = 'bid' in c ? c.bid : c.forced;
      holder = c.playerId;
      passes = 0;
    }
    turn++;
    done = 'forced' in c || (high != null && passes === n - 1);
  }
  const forcedTo = high == null && passes === n ? order[0] : null;
  return { high, holder, toSpeak: done ? null : order[turn % n], done, forcedTo, invalidAt: null };
}

export const validCall = (calls: Call[], order: string[], r: KtRules, call: Call): boolean =>
  auction([...calls, call], order, r).invalidAt === null;

/** The smallest bid the next speaker may make, or null when only a pass (or the forced minimum) is left. */
export function nextBid(s: AuctionState, r: KtRules): number | null {
  if (s.done || s.forcedTo) return null;
  const b = s.high == null ? r.minBid : s.high + r.step;
  return b <= deckTotal(r.decks) ? b : null;
}
