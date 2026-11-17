/** Kaali Teeri's daily awards and monthly seasons (plan §4), over the same facts as its achievements. Pure. */
import { playerGames, type KtFacts, type KtHandFact } from './achievements';
import { best } from '../../../progression/awards';
import { climber, seasonPlaces, winRateStandings } from '../../../progression/rules';
import { dayOf, dayRange, monthOf, monthRange, prevMonth } from '../../../progression/zone';
import type { Award, SeasonResult, WinRateRow } from '../../../progression/types';

/** Finished games a month needs before a player is ranked. */
export const SEASON_MIN_GAMES = 8;
/** Bids a day's Sharpest and a season's Sharpest Bidder need. */
export const DAY_SHARP_BIDS = 3;
export const SEASON_SHARP_BIDS = 15;

/** One player's hands in a window. */
interface Tally {
  points: number;
  hands: number;
  bids: number;
  made: number;
  /** Hands won as a called partner. */
  partnerWon: number;
  /** Bids beaten as a defender. */
  beaten: number;
}

function tallies(hands: readonly KtHandFact[]): Map<string, Tally> {
  const out = new Map<string, Tally>();
  for (const h of hands)
    for (const [id, pts] of Object.entries(h.scores)) {
      const t = out.get(id) ?? { points: 0, hands: 0, bids: 0, made: 0, partnerWon: 0, beaten: 0 };
      t.points += pts;
      t.hands++;
      if (h.bidderId === id) {
        t.bids++;
        t.made += Number(h.made);
      }
      if (h.made && h.partnerIds.includes(id)) t.partnerWon++;
      if (!h.made && h.bidderId !== id && !h.partnerIds.includes(id)) t.beaten++;
      out.set(id, t);
    }
  return out;
}

const within = (hands: readonly KtHandFact[], from: number, to: number) =>
  hands.filter((h) => h.doneAt >= from && h.doneAt < to);

/** The biggest bid among `hands`, made or failed: every bidder who bid it, each at their earliest such hand. */
function biggestBid(hands: readonly KtHandFact[], code: string): Award[] {
  if (!hands.length) return [];
  const top = Math.max(...hands.map((h) => h.bid));
  const first = new Map<string, KtHandFact>();
  for (const h of [...hands].sort(
    (a, b) =>
      a.doneAt - b.doneAt ||
      (a.gameId < b.gameId ? -1 : a.gameId > b.gameId ? 1 : 0) ||
      a.handIndex - b.handIndex,
  ))
    if (h.bid === top && !first.has(h.bidderId)) first.set(h.bidderId, h);
  return [...first.values()]
    .map((h) => ({
      code,
      playerId: h.bidderId,
      value: top,
      gameId: h.gameId,
      roundIndex: h.handIndex,
    }))
    .sort((a, b) => (a.playerId < b.playerId ? -1 : 1));
}

const rate = (t: Tally) => t.made / t.bids;

/** A 'YYYY-MM-DD' day's awards from the hands done that day in `tz` (the device's when omitted). */
export function dailyAwards(f: KtFacts, day: string, tz?: string): Award[] {
  const [from, to] = dayRange(day, tz);
  const hands = within(f.hands, from, to);
  const t = [...tallies(hands)];
  return [
    ...best(
      t.map(([id, x]) => [id, x.points]),
      'day_star',
      1,
      (v) => v > 0,
    ),
    ...biggestBid(
      hands.filter((h) => h.made),
      'day_bid',
    ),
    ...best(
      t.map(([id, x]) => [id, x.partnerWon]),
      'day_partner',
      1,
      (v) => v >= 2,
    ),
    ...best(
      t.filter(([, x]) => x.bids >= DAY_SHARP_BIDS).map(([id, x]) => [id, rate(x)]),
      'day_sharp',
      1,
      (v) => v > 0,
    ),
    ...best(
      t.map(([id, x]) => [id, x.beaten]),
      'day_killer',
      1,
      (v) => v >= 2,
    ),
    ...biggestBid(
      hands.filter((h) => !h.made),
      'day_overcooked',
    ),
    ...best(
      t.map(([id, x]) => [id, x.hands]),
      'day_grinder',
    ),
  ];
}

/**
 * A 'YYYY-MM' month: win-rate standings (8+ finished games), the podium, then Sharpest Bidder, Kingmaker and Iron
 * Player among the ranked, then the climber.
 */
export function season(f: KtFacts, month: string, tz?: string): SeasonResult<WinRateRow> {
  const pg = playerGames(f);
  const [from, to] = monthRange(month, tz);
  const standings = winRateStandings(pg, from, to, SEASON_MIN_GAMES);
  const [pf, pt] = monthRange(prevMonth(month), tz);
  const before = winRateStandings(pg, pf, pt, SEASON_MIN_GAMES);
  const t = tallies(within(f.hands, from, to));
  const ranked = standings.filter((r) => r.qualified);
  const of = (id: string) => t.get(id);
  return {
    season: month,
    standings,
    awards: [
      ...seasonPlaces(standings),
      ...best(
        ranked
          .filter((r) => (of(r.playerId)?.bids ?? 0) >= SEASON_SHARP_BIDS)
          .map((r) => [r.playerId, rate(of(r.playerId)!)]),
        'season_sharpest',
        1,
        (v) => v > 0,
      ),
      ...best(
        ranked.map((r) => [r.playerId, of(r.playerId)?.partnerWon ?? 0]),
        'season_kingmaker',
        1,
        (v) => v > 0,
      ),
      ...best(
        ranked.map((r) => [r.playerId, r.games]),
        'season_iron',
      ),
      ...climber(standings, before),
    ],
  };
}

/** Days with a hand done, newest first. */
export const playedDays = (f: KtFacts, tz?: string): string[] =>
  [...new Set(f.hands.map((h) => dayOf(h.doneAt, tz)))].sort().reverse();

/** Months with a hand done or a game finished, newest first. */
export const playedMonths = (f: KtFacts, tz?: string): string[] =>
  [
    ...new Set([
      ...f.hands.map((h) => monthOf(h.doneAt, tz)),
      ...playerGames(f).map((p) => monthOf(p.endedAt, tz)),
    ]),
  ]
    .sort()
    .reverse();
