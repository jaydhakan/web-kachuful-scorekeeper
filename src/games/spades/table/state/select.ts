import {
  bidOrder,
  gameTotals,
  handLines,
  isNil,
  nilRange,
  partnerOf,
  scoreHand,
  seatsOf,
  tableHand,
  tricksOk,
  TRICKS,
  type HandLine,
  type Seat,
  type SpGame,
  type SpHand,
  type TeamId,
  type TeamScore,
  type Totals,
} from '@/games/spades/domain';
import type { SpEntry, SpTableState } from './types';

/** What the screens read from the game; the reducer applies the same rules, so both always agree. */

export const curHand = (g: SpGame): SpHand | null => g.hands[g.hands.length - 1] ?? null;
export const doneHands = (g: SpGame): SpHand[] => g.hands.filter((h) => h.phase === 'done');
export const hasDone = (g: SpGame | null): boolean =>
  !!g && g.hands.some((h) => h.phase === 'done');

/** The seat to bid next, in order from the dealer's left; null once all four have bid. */
export const toBid = (h: SpHand): Seat | null =>
  bidOrder(h.dealer).find((s) => h.bids[s] === null) ?? null;

/** The seat that bid last, for Undo bid. */
export const lastBidder = (h: SpHand): Seat | null =>
  [...bidOrder(h.dealer)].reverse().find((s) => h.bids[s] !== null) ?? null;

const teamTricks = (team: TeamId, teamA: number) => (team === 'a' ? teamA : TRICKS - teamA);

/**
 * Keeps an entry inside the rules: a Nil bidder takes at most the team's tricks, and with both partners Nil the
 * second takes the rest, so what the scorer sees can always be saved.
 */
export function fitEntry(h: Pick<SpHand, 'bids'>, e: SpEntry): SpEntry {
  const teamA = Math.max(0, Math.min(TRICKS, Math.round(e.teamA)));
  const nil = e.nilTricks.slice();
  for (const t of ['a', 'b'] as const) {
    const team = teamTricks(t, teamA);
    const [x, y] = seatsOf(t).filter((s) => isNil(h, s));
    if (x === undefined) continue;
    nil[x] = Math.max(0, Math.min(team, nil[x] ?? 0));
    if (y !== undefined) nil[y] = team - (nil[x] as number);
  }
  for (const s of [0, 1, 2, 3] as Seat[]) if (!isNil(h, s)) nil[s] = null;
  return { index: e.index, teamA, nilTricks: nil };
}

/** Where Tricks starts: team a took its contract, every Nil bidder none (a double-Nil team none at all). */
export function defaultEntry(h: SpHand): SpEntry {
  const contract = seatsOf('a').reduce<number>(
    (n, s) => n + (isNil(h, s) ? 0 : (h.bids[s] ?? 0)),
    0,
  );
  const bothNil = (t: TeamId) => seatsOf(t).every((s) => isNil(h, s));
  const teamA = bothNil('a') ? 0 : bothNil('b') ? TRICKS : Math.min(TRICKS, contract);
  return fitEntry(h, { index: h.index, teamA, nilTricks: h.bids.map((b) => (b === 0 ? 0 : null)) });
}

/** The scorer's numbers for the current hand: the ones entered, else the defaults. */
export function entryOf(s: Pick<SpTableState, 'game' | 'entry'>): SpEntry | null {
  const h = s.game && curHand(s.game);
  if (!h || h.phase !== 'tricks') return null;
  return s.entry && s.entry.index === h.index ? s.entry : defaultEntry(h);
}

/** The hand as it would be saved from these numbers. */
export const enteredHand = (h: SpHand, e: SpEntry, doneAt?: number): SpHand =>
  tableHand({
    index: h.index,
    dealer: h.dealer,
    bids: h.bids as number[],
    blind: h.blind,
    teamA: e.teamA,
    nilTricks: e.nilTricks,
    ...(doneAt !== undefined && { doneAt }),
  });

export const entryOk = (h: SpHand, e: SpEntry) =>
  tricksOk(h, [e.teamA, TRICKS - e.teamA], e.nilTricks);

/** The bags each team carries into hand `index` (every scored hand before it). */
export function bagsBefore(g: SpGame, index: number): Record<TeamId, number> {
  const t = gameTotals({ hands: g.hands.filter((h) => h.phase === 'done' && h.index < index) });
  return { a: t.a.bags, b: t.b.bags };
}

/** What saving would score for both teams, before it is saved. */
export function preview(g: SpGame, h: SpHand, e: SpEntry): Record<TeamId, TeamScore> {
  return scoreHand(enteredHand(h, e), bagsBefore(g, h.index));
}

/** A hand's line on the scoreboard, and the totals before it, for the summary's count-up. */
export function lineOf(
  g: SpGame,
  index: number,
): { line: HandLine; before: Record<TeamId, number> } | null {
  const lines = handLines(g.hands);
  const k = lines.findIndex((l) => l.index === index);
  if (k < 0) return null;
  return { line: lines[k], before: k ? lines[k - 1].after : { a: 0, b: 0 } };
}

export const totalsOf = (g: SpGame): Totals => gameTotals(g);

/** The partner's bid that limits this seat's, with the minimum it sets (only when the rule bites). */
export function minBidNote(g: SpGame, h: SpHand, seat: Seat): { partner: Seat; pb: number } | null {
  const p = partnerOf(seat),
    pb = h.bids[p];
  if (g.rules.minTeamBid === null || pb === null || pb === 0 || pb >= g.rules.minTeamBid - 1)
    return null;
  return { partner: p, pb };
}

/** The range a Nil bidder's stepper allows. */
export const nilBounds = (h: SpHand, seat: Seat, e: SpEntry) =>
  nilRange(h, seat, e.teamA, e.nilTricks);
