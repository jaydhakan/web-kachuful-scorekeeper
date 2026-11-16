/**
 * Spades' boards from games on this device, by the server's rules (backend app/domain/spades/stats.py): a finished
 * game gives each player a row; a cancelled or unfinished one gives none; a draw is played, not won. Signed out the
 * app shows these; the mock API serves the same numbers. Pure, with relative imports so the mock can load it.
 */
import { handLines, partnerOf, scoresOf, teamOf, totals } from './index';
import type { Seat, SpGame, SpHand, TeamId } from './types';
import { pidOf } from '../../../people/pid';

export const SP_PERIODS = ['today', 'week', 'season', 'all'] as const;
export type SpPeriod = (typeof SP_PERIODS)[number];
export const SP_SORTS = ['wins', 'rate', 'made'] as const;
export type SpSort = (typeof SP_SORTS)[number];
/** A win rate ranks only from this many games. */
export const MIN_RATED_GAMES = 3;

/** Hand counts for one player: bids are non-Nil; made and set are the team's contract. */
export interface SpTally {
  hands: number;
  bids: number;
  bidsMade: number;
  nils: number;
  nilsMade: number;
  blindNils: number;
  blindNilsMade: number;
  bags: number;
  sets: number;
}

/** A player's totals as the server's board rows and stats carry them. */
export interface SpTotals extends SpTally {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number | null;
  madeRate: number | null;
  nilRate: number | null;
  blindNilRate: number | null;
  bagsPerHand: number | null;
}

export type SpOutcome = 'win' | 'draw' | 'loss';

/** One player's row of one finished game; `result` is null for someone replaced before the end. */
export interface SpFact {
  gameId: string;
  /** The registry id, else `name:<name>` (pidOf). */
  player: string;
  seat: Seat;
  team: TeamId;
  partner: string | null;
  result: SpOutcome | null;
  score: number;
  oppScore: number;
  /** When the game ended: the day it counts on. */
  endedAt: number;
  tally: SpTally;
}

const TALLY_KEYS: (keyof SpTally)[] = [
  'hands',
  'bids',
  'bidsMade',
  'nils',
  'nilsMade',
  'blindNils',
  'blindNilsMade',
  'bags',
  'sets',
];
const noTally = (): SpTally => ({
  hands: 0,
  bids: 0,
  bidsMade: 0,
  nils: 0,
  nilsMade: 0,
  blindNils: 0,
  blindNilsMade: 0,
  bags: 0,
  sets: 0,
});

const SEATS: Seat[] = [0, 1, 2, 3];

/** Who played each seat: the hand's own record (online, after a Replace), else the game's seats. */
const handPlayers = (h: SpHand, seats: (string | null)[]) =>
  Array.isArray(h.players) && h.players.length === 4 ? h.players : seats;

/** The rows of a finished game, as the server's player_rows; none for any other game. */
export function spFacts(g: SpGame): SpFact[] {
  if (g.status !== 'finished' || !g.result) return [];
  const seats = g.players.map((p) => pidOf(p));
  const scores = scoresOf(totals(g.hands));
  const lines = new Map(handLines(g.hands).map((l) => [l.index, l]));
  const seen = new Map<string, { tally: SpTally; seat: Seat; partner: string | null }>();
  for (const h of g.hands) {
    const line = lines.get(h.index);
    if (!line) continue;
    const players = handPlayers(h, seats);
    for (const seat of SEATS) {
      const pid = players[seat];
      if (!pid) continue;
      const e = seen.get(pid) ?? { tally: noTally(), seat, partner: null };
      e.seat = seat;
      e.partner = players[partnerOf(seat)] ?? null;
      const team = line[teamOf(seat)];
      const t = e.tally;
      t.hands++;
      t.bags += team.bags;
      if (h.bids[seat] === 0) {
        const made = team.nils.some((n) => n.seat === seat && n.made);
        if (h.blind[seat])
          [t.blindNils, t.blindNilsMade] = [t.blindNils + 1, t.blindNilsMade + +made];
        else [t.nils, t.nilsMade] = [t.nils + 1, t.nilsMade + +made];
      } else {
        t.bids++;
        t.bidsMade += +(team.made === true);
        t.sets += +(team.made === false);
      }
      seen.set(pid, e);
    }
  }
  const endedAt = g.finishedAt ?? g.updatedAt;
  const row = (player: string, seat: Seat, partner: string | null, result: SpOutcome | null) => {
    const team = teamOf(seat);
    return {
      gameId: g.syncId,
      player,
      seat,
      team,
      partner,
      result,
      score: scores[team],
      oppScore: scores[team === 'a' ? 'b' : 'a'],
      endedAt,
      tally: seen.get(player)?.tally ?? noTally(),
    };
  };
  const out = new Map<string, SpFact>();
  for (const [pid, e] of seen) out.set(pid, row(pid, e.seat, e.partner, null));
  const winner = g.result.winner;
  for (const seat of SEATS) {
    const pid = seats[seat];
    const result: SpOutcome = winner === 'draw' ? 'draw' : winner === teamOf(seat) ? 'win' : 'loss';
    out.set(pid, row(pid, seat, seats[partnerOf(seat)], result));
  }
  return [...out.values()];
}

