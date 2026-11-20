/**
 * Spades' achievements (plan §3): one catalogue for the scorekeeper and online tables. Hand moments go to whoever
 * played the hand, game ones to whoever sat at the end (as the boards count them). Pure, with relative imports so the
 * mock API and the fixture export load it; the backend mirrors it in app/domain/spades/achievements.py.
 */
import {
  careerCounts,
  countLadder,
  crew,
  CREW_LADDER,
  gamesPlayed,
  GAMES_LADDER,
  winStreaks,
  WIN_STREAK,
} from '../../../progression/rules';
import {
  earnedKey,
  type AchievementDef,
  type Earned,
  type Ladder,
  type PlayerGameFact,
  hide,
} from '../../../progression/types';
import { partsIn } from '../../../progression/zone';
import { pidOf } from '../../../people/pid';
import { allFacts, type SpFact } from './boards';
import { otherTeam, seatsOf, SEATS, teamOf } from './seats';
import { handLines, totals, type HandLine } from './standings';
import type { Seat, SpGame, SpHand, SpPublic, TeamId, TrickRec } from './types';

const d = (
  code: string,
  emoji: string,
  group: AchievementDef['group'],
  x: 'big' | 'shame' | '' = '',
): AchievementDef => ({
  code,
  emoji,
  group,
  ...(x === 'big' && { big: true }),
  ...(x === 'shame' && { shame: true }),
});

export const HANDS_STEPS = [100, 500, 1000];
export const MADE_STEPS = [50, 250, 500];
export const NILS_STEPS = [5, 25, 50];

/** Every ladder, in the page's (and the server's LADDER_IDS) order. */
export const SP_LADDERS: Ladder[] = [
  WIN_STREAK,
  GAMES_LADDER,
  countLadder('hands', 'hands', HANDS_STEPS),
  countLadder('made', 'made', MADE_STEPS),
  countLadder('nils', 'nils', NILS_STEPS),
  CREW_LADDER,
];

/** The catalogue, group by group in the page's order; names and how-tos are strings, by code. */
export const SP_CATALOGUE: AchievementDef[] = hide(
  [
    d('boston', '🧹', 'moment', 'big'),
    d('ice_cold', '🧊', 'moment'),
    d('blindside', '🙈', 'moment', 'big'),
    d('double_nil', '👯', 'moment', 'big'),
    d('nil_breaker', '🔨', 'moment'),
    d('set_them', '🪓', 'moment'),
    d('high_roller', '🎰', 'moment'),
    d('bang_on', '🎯', 'moment'),
    d('sandbagged', '🛍️', 'moment', 'shame'),
    d('blind_spot', '🫣', 'moment', 'shame'),
    d('last_gasp', '⏱️', 'moment'),
    d('deuce_ace', '🪨', 'moment', 'big'),
    d('one_man_band', '🎺', 'moment'),
    d('winner', '🏆', 'game'),
    d('comeback', '🔄', 'game', 'big'),
    d('exact', '🌟', 'game', 'big'),
    d('mercy', '😵', 'game'),
    d('shutout', '🚫', 'game', 'big'),
    d('wire_to_wire', '🏁', 'game'),
    d('photo_finish', '📸', 'game'),
    d('runaway', '🏃', 'game'),
    d('bag_collector', '👜', 'game', 'shame'),
    d('marathon', '🏃‍♂️', 'game'),
    d('night_owl', '🦉', 'game'),
    d('first_win', '🥇', 'career'),
    d('back_to_back', '✌️', 'career'),
    d('hat_trick', '🎩', 'career', 'big'),
    d('dynasty', '🦸', 'career', 'big'),
    ...GAMES_LADDER.codes.map((c) => d(c, '🎲', 'career')),
    ...HANDS_STEPS.map((n) => d(`hands_${n}`, '🔁', 'career')),
    ...MADE_STEPS.map((n) => d(`made_${n}`, '✅', 'career')),
    ...NILS_STEPS.map((n) => d(`nils_${n}`, '🕳️', 'career')),
    d('crew_10', '👥', 'career'),
    d('crew_25', '👥', 'career'),
    d('perfect_pair', '🤝', 'career'),
    d('day_pair', '👫', 'daily'),
    d('day_sharp', '🎯', 'daily'),
    d('day_nil', '🧊', 'daily'),
    d('day_setter', '🪓', 'daily'),
    d('day_boston', '🧹', 'daily'),
    d('day_bags', '🛍️', 'daily', 'shame'),
    d('day_grinder', '⏱️', 'daily'),
    d('season_champion', '👑', 'season', 'big'),
    d('season_runner_up', '🥈', 'season'),
    d('season_third', '🥉', 'season'),
    d('season_sharpest', '🎯', 'season'),
    d('season_nil', '🧊', 'season'),
    d('season_pair', '👫', 'season'),
    d('season_iron', '🦾', 'season'),
    d('season_climber', '📈', 'season'),
  ],
  ['deuce_ace', 'one_man_band'],
);

