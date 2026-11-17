/**
 * Kaali Teeri's achievements (plan §4): hand moments, game finish and career, over the rows the server stores per
 * game (kt_hands, kt_game_players), so the backend's mirror reads the same facts. Pure.
 */
// Relative, like types.ts: the mock API loads the domain outside Vite.
import { deckTotal } from './cards';
import { doneHands, handScore } from './scoring';
import { gamePlayerRows, handRows, playerKey } from './stats';
import type { KtGame, Sweep } from './types';
import {
  atEnd,
  careerCounts,
  countLadder,
  crew,
  CREW_LADDER,
  gamesPlayed,
  GAMES_LADDER,
  nightOwl,
  winStreaks,
  WIN_STREAK,
  woodenSpoon,
} from '../../../progression/rules';
import {
  earnedKey,
  type AchievementDef,
  type AchievementGroup,
  type Earned,
  type Ladder,
  type PlayerGameFact,
} from '../../../progression/types';

/** One done hand, as kt_hands stores it; players by key (registry id, else `name:<key>`). */
export interface KtHandFact {
  gameId: string;
  handIndex: number;
  /** The hand's doneAt, else the game's last change. */
  doneAt: number;
  /** The points in play: 250 with one deck, 500 with two. */
  deck: number;
  bidderId: string;
  bid: number;
  /** Taken at the minimum after everyone passed; only a hand entered with its full auction can say so. */
  forced: boolean;
  /** The bidding side without the bidder: everyone who played a called card. */
  partnerIds: string[];
  slots: Record<string, number>;
  teamPoints: number;
  made: boolean;
  sweep: Sweep;
  /** Every seat's points for the hand. */
  scores: Record<string, number>;
}

/** One seat of a stored game, as kt_game_players stores it. */
export interface KtSeatFact {
  gameId: string;
  playerId: string;
  points: number;
  /** Null until the game has ended. */
  place: number | null;
  endedAt: number | null;
  handsBid: number;
  bidsMade: number;
  partnerMade: number;
}

export interface KtFacts {
  hands: KtHandFact[];
  seats: KtSeatFact[];
}

/** A finished game ends at finishedAt, else its last change (Kaali Teeri games never auto-end). */
const endOf = (g: KtGame): number | null =>
  g.status === 'finished' ? (g.finishedAt ?? g.updatedAt) : null;

/** The facts of one game, as an upload writes its rows; a game with no hand done has none. */
export function gameFacts(g: KtGame): KtFacts {
  if (!doneHands(g).length) return { hands: [], seats: [] };
  const ids = g.players.map((p) => p.id);
  const key = Object.fromEntries(g.players.map((p) => [p.id, playerKey(p)]));
  const deck = deckTotal(g.rules.decks);
  const hands = handRows(g).map((r): KtHandFact => {
    const s = handScore(g.hands[r.handIndex], g.rules, ids);
    return {
      gameId: g.syncId,
      handIndex: r.handIndex,
      doneAt: r.doneAt ?? g.updatedAt,
      deck,
      bidderId: r.bidderId,
      bid: r.bid,
      forced: r.forced,
      partnerIds: r.partnerIds,
      slots: r.slots,
      teamPoints: r.teamPoints,
      made: r.made,
      sweep: r.sweep,
      scores: Object.fromEntries(ids.map((id) => [key[id], s[id]])),
    };
  });
  const endedAt = endOf(g);
  const seats = gamePlayerRows(g).map((p): KtSeatFact => ({
    gameId: g.syncId,
    playerId: p.playerId,
    points: p.points,
    place: p.place,
    endedAt,
    handsBid: p.handsBid,
    bidsMade: p.bidsMade,
    partnerMade: p.partnerMade,
  }));
  return { hands, seats };
}

/** Every game's facts together. */
export function ktFacts(games: readonly KtGame[]): KtFacts {
  const all = games.map(gameFacts);
  return { hands: all.flatMap((f) => f.hands), seats: all.flatMap((f) => f.seats) };
}

const d = (
  code: string,
  emoji: string,
  group: AchievementGroup,
  k: { big?: true; shame?: true } = {},
): AchievementDef => ({ code, emoji, group, ...k });