const rate = (a: number, b: number) => (b ? a / b : null);

/** Games, results and hand counts over some rows; only rows with a result count as games. */
export function totalFacts(facts: readonly SpFact[]): SpTotals & { bestScore: number | null } {
  const t = noTally();
  let [games, wins, draws, losses] = [0, 0, 0, 0];
  let bestScore: number | null = null;
  for (const f of facts) {
    for (const k of TALLY_KEYS) t[k] += f.tally[k];
    if (!f.result) continue;
    games++;
    wins += +(f.result === 'win');
    draws += +(f.result === 'draw');
    losses += +(f.result === 'loss');
    bestScore = bestScore === null ? f.score : Math.max(bestScore, f.score);
  }
  return {
    games,
    wins,
    draws,
    losses,
    ...t,
    winRate: rate(wins, games),
    madeRate: rate(t.bidsMade, t.bids),
    nilRate: rate(t.nilsMade, t.nils),
    blindNilRate: rate(t.blindNilsMade, t.blindNils),
    bagsPerHand: rate(t.bags, t.hands),
    bestScore,
  };
}

export interface SpRanked {
  /** Null when unranked for the sort: rate needs MIN_RATED_GAMES games, made a bid. */
  rank: number | null;
  player: string;
  /** The sorted value: wins, win rate or made rate (0–1); 0 when unranked. */
  value: number;
  totals: SpTotals;
}

function sortValue(t: SpTotals, sort: SpSort): number | null {
  if (sort === 'wins') return t.wins;
  if (sort === 'rate') return t.games >= MIN_RATED_GAMES ? t.wins / t.games : null;
  return t.madeRate;
}

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Best first; ties share a rank and list by games, then id; unranked players last, by games then id. */
export function rankBoard(byPlayer: Map<string, SpTotals>, sort: SpSort): SpRanked[] {
  const scored = [...byPlayer].map(([player, t]) => ({ player, t, v: sortValue(t, sort) }));
  const ranked = scored
    .filter((x) => x.v !== null)
    .sort((a, b) => b.v! - a.v! || b.t.games - a.t.games || byId(a.player, b.player));
  const rest = scored
    .filter((x) => x.v === null)
    .sort((a, b) => b.t.games - a.t.games || byId(a.player, b.player));
  let rank = 0;
  let prev: number | null = null;
  return [
    ...ranked.map((x, i) => {
      if (x.v !== prev) [rank, prev] = [i + 1, x.v];
      return { rank, player: x.player, value: x.v!, totals: x.t };
    }),
    ...rest.map((x) => ({ rank: null, player: x.player, value: 0, totals: x.t })),
  ];
}

export interface SpPairRec {
  a: string;
  b: string;
  games: number;
  wins: number;
  draws: number;
  winRate: number;
}

/** Partner pairs with games together: most wins, then win rate, then games, then ids. */
export function pairsOf(facts: readonly SpFact[]): SpPairRec[] {
  const found = new Map<string, SpPairRec>();
  for (const f of facts) {
    if (!f.result || f.partner === null || f.player > f.partner) continue;
    const k = f.player + '|' + f.partner;
    const p = found.get(k) ?? {
      a: f.player,
      b: f.partner,
      games: 0,
      wins: 0,
      draws: 0,
      winRate: 0,
    };
    p.games++;
    p.wins += +(f.result === 'win');
    p.draws += +(f.result === 'draw');
    p.winRate = p.wins / p.games;
    found.set(k, p);
  }
  return [...found.values()].sort(
    (x, y) =>
      y.wins - x.wins ||
      y.winRate - x.winRate ||
      y.games - x.games ||
      byId(x.a, y.a) ||
      byId(x.b, y.b),
  );
}

