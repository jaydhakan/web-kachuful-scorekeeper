import { nameKey } from './names';
import { doneRounds } from './rounds';
import { pts } from './scoring';
import { standings } from './standings';
import type { Game, LengthMode, Outcome, Player, Trump } from './types';

/** A game nobody has touched for this long counts as ended (the server's auto-end does the same). */
export const AUTO_END_MS = 24 * 3600e3;

/** Who a seat is across games: the registry id, or the name for a game from before the registry. */
export const pidOf = (p: Pick<Player, 'playerId' | 'name'>): string =>
  p.playerId ?? `name:${nameKey(p.name)}`;

/** One player's part in one done round (the server's round_scores row). */
export interface RoundFact {
  gameId: string;
  roundIndex: number;
  playerId: string;
  doneAt: number;
  cards: number;
  maxCards: number;
  trump: Trump;
  bid: number;
  outcome: Outcome;
  points: number;
  isDealer: boolean;
  /** Attempts at the blocked number, charged to the dealer only. */
  hookHits: number;
  /** Made (hot) or missed (cold) run length within the game after this round. */
  runHot: number;
  runCold: number;
  tableSize: number;
  /** How many at the table made their bid this round. */
  madeCount: number;
}

/** One player's whole game (the server's game_players row). */
export interface GameFact {
  gameId: string;
  playerId: string;
  localId: string;
  seat: number;
  name: string;
  emoji: string;
  color: string;
  points: number;
  /** Competition place (1, 1, 3) once the game has ended. */
  place: number | null;
  won: boolean;
  rounds: number;
  made: number;
  missed: number;
  bestRound: number | null;
  worstRound: number | null;
  longestHot: number;
  longestCold: number;
  hookHits: number;
  endedAt: number | null;
}

export interface GameInfo {
  gameId: string;
  createdAt: number;
  updatedAt: number;
  endedAt: number | null;
  autoEnded: boolean;
  status: Game['status'];
  rounds: number;
  lengthMode: LengthMode;
  playerIds: string[];
  tableSize: number;
}

export interface Facts {
  rounds: RoundFact[];
  players: GameFact[];
  games: GameInfo[];
  /** The latest look of every player seen. */
  people: Map<string, { playerId: string; name: string; emoji: string; color: string }>;
}

export const doneAtOf = (g: Game, i: number): number => g.rounds[i]?.doneAt ?? g.updatedAt;

/**
 * When a game ended: its finish time, or for a game idle for a day with a round done, its last round (like the
 * server's auto-end). Null while it can still be played.
 */
export function gameEndedAt(g: Game, now: number): { at: number | null; auto: boolean } {
  if (g.status === 'finished') return { at: g.finishedAt ?? g.updatedAt, auto: false };
  const done = doneRounds(g);
  if (done.length && now - g.updatedAt >= AUTO_END_MS)
    return { at: Math.max(...done.map((r) => r.doneAt ?? g.updatedAt)), auto: true };
  return { at: null, auto: false };
}

export function roundFacts(g: Game): RoundFact[] {
  const out: RoundFact[] = [];
  const hot: Record<string, number> = {},
    cold: Record<string, number> = {};
  for (const r of doneRounds(g)) {
    const madeCount = g.players.filter((p) => r.results[p.id] === 'made').length;
    g.players.forEach((p, seat) => {
      const outcome = r.results[p.id] ?? 'missed';
      hot[p.id] = outcome === 'made' ? (hot[p.id] ?? 0) + 1 : 0;
      cold[p.id] = outcome === 'missed' ? (cold[p.id] ?? 0) + 1 : 0;
      const isDealer = seat === r.dealerIndex;
      out.push({
        gameId: g.syncId,
        roundIndex: r.index,
        playerId: pidOf(p),
        doneAt: r.doneAt ?? g.updatedAt,
        cards: r.cards,
        maxCards: g.maxCards,
        trump: r.trump,
        bid: r.bids[p.id] ?? 0,
        outcome,
        points: pts(r, p.id) ?? 0,
        isDealer,
        hookHits: isDealer ? r.hookHits || 0 : 0,
        runHot: hot[p.id],
        runCold: cold[p.id],
        tableSize: g.players.length,
        madeCount,
      });
    });
  }
  return out;
}

export function gameFacts(g: Game, endedAt: number | null, rounds = roundFacts(g)): GameFact[] {
  const st = standings(g);
  return g.players.map((p, seat) => {
    const mine = rounds.filter((r) => r.playerId === pidOf(p));
    const s = st.find((x) => x.p.id === p.id)!;
    const place = endedAt != null && mine.length ? s.rank : null;
    const pts = mine.map((r) => r.points);
    return {
      gameId: g.syncId,
      playerId: pidOf(p),
      localId: p.id,
      seat,
      name: p.name,
      emoji: p.emoji,
      color: p.color,
      points: s.t,
      place,
      won: place === 1,
      rounds: mine.length,
      made: mine.filter((r) => r.outcome === 'made').length,
      missed: mine.filter((r) => r.outcome === 'missed').length,
      bestRound: pts.length ? Math.max(...pts) : null,
      worstRound: pts.length ? Math.min(...pts) : null,
      longestHot: Math.max(0, ...mine.map((r) => r.runHot)),
      longestCold: Math.max(0, ...mine.map((r) => r.runCold)),
      hookHits: mine.reduce((a, r) => a + r.hookHits, 0),
      endedAt,
    };
  });
}

/** Everything the boards, stats and achievements read, from a set of games. */
export function buildFacts(games: Game[], now: number): Facts {
  const facts: Facts = { rounds: [], players: [], games: [], people: new Map() };
  const sorted = [...games].sort((a, b) => a.createdAt - b.createdAt);
  for (const g of sorted) {
    const rounds = roundFacts(g);
    const end = gameEndedAt(g, now);
    facts.rounds.push(...rounds);
    facts.players.push(...gameFacts(g, end.at, rounds));
    facts.games.push({
      gameId: g.syncId,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
      endedAt: end.at,
      autoEnded: end.auto,
      status: g.status,
      rounds: doneRounds(g).length,
      lengthMode: g.lengthMode,
      playerIds: g.players.map(pidOf),
      tableSize: g.players.length,
    });
    for (const p of g.players)
      facts.people.set(pidOf(p), {
        playerId: pidOf(p),
        name: p.name,
        emoji: p.emoji,
        color: p.color,
      });
  }
  return facts;
}