export const HANDS_STEPS = [100, 500, 1000];
export const MADE_STEPS = [10, 50, 100];
export const PARTNER_STEPS = [10, 50, 100];
export const STREAK_STEPS = [3, 5, 8];
/** Hands won on the same bidding side as one person for Partners in Crime. */
export const PARTNERS_IN_CRIME = 10;

export type KtLadderId = 'wins' | 'games' | 'hands' | 'made' | 'partner' | 'streak' | 'crew';

export const KT_LADDERS: Ladder<KtLadderId>[] = [
  WIN_STREAK,
  GAMES_LADDER,
  countLadder('hands', 'hands', HANDS_STEPS),
  countLadder('made', 'made', MADE_STEPS),
  countLadder('partner', 'partner', PARTNER_STEPS),
  countLadder('streak', 'streak', STREAK_STEPS),
  CREW_LADDER,
];

/** The whole catalogue in page order (plan §4): 10 hand, 11 game, 23 career, 7 daily, 7 season. */
export const KT_ACHIEVEMENTS: AchievementDef[] = [
  d('high_roller', '🎰', 'moment'),
  d('all_in', '💎', 'moment', { big: true }),
  d('clean_sweep', '🧹', 'moment', { big: true }),
  d('brick_wall', '🧱', 'moment', { big: true }),
  d('lone_wolf', '🐺', 'moment', { big: true }),
  d('double_agent', '🕵️', 'moment'),
  d('giant_killer', '🪓', 'moment'),
  d('stuck_with_it', '🫠', 'moment'),
  d('so_close', '😬', 'moment', { shame: true }),
  d('overcooked', '🔥', 'moment', { shame: true }),
  d('winner', '🏆', 'game'),
  d('comeback', '🔄', 'game', { big: true }),
  d('wire_to_wire', '🏁', 'game'),
  d('thousandaire', '💰', 'game'),
  d('never_wrong', '✅', 'game'),
  d('kingmaker', '👑', 'game'),
  d('wooden_spoon', '🥄', 'game', { shame: true }),
  d('blanked', '0️⃣', 'game', { shame: true }),
  d('full_house', '🏠', 'game'),
  d('marathon', '🏃‍♂️', 'game'),
  d('night_owl', '🦉', 'game'),
  d('first_win', '🥇', 'career'),
  d('back_to_back', '✌️', 'career'),
  d('hat_trick', '🎩', 'career'),
  d('dynasty', '🏰', 'career'),
  ...GAMES_LADDER.codes.map((c) => d(c, '🃏', 'career')),
  ...HANDS_STEPS.map((n) => d(`hands_${n}`, '🔁', 'career')),
  ...MADE_STEPS.map((n) => d(`made_${n}`, '🎯', 'career')),
  ...PARTNER_STEPS.map((n) => d(`partner_${n}`, '🤝', 'career')),
  d('streak_3', '🔥', 'career'),
  d('streak_5', '⚡', 'career'),
  d('streak_8', '🤴', 'career'),
  ...CREW_LADDER.codes.map((c) => d(c, '👥', 'career')),
  d('partners_in_crime', '🤝', 'career'),
  d('day_star', '⭐', 'daily'),
  d('day_bid', '💎', 'daily'),
  d('day_partner', '🤝', 'daily'),
  d('day_sharp', '🎯', 'daily'),
  d('day_killer', '🪓', 'daily'),
  d('day_overcooked', '🔥', 'daily', { shame: true }),
  d('day_grinder', '⏱️', 'daily'),
  d('season_champion', '👑', 'season', { big: true }),
  d('season_runner_up', '🥈', 'season'),
  d('season_third', '🥉', 'season'),
  d('season_sharpest', '🎯', 'season'),
  d('season_kingmaker', '👑', 'season'),
  d('season_iron', '🦾', 'season'),
  d('season_climber', '📈', 'season'),
];

export const MOMENT_CODES = KT_ACHIEVEMENTS.filter((a) => a.group === 'moment').map((a) => a.code);

/** "80% of the deck": 200 with one deck, 400 with two. */
export const bigBid = (deck: number) => (deck * 4) / 5;

const atHand = (
  h: KtHandFact,
  playerId: string,
  code: string,
  data: Record<string, unknown> = {},
): Earned => ({
  code,
  playerId,
  gameId: h.gameId,
  roundIndex: h.handIndex,
  period: null,
  earnedAt: h.doneAt,
  data,
});