const TOP_PAIRS = 20;
const pad = (n: number) => String(n).padStart(2, '0');
/** 'YYYY-MM-DD' of an instant on this device's calendar. */
export const localDay = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const shiftDay = (day: string, n: number) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

/** [first, end) day keys of a period; null is all time. As the server's period_days. */
export function periodDays(period: SpPeriod, today: string): [string, string] | null {
  const tomorrow = shiftDay(today, 1);
  if (period === 'today') return [today, tomorrow];
  if (period === 'week') return [shiftDay(today, -6), tomorrow];
  if (period === 'season') {
    const first = today.slice(0, 8) + '01';
    return [first, shiftDay(first, 32).slice(0, 8) + '01'];
  }
  return null;
}

export interface SpBoardOpts {
  period: SpPeriod;
  sort: SpSort;
  now?: number;
  /** The day an instant falls on ('YYYY-MM-DD'); the device's calendar unless given (the mock passes its TZ). */
  dayOf?: (t: number) => string;
}

/** Every row of these games (finished ones only; deleted and conflict copies are the caller's to leave out). */
export const allFacts = (games: readonly SpGame[]) => games.flatMap(spFacts);

/** The leaderboard: players ranked over games that finished in the period, and the best partner pairs. */
export function spLeaderboard(
  games: readonly SpGame[],
  o: SpBoardOpts,
): { rows: SpRanked[]; pairs: SpPairRec[] } {
  const day = o.dayOf ?? localDay;
  const span = periodDays(o.period, day(o.now ?? Date.now()));
  const facts = allFacts(games).filter((f) => {
    if (!span) return true;
    const d = day(f.endedAt);
    return d >= span[0] && d < span[1];
  });
  const grouped = new Map<string, SpFact[]>();
  for (const f of facts) grouped.set(f.player, [...(grouped.get(f.player) ?? []), f]);
  const byPlayer = new Map([...grouped].map(([k, fs]) => [k, withoutBest(totalFacts(fs))]));
  return { rows: rankBoard(byPlayer, o.sort), pairs: pairsOf(facts).slice(0, TOP_PAIRS) };
}

// Board rows carry no best score (the server's don't).
function withoutBest(t: SpTotals & { bestScore?: number | null }): SpTotals {
  delete t.bestScore;
  return t;
}

export interface SpPartnerRec {
  player: string;
  games: number;
  wins: number;
  winRate: number;
}

/** A player's totals, best team score and partners (most games together first), all time. */
export function spPlayerStats(games: readonly SpGame[], player: string) {
  const facts = allFacts(games).filter((f) => f.player === player);
  const partners = new Map<string, SpPartnerRec>();
  for (const f of facts) {
    if (!f.result || f.partner === null) continue;
    const p = partners.get(f.partner) ?? { player: f.partner, games: 0, wins: 0, winRate: 0 };
    p.games++;
    p.wins += +(f.result === 'win');
    p.winRate = p.wins / p.games;
    partners.set(f.partner, p);
  }
  return {
    ...totalFacts(facts),
    partners: [...partners.values()].sort(
      (x, y) => y.games - x.games || y.wins - x.wins || byId(x.player, y.player),
    ),
  };
}

export interface SpVs {
  games: number;
  together: number;
  togetherWins: number;
  against: number;
  aWins: number;
  bWins: number;
  draws: number;
}

/** Two players across the finished games both had a result in: as partners or opponents. */
export function spHeadToHead(games: readonly SpGame[], a: string, b: string): SpVs {
  const out: SpVs = {
    games: 0,
    together: 0,
    togetherWins: 0,
    against: 0,
    aWins: 0,
    bWins: 0,
    draws: 0,
  };
  const byGame = new Map<string, Map<string, SpFact>>();
  for (const f of allFacts(games))
    if (f.result && (f.player === a || f.player === b))
      byGame.set(f.gameId, (byGame.get(f.gameId) ?? new Map()).set(f.player, f));
  for (const seats of byGame.values()) {
    const [fa, fb] = [seats.get(a), seats.get(b)];
    if (!fa || !fb) continue;
    out.games++;
    if (fa.team === fb.team) {
      out.together++;
      out.togetherWins += +(fa.result === 'win');
      continue;
    }
    out.against++;
    out.aWins += +(fa.result === 'win');
    out.bWins += +(fb.result === 'win');
    out.draws += +(fa.result === 'draw');
  }
  return out;
}
