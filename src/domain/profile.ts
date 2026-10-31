import { accuracyOf, avgOf, tallies, winRateOf } from './leaderboard';
import { dayOf } from './ranges';
import type { Facts, GameFact } from './timeline';
import type { Trump } from './types';

export interface MadeOf {
  made: number;
  total: number;
}

/** The contract's PlayerStats (plan-backend §6.3) for one player over [from, to). */
export interface ProfileStats {
  points: number;
  rounds: number;
  made: number;
  missed: number;
  accuracy: number;
  avgPerRound: number;
  games: number;
  gamesEnded: number;
  wins: number;
  winRate: number;
  places: { 1: number; 2: number; 3: number };
  bestRound: number | null;
  worstRound: number | null;
  longestHot: number;
  longestCold: number;
  hookHits: number;
  /** The game with this player's highest total, ended in the range. */
  bestGame: { gameId: string; points: number; endedAt: number } | null;
  bidHistogram: Record<string, MadeOf>;
  byCards: Record<string, MadeOf>;
  byTrump: Partial<Record<Trump, MadeOf>>;
  asDealer: { rounds: number; made: number };
}

const bump = (o: Record<string, MadeOf>, k: string | number, made: boolean) => {
  const e = (o[k] ??= { made: 0, total: 0 });
  e.total++;
  if (made) e.made++;
};

export function profileStats(f: Facts, playerId: string, from = 0, to = Infinity): ProfileStats {
  const t = tallies(f, from, to).get(playerId);
  const rounds = f.rounds.filter(
    (r) => r.playerId === playerId && r.doneAt >= from && r.doneAt < to,
  );
  const ended = f.players.filter(
    (p) =>
      p.playerId === playerId &&
      p.endedAt != null &&
      p.place != null &&
      p.endedAt >= from &&
      p.endedAt < to,
  );
  const bidHistogram: Record<string, MadeOf> = {},
    byCards: Record<string, MadeOf> = {},
    byTrump: Record<string, MadeOf> = {};
  const asDealer = { rounds: 0, made: 0 };
  for (const r of rounds) {
    const ok = r.outcome === 'made';
    bump(bidHistogram, r.bid, ok);
    bump(byCards, r.cards, ok);
    bump(byTrump, r.trump, ok);
    if (r.isDealer) {
      asDealer.rounds++;
      if (ok) asDealer.made++;
    }
  }
  const best = ended.reduce<GameFact | null>((a, p) => (!a || p.points > a.points ? p : a), null);
  const n = t ?? { points: 0, rounds: 0, made: 0, games: 0, gamesEnded: 0, wins: 0 };
  return {
    points: n.points,
    rounds: n.rounds,
    made: n.made,
    missed: n.rounds - n.made,
    accuracy: accuracyOf(n),
    avgPerRound: avgOf(n),
    games: n.games,
    gamesEnded: n.gamesEnded,
    wins: n.wins,
    winRate: winRateOf(n),
    places: {
      1: ended.filter((p) => p.place === 1).length,
      2: ended.filter((p) => p.place === 2).length,
      3: ended.filter((p) => p.place === 3).length,
    },
    bestRound: t && t.rounds ? t.bestRound : null,
    worstRound: t && t.rounds ? t.worstRound : null,
    longestHot: t?.longestHot ?? 0,
    longestCold: t?.longestCold ?? 0,
    hookHits: t?.hookHits ?? 0,
    bestGame: best && { gameId: best.gameId, points: best.points, endedAt: best.endedAt! },
    bidHistogram,
    byCards,
    byTrump,
    asDealer,
  };
}

/** Rounds played per day (for the calendar heatmap). */
export function calendar(f: Facts, playerId: string, tz?: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of f.rounds)
    if (r.playerId === playerId) {
      const d = dayOf(r.doneAt, tz);
      out[d] = (out[d] ?? 0) + 1;
    }
  return out;
}

/** Points after each round, in time order (for the sparkline). */
export function pointsOverTime(f: Facts, playerId: string, from = 0, to = Infinity): number[] {
  let sum = 0;
  return f.rounds
    .filter((r) => r.playerId === playerId && r.doneAt >= from && r.doneAt < to)
    .sort((a, b) => a.doneAt - b.doneAt || a.roundIndex - b.roundIndex)
    .map((r) => (sum += r.points));
}

/** The people a player has shared most tables with. */
export function opponents(f: Facts, playerId: string): { playerId: string; games: number }[] {
  const mine = new Set(f.players.filter((p) => p.playerId === playerId).map((p) => p.gameId));
  const n = new Map<string, number>();
  for (const p of f.players)
    if (p.playerId !== playerId && mine.has(p.gameId))
      n.set(p.playerId, (n.get(p.playerId) ?? 0) + 1);
  return [...n.entries()]
    .map(([id, games]) => ({ playerId: id, games }))
    .sort((a, b) => b.games - a.games || (a.playerId < b.playerId ? -1 : 1));
}

/** The contract's HeadToHead, over games both played that ended in [from, to). */
export interface HeadToHead {
  a: string;
  b: string;
  games: number;
  /** Finishing above the other. */
  aAhead: number;
  bAhead: number;
  ties: number;
  aPoints: number;
  bPoints: number;
  lastGames: string[];
  biggestWin: { by: number; winner: string; gameId: string } | null;
}

export function headToHead(f: Facts, a: string, b: string, from = 0, to = Infinity): HeadToHead {
  const byGame = new Map<string, { a?: GameFact; b?: GameFact }>();
  for (const p of f.players) {
    if (p.endedAt == null || p.place == null || p.endedAt < from || p.endedAt >= to) continue;
    if (p.playerId !== a && p.playerId !== b) continue;
    const e = byGame.get(p.gameId) ?? {};
    e[p.playerId === a ? 'a' : 'b'] = p;
    byGame.set(p.gameId, e);
  }
  const both = [...byGame.values()]
    .filter((e): e is { a: GameFact; b: GameFact } => !!e.a && !!e.b)
    .sort((x, y) => y.a.endedAt! - x.a.endedAt!);
  const h: HeadToHead = {
    a,
    b,
    games: both.length,
    aAhead: 0,
    bAhead: 0,
    ties: 0,
    aPoints: 0,
    bPoints: 0,
    lastGames: both.slice(0, 5).map((e) => e.a.gameId),
    biggestWin: null,
  };
  for (const e of both) {
    h.aPoints += e.a.points;
    h.bPoints += e.b.points;
    if (e.a.place! < e.b.place!) h.aAhead++;
    else if (e.b.place! < e.a.place!) h.bAhead++;
    else h.ties++;
    const by = Math.abs(e.a.points - e.b.points);
    if (e.a.points !== e.b.points && (!h.biggestWin || by > h.biggestWin.by))
      h.biggestWin = { by, winner: e.a.points > e.b.points ? a : b, gameId: e.a.gameId };
  }
  return h;
}