/** The moments of one hand: the bidder's, the bidding side's and the defenders'. */
export function handMoments(h: KtHandFact): Earned[] {
  const out: Earned[] = [];
  const b = h.bidderId,
    big = h.bid >= bigBid(h.deck);
  const side = [b, ...h.partnerIds];
  const defenders = Object.keys(h.scores).filter((p) => !side.includes(p));
  const bid = { bid: h.bid };
  if (h.made) {
    if (big) out.push(atHand(h, b, 'high_roller', bid));
    if (h.bid === h.deck) out.push(atHand(h, b, 'all_in', bid));
    if (!h.partnerIds.length) out.push(atHand(h, b, 'lone_wolf'));
    if (h.forced) out.push(atHand(h, b, 'stuck_with_it', bid));
    for (const p of h.partnerIds)
      if ((h.slots[p] ?? 0) >= 2) out.push(atHand(h, p, 'double_agent', { slots: h.slots[p] }));
  } else {
    if (h.bid - h.teamPoints === 5) out.push(atHand(h, b, 'so_close', bid));
    if (big) out.push(atHand(h, b, 'overcooked', bid));
    if (big) for (const p of defenders) out.push(atHand(h, p, 'giant_killer', bid));
  }
  if (h.sweep === 'bidders') for (const p of side) out.push(atHand(h, p, 'clean_sweep'));
  if (h.sweep === 'defenders') for (const p of defenders) out.push(atHand(h, p, 'brick_wall'));
  return out;
}

/** Hands in play order: by when they were done, then game, then index. */
const inOrder = (hands: readonly KtHandFact[]) =>
  [...hands].sort(
    (a, b) =>
      a.doneAt - b.doneAt ||
      (a.gameId < b.gameId ? -1 : a.gameId > b.gameId ? 1 : 0) ||
      a.handIndex - b.handIndex,
  );

/** Every finished game's seats as the shared rules read them. */
export const playerGames = (f: KtFacts): PlayerGameFact[] =>
  f.seats
    .filter((s) => s.endedAt != null && s.place != null)
    .map((s) => ({
      gameId: s.gameId,
      playerId: s.playerId,
      endedAt: s.endedAt!,
      place: s.place!,
      won: s.place === 1,
    }));

/** Competition ranks (1, 1, 3) after each hand of one game, by running total. */
function ranksAfterEachHand(hands: readonly KtHandFact[]): Map<string, number>[] {
  const tot = new Map<string, number>();
  return [...hands]
    .sort((a, b) => a.handIndex - b.handIndex)
    .map((h) => {
      for (const [p, v] of Object.entries(h.scores)) tot.set(p, (tot.get(p) ?? 0) + v);
      const vals = [...tot.values()];
      return new Map([...tot].map(([p, v]) => [p, 1 + vals.filter((x) => x > v).length]));
    });
}

/** Game finish for one ended game, earned at its end; `tz` decides "night" (the device's zone when omitted). */
function finishOf(seats: KtSeatFact[], hands: KtHandFact[], tz?: string): Earned[] {
  const pg = playerGames({ hands, seats });
  if (!pg.length) return [];
  const n = hands.length;
  const steps = ranksAfterEachHand(hands);
  const out: Earned[] = [];
  for (const s of seats) {
    const p = pg.find((x) => x.playerId === s.playerId)!;
    if (p.won) {
      out.push(atEnd(p, 'winner', { points: s.points }));
      // Last with someone ahead, after a hand at or past halfway and before the final one.
      const low = steps.some((r, k) => {
        const worst = Math.max(...r.values());
        return (k + 1) * 2 >= n && k < n - 1 && worst > 1 && r.get(p.playerId) === worst;
      });
      if (n >= 6 && low) out.push(atEnd(p, 'comeback'));
      if (n >= 6 && steps.every((r) => r.get(p.playerId) === 1)) out.push(atEnd(p, 'wire_to_wire'));
    }
    if (s.points >= 1000) out.push(atEnd(p, 'thousandaire', { points: s.points }));
    if (s.handsBid >= 3 && s.bidsMade === s.handsBid)
      out.push(atEnd(p, 'never_wrong', { bids: s.handsBid }));
    if (s.partnerMade >= 3) out.push(atEnd(p, 'kingmaker', { hands: s.partnerMade }));
    if (n >= 6 && s.points === 0) out.push(atEnd(p, 'blanked'));
    if (seats.length === 10) out.push(atEnd(p, 'full_house'));
    if (n >= 20) out.push(atEnd(p, 'marathon', { hands: n }));
  }
  return [...out, ...woodenSpoon(pg), ...nightOwl(pg, tz)];
}