/** Points behind, after some hand, that a win must come back from. */
export const COMEBACK_GAP = 150;
/** Wins with one partner for Perfect Pair. */
export const PAIR_WINS = 10;
const ONLINE_TRICKS = 13;

/** An online table as a scorekeeper game, so both kinds go through the same rules (`syncId` is the table's id). */
export function tableAsGame(t: SpPublic): SpGame {
  return {
    kind: 'spades',
    schemaVersion: 1,
    id: t.id,
    syncId: t.id,
    rev: t.rev,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    ...(t.finishedAt != null && { finishedAt: t.finishedAt }),
    players: t.seats.map((s, i) => ({
      id: `seat-${i}`,
      name: s.who?.name ?? '',
      emoji: s.who?.emoji ?? '',
      color: s.who?.color ?? '',
      ...(s.who && { playerId: s.who.playerId }),
    })),
    firstDealerIndex: 0,
    direction: 'cw',
    rules: t.rules,
    hands: t.history,
    status: t.status === 'finished' || t.status === 'cancelled' ? t.status : 'active',
    ...(t.result && { result: t.result }),
  };
}

/** Who sat in each seat at the end (null for an empty online seat). */
const seatIds = (g: SpGame): (string | null)[] =>
  g.players.map((p) => (p.playerId || p.name ? pidOf(p) : null));

/** Who played each seat of a hand: its own record (online, after a Replace), else the game's seats. */
const handPlayers = (h: SpHand, seats: (string | null)[]) =>
  Array.isArray(h.players) && h.players.length === 4 ? h.players : seats;

const ix = (t: TeamId) => (t === 'a' ? 0 : 1);

/** Online only: the team's bidders reach their contract with the 13th trick, not before. */
function lastGasp(h: SpHand, t: TeamId, tricks: readonly TrickRec[]): boolean {
  const bidders = seatsOf(t).filter((s) => h.bids[s] !== 0);
  if (!bidders.length) return false;
  const contract = bidders.reduce((n: number, s) => n + (h.bids[s] ?? 0), 0);
  const ours = (x: TrickRec) => bidders.includes(x.winner);
  return tricks.slice(0, 12).filter(ours).length === contract - 1 && ours(tricks[12]);
}

/** Online only: `s` won a trick led in another suit with the 2♠ while that suit's Ace was in it. */
const deuceAce = (tricks: readonly TrickRec[], s: Seat) =>
  tricks.some((x) => {
    const led = x.plays[0]?.card.suit;
    return (
      led !== 'spades' &&
      x.winner === s &&
      x.plays.some((p) => p.seat === s && p.card.rank === '2' && p.card.suit === 'spades') &&
      x.plays.some((p) => p.card.rank === 'A' && p.card.suit === led)
    );
  });

