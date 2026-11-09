import { deckTotal } from './cards';
import type { CountedBy, KtGame, KtHand, KtRules, KtStanding, KtTotals, Sweep } from './types';

export const TARGET = 1000;

export const doneHands = (g: Pick<KtGame, 'hands'>): KtHand[] =>
  g.hands.filter((h) => h.phase === 'done');

/** The bidder first, then each partner once, in the order of their first called card. */
export function team(h: Pick<KtHand, 'bidder' | 'playedBy'>): string[] {
  if (h.bidder == null) return [];
  const out = [h.bidder];
  for (const p of h.playedBy) if (p != null && !out.includes(p)) out.push(p);
  return out;
}

/** 1 for the bidder plus 1 per called card a player played. */
export function slots(h: Pick<KtHand, 'bidder' | 'playedBy'>): Record<string, number> {
  const s: Record<string, number> = {};
  for (const p of team(h)) s[p] = p === h.bidder ? 1 : 0;
  for (const p of h.playedBy) if (p != null && h.bidder != null) s[p]++;
  return s;
}

export const teamPointsFrom = (entered: number, by: CountedBy, total: number): number =>
  by === 'bidders' ? entered : total - entered;

/** The number the table typed, for showing it back on an edit. */
export const enteredPoints = (h: KtHand, r: KtRules): number | null =>
  h.teamPoints == null || h.countedBy == null
    ? null
    : teamPointsFrom(h.teamPoints, h.countedBy, deckTotal(r.decks));

export interface HandResult {
  made: boolean;
  sweep: Sweep;
}

export function result(h: KtHand, r: KtRules): HandResult | null {
  if (h.teamPoints == null || h.bid == null) return null;
  const total = deckTotal(r.decks);
  return {
    made: h.teamPoints >= h.bid,
    sweep: h.teamPoints === total ? 'bidders' : h.teamPoints === 0 ? 'defenders' : 'none',
  };
}

/** Each player's points for the hand (0 until the points are in). A sweep replaces normal scoring, slots included. */
export function handScore(h: KtHand, r: KtRules, ids: string[]): Record<string, number> {
  const out = Object.fromEntries(ids.map((id) => [id, 0]));
  const res = result(h, r);
  if (!res || h.bidder == null) return out;
  const total = deckTotal(r.decks),
    bid = h.bid!,
    s = slots(h);
  for (const id of ids) {
    const mine = id in s;
    if (res.sweep !== 'none') out[id] = mine === (res.sweep === 'bidders') ? total : 0;
    else if (res.made) out[id] = mine ? bid * s[id] : 0;
    else out[id] = mine ? 0 : bid;
  }
  return out;
}

/** Derived from the hands, never stored. */
export function totals(
  g: Pick<KtGame, 'players' | 'rules' | 'hands'>,
  hands = doneHands(g),
): KtTotals {
  const ids = g.players.map((p) => p.id);
  const t: KtTotals = Object.fromEntries(ids.map((id) => [id, 0]));
  for (const h of hands) {
    const s = handScore(h, g.rules, ids);
    for (const id of ids) t[id] += s[id];
  }
  return t;
}

/** Competition ranking (1, 1, 3); ties keep seat order. */
export function standings(
  g: Pick<KtGame, 'players' | 'rules' | 'hands'>,
  hands?: KtHand[],
): KtStanding[] {
  const t = totals(g, hands);
  const a = g.players
    .map((p, i) => ({ p, i, t: t[p.id], rank: 0 }))
    .sort((x, y) => y.t - x.t || x.i - y.i);
  a.forEach((x, k) => (x.rank = k > 0 && x.t === a[k - 1].t ? a[k - 1].rank : k + 1));
  return a;
}

/** First to 1000: over after the hand in which someone reaches it. Endless games end only when the table says. */
export const gameOver = (g: Pick<KtGame, 'players' | 'rules' | 'hands'>): boolean =>
  g.rules.length === 'to1000' && Object.values(totals(g)).some((t) => t >= TARGET);