const byGame = <T extends { gameId: string }>(xs: readonly T[]) => {
  const m = new Map<string, T[]>();
  for (const x of xs) m.set(x.gameId, [...(m.get(x.gameId) ?? []), x]);
  return m;
};

/** One stored game's rows: its hand moments, and its finish once it has ended. */
export function gameAchievements(f: KtFacts, tz?: string): Earned[] {
  const hands = byGame(f.hands);
  const out = f.hands.flatMap(handMoments);
  for (const [id, seats] of byGame(f.seats)) out.push(...finishOf(seats, hands.get(id) ?? [], tz));
  return out;
}

/** The hand counts of one player, in play order, with each hand that moved them. */
function handCareer(id: string, hands: readonly KtHandFact[], out: Earned[]) {
  let played = 0,
    made = 0,
    partner = 0,
    run = 0,
    longest = 0;
  const mates = new Map<string, number>();
  const credited = new Set<string>();
  for (const h of hands) {
    if (!(id in h.scores)) continue;
    played++;
    if (HANDS_STEPS.includes(played)) out.push(atHand(h, id, `hands_${played}`, { n: played }));
    if (h.bidderId === id) {
      run = h.made ? run + 1 : 0;
      longest = Math.max(longest, run);
      if (h.made && MADE_STEPS.includes(++made))
        out.push(atHand(h, id, `made_${made}`, { n: made }));
      if (h.made && STREAK_STEPS.includes(run))
        out.push(atHand(h, id, `streak_${run}`, { n: run }));
    }
    const side = [h.bidderId, ...h.partnerIds];
    if (!h.made || !side.includes(id)) continue;
    if (h.partnerIds.includes(id) && PARTNER_STEPS.includes(++partner))
      out.push(atHand(h, id, `partner_${partner}`, { n: partner }));
    for (const o of side) if (o !== id) mates.set(o, (mates.get(o) ?? 0) + 1);
    // One per hand (the row's key); a second person reaching it waits for their next win together.
    const due = side
      .filter((o) => o !== id && !credited.has(o) && mates.get(o)! >= PARTNERS_IN_CRIME)
      .sort();
    if (due.length) {
      credited.add(due[0]);
      out.push(atHand(h, id, 'partners_in_crime', { with: due[0] }));
    }
  }
  return { played, made, partner, longest };
}

/** Career achievements of everyone in `f`: wins, games and crew over ended games; the rest over every done hand. */
export function careerAchievements(f: KtFacts): Earned[] {
  const pg = playerGames(f);
  const out = [...winStreaks(pg), ...gamesPlayed(pg), ...crew(pg)];
  const hands = inOrder(f.hands);
  for (const id of [...new Set(f.seats.map((s) => s.playerId))].sort()) handCareer(id, hands, out);
  return out;
}

/** Each ladder's count for one player, counted the way its codes are earned. */
export function ladderCounts(f: KtFacts, playerId: string): Record<KtLadderId, number> {
  const c = careerCounts(playerGames(f), playerId);
  const h = handCareer(playerId, inOrder(f.hands), []);
  return {
    wins: c.wins,
    games: c.games,
    hands: h.played,
    made: h.made,
    partner: h.partner,
    streak: h.longest,
    crew: c.crew,
  };
}

/** Everything earned from a set of games, oldest first. */
export function allAchievements(f: KtFacts, tz?: string): Earned[] {
  return [...gameAchievements(f, tz), ...careerAchievements(f)].sort(
    (a, b) => a.earnedAt - b.earnedAt || (earnedKey(a) < earnedKey(b) ? -1 : 1),
  );
}

/** The moments of one hand of a game on the table, for the live pop (seat ids by key). */
export function momentsOfHand(g: KtGame, index: number): Earned[] {
  const h = gameFacts(g).hands.find((x) => x.handIndex === index);
  return h ? handMoments(h) : [];
}