/** The codes one seat earns in one scored hand, in catalogue order. */
function handCodes(h: SpHand, line: HandLine, s: Seat): string[] {
  const t = teamOf(s);
  const mine = line[t],
    theirs = line[otherTeam(t)];
  const nil = mine.nils.find((n) => n.seat === s);
  const tricks = h.tricks?.length === ONLINE_TRICKS ? h.tricks : null;
  const out: string[] = [];
  const add = (ok: boolean, code: string) => ok && out.push(code);
  add(h.teamTricks?.[ix(t)] === 13, 'boston');
  add(!!nil && nil.made && !nil.blind, 'ice_cold');
  add(!!nil && nil.made && nil.blind, 'blindside');
  add(mine.nils.length === 2 && mine.nils.every((n) => n.made), 'double_nil');
  add(
    theirs.nils.some((n) => !n.made),
    'nil_breaker',
  );
  add(theirs.made === false, 'set_them');
  add(mine.made === true && mine.contract >= 10, 'high_roller');
  add(mine.made === true && mine.contract >= 7 && mine.bags === 0, 'bang_on');
  add(mine.penalty > 0, 'sandbagged');
  add(!!nil && nil.blind && !nil.made, 'blind_spot');
  if (tricks) {
    add(lastGasp(h, t, tricks), 'last_gasp');
    add(deuceAce(tricks, s), 'deuce_ace');
    add(tricks.filter((x) => x.winner === s).length >= 7, 'one_man_band');
  }
  return out;
}

/** When a hand counts: its doneAt, else the game's last change (as the server's hand_at). */
const handAt = (g: SpGame, h: SpHand) => h.doneAt ?? g.updatedAt;

/** One scored hand's moments, everyone's, in seat order. */
function handMomentsOf(g: SpGame, h: SpHand, line: HandLine, seats: (string | null)[]): Earned[] {
  const players = handPlayers(h, seats);
  return SEATS.flatMap((s) => {
    const p = players[s];
    if (!p) return [];
    return handCodes(h, line, s).map((code) => ({
      code,
      playerId: p,
      gameId: g.syncId,
      roundIndex: h.index,
      period: null,
      earnedAt: handAt(g, h),
      data: {},
    }));
  });
}

/** The codes one seat at the end earns when the game finishes, in catalogue order. */
function endCodes(g: SpGame, lines: HandLine[], s: Seat, tz?: string): string[] {
  const t = teamOf(s),
    o = otherTeam(t);
  const won = g.result!.winner === t;
  const last = lines.at(-1)?.after ?? { a: 0, b: 0 };
  const margin = last[t] - last[o];
  const out: string[] = [];
  const add = (ok: boolean, code: string) => ok && out.push(code);
  add(won, 'winner');
  add(won && lines.some((l) => l.after[o] - l.after[t] >= COMEBACK_GAP), 'comeback');
  add(
    won && lines.length >= 4 && lines.every((l) => l[t].made !== false && l[t].bags === 0),
    'exact',
  );
  add(won && g.result!.endedBy === 'mercy', 'mercy');
  add(won && lines.length >= 3 && lines.every((l) => l.after[o] <= 0), 'shutout');
  add(won && lines.length >= 5 && lines.every((l) => l.after[t] > l.after[o]), 'wire_to_wire');
  add(won && margin <= 20, 'photo_finish');
  add(won && margin >= 200, 'runaway');
  add(totals(g.hands)[t].penalties >= 2, 'bag_collector');
  add(lines.length >= 15, 'marathon');
  const h = partsIn(g.finishedAt ?? g.updatedAt, tz).h;
  add(h >= 1 && h < 5, 'night_owl');
  return out;
}

/**
 * One game's hand moments and, once it finished with a result, its game-end achievements; a cancelled game earns
 * nothing. "Night" is judged in `tz` (the device's zone when left out).
 */
export function gameAchievements(g: SpGame, tz?: string): Earned[] {
  if (g.status === 'cancelled') return [];
  const seats = seatIds(g);
  const lines = handLines(g.hands);
  const byIndex = new Map(g.hands.map((h) => [h.index, h]));
  const out = lines.flatMap((l) => handMomentsOf(g, byIndex.get(l.index)!, l, seats));
  if (g.status !== 'finished' || !g.result) return out;
  const at = g.finishedAt ?? g.updatedAt;
  for (const s of SEATS) {
    const p = seats[s];
    if (!p) continue;
    for (const code of endCodes(g, lines, s, tz))
      out.push({
        code,
        playerId: p,
        gameId: g.syncId,
        roundIndex: null,
        period: null,
        earnedAt: at,
        data: {},
      });
  }
  return out;
}

