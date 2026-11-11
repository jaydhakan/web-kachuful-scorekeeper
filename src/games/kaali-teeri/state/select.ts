import {
  auction,
  deckTotal,
  enteredPoints,
  handScore,
  nextBid,
  result,
  slots,
  speakingOrder,
  teamPointsFrom,
  type AuctionState,
  type CountedBy,
  type HandResult,
  type KtGame,
  type KtHand,
} from '@/games/kaali-teeri/domain';

/** What the screens read from the game; the reducer applies the same rules, so both always agree. */

export const curHand = (g: KtGame): KtHand => g.hands[g.hands.length - 1];

/** The auction so far for the current hand, in its speaking order. */
export const auctionOf = (g: KtGame, h: KtHand = curHand(g)): AuctionState =>
  auction(h.calls, speakingOrder(g, h.index), g.rules);

/** The smallest bid the next speaker may make, or null when only a pass (or the forced minimum) is left. */
export const minNextBid = (g: KtGame): number | null => nextBid(auctionOf(g), g.rules);

/** The number to show on the result screen for the side being entered (the hand's own, else this device's). */
export const shownPoints = (g: KtGame, h: KtHand = curHand(g)): number | null =>
  enteredPoints(h, g.rules);

export interface ResultPreview extends HandResult {
  teamPoints: number;
  /** Each seat's points for the hand. */
  scores: Record<string, number>;
  /** The bidder and partners, with the slots each fills ("2×"). */
  slots: Record<string, number>;
}

/** What confirming would score, for "Defenders 60 → Riya's team 190 · made" and each player's change. */
export function preview(g: KtGame, entered: number, by: CountedBy): ResultPreview | null {
  const h = curHand(g);
  const teamPoints = teamPointsFrom(entered, by, deckTotal(g.rules.decks));
  const hand: KtHand = { ...h, teamPoints, countedBy: by };
  const res = result(hand, g.rules);
  if (!res) return null;
  const ids = g.players.map((p) => p.id);
  return { ...res, teamPoints, scores: handScore(hand, g.rules, ids), slots: slots(hand) };
}