/** One hand's moments (the live pop): who earned what as that hand was scored. */
export const handMoments = (g: SpGame, index: number): Earned[] =>
  gameAchievements(g).filter((e) => e.roundIndex === index);

/** The shared career rules' facts: one per player seated at the end of a finished game (a draw is not a win). */
export const playerFacts = (rows: readonly SpFact[]): PlayerGameFact[] =>
  rows.flatMap((r) =>
    r.result
      ? [
          {
            gameId: r.gameId,
            playerId: r.player,
            endedAt: r.endedAt,
            place: r.result === 'loss' ? 2 : 1,
            won: r.result === 'win',
          },
        ]
      : [],
  );

const byEnd = (rows: readonly SpFact[]) =>
  [...rows].sort((a, b) => a.endedAt - b.endedAt || (a.gameId < b.gameId ? -1 : 1));

const rowEarned = (r: SpFact, code: string, data: Record<string, unknown>): Earned => ({
  code,
  playerId: r.player,
  gameId: r.gameId,
  roundIndex: null,
  period: null,
  earnedAt: r.endedAt,
  data,
});

type Counted = 'hands' | 'made' | 'nils';
const COUNTS: [Counted, number[], (r: SpFact) => number][] = [
  ['hands', HANDS_STEPS, (r) => r.tally.hands],
  ['made', MADE_STEPS, (r) => r.tally.bidsMade],
  ['nils', NILS_STEPS, (r) => r.tally.nilsMade + r.tally.blindNilsMade],
];

/** hands_N, made_N and nils_N at the finished game that takes a player's running count to N (a replaced seat counts). */
function countLadders(rows: readonly SpFact[]): Earned[] {
  const out: Earned[] = [];
  const run = new Map<string, Record<Counted, number>>();
  for (const r of byEnd(rows)) {
    const c = run.get(r.player) ?? { hands: 0, made: 0, nils: 0 };
    for (const [k, steps, of] of COUNTS) {
      const before = c[k];
      c[k] += of(r);
      for (const n of steps)
        if (before < n && c[k] >= n) out.push(rowEarned(r, `${k}_${n}`, { n }));
    }
    run.set(r.player, c);
  }
  return out;
}

/** Perfect Pair: once per partner, at the tenth win together. */
function perfectPair(rows: readonly SpFact[]): Earned[] {
  const out: Earned[] = [];
  const wins = new Map<string, number>();
  for (const r of byEnd(rows)) {
    if (r.result !== 'win' || !r.partner) continue;
    const k = `${r.player}|${r.partner}`;
    const n = (wins.get(k) ?? 0) + 1;
    wins.set(k, n);
    if (n === PAIR_WINS) out.push(rowEarned(r, 'perfect_pair', { partner: r.partner }));
  }
  return out;
}

/** Every career achievement from these games' rows (finished games only). */
export function careerAchievements(games: readonly SpGame[]): Earned[] {
  const rows = allFacts(games);
  const facts = playerFacts(rows);
  return [
    ...winStreaks(facts),
    ...gamesPlayed(facts),
    ...countLadders(rows),
    ...crew(facts),
    ...perfectPair(rows),
  ];
}

/** Everything these games earned (hand, game and career), oldest first. */
export function allAchievements(games: readonly SpGame[], tz?: string): Earned[] {
  return [...games.flatMap((g) => gameAchievements(g, tz)), ...careerAchievements(games)].sort(
    (a, b) => a.earnedAt - b.earnedAt || (earnedKey(a) < earnedKey(b) ? -1 : 1),
  );
}

/** Each ladder's count for one player, counted the way its codes are earned. */
export function ladderCounts(games: readonly SpGame[], playerId: string): Record<string, number> {
  const rows = allFacts(games);
  const mine = rows.filter((r) => r.player === playerId);
  const sum = (k: number) => mine.reduce((n, r) => n + COUNTS[k][2](r), 0);
  const { wins, games: played, crew: met } = careerCounts(playerFacts(rows), playerId);
  return { wins, games: played, hands: sum(0), made: sum(1), nils: sum(2), crew: met };
}
