import type { IshaaraPlayerRow } from './types';

/** A finished, non-abandoned game's row for one seat, with when it ended (boards count only these). */
export interface BoardRow extends IshaaraPlayerRow {
  gameId: string;
  finishedAt: number;
}

export type IshaaraSort = 'wins' | 'rate' | 'found';
export const ISHAARA_SORTS: readonly IshaaraSort[] = ['wins', 'rate', 'found'];
/** Games before win % ranks a player. */
export const MIN_GAMES = 3;

export interface IshaaraTally {
  playerId: string;
  games: number;
  wins: number;
  winRate: number;
  wordsFound: number;
  wrongPicks: number;
  trapHits: number;
  clueGames: number;
  clueWins: number;
  cluesGiven: number;
  /** Mean of the per-game averages of finite clue numbers; null when none (compare with a tolerance). */
  avgClueNumber: number | null;
  penalties: number;
}

interface Acc extends Omit<IshaaraTally, 'winRate' | 'avgClueNumber'> {
  avgSum: number;
  avgGames: number;
}

/** Totals per player over the rows given (the caller filters the period). */
export function tallies(rows: readonly BoardRow[]): IshaaraTally[] {
  const by = new Map<string, Acc>();
  for (const r of rows) {
    let a = by.get(r.playerId);
    if (!a) {
      a = {
        playerId: r.playerId,
        games: 0,
        wins: 0,
        wordsFound: 0,
        wrongPicks: 0,
        trapHits: 0,
        clueGames: 0,
        clueWins: 0,
        cluesGiven: 0,
        avgSum: 0,
        avgGames: 0,
        penalties: 0,
      };
      by.set(r.playerId, a);
    }
    a.games++;
    if (r.won) a.wins++;
    a.wordsFound += r.wordsFound;
    a.wrongPicks += r.wrongPicks;
    if (r.trapHit) a.trapHits++;
    if (r.role === 'clue-giver') {
      a.clueGames++;
      if (r.won) a.clueWins++;
      a.cluesGiven += r.cluesGiven;
      if (r.avgClueNumber !== null) {
        a.avgSum += r.avgClueNumber;
        a.avgGames++;
      }
      a.penalties += r.penalties;
    }
  }
  return [...by.values()].map(({ avgSum, avgGames, ...a }) => ({
    ...a,
    winRate: a.wins / a.games,
    avgClueNumber: avgGames > 0 ? avgSum / avgGames : null,
  }));
}

export interface IshaaraBoardRow extends IshaaraTally {
  rank: number | null;
  value: number;
}

const valueOf = (t: IshaaraTally, sort: IshaaraSort) =>
  sort === 'wins' ? t.wins : sort === 'rate' ? t.winRate : t.wordsFound;

/**
 * Ranked: by the sort's value, then games, then playerId. Win % ranks only players with at least MIN_GAMES; the rest
 * follow with a null rank. Equal values share a rank.
 */
export function leaderboard(rows: readonly BoardRow[], sort: IshaaraSort): IshaaraBoardRow[] {
  const ts = tallies(rows);
  const qualified = (t: IshaaraTally) => sort !== 'rate' || t.games >= MIN_GAMES;
  ts.sort(
    (a, b) =>
      Number(qualified(b)) - Number(qualified(a)) ||
      valueOf(b, sort) - valueOf(a, sort) ||
      b.games - a.games ||
      (a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0),
  );
  let rank = 0;
  let prev: number | null = null;
  return ts.map((t, i) => {
    const value = valueOf(t, sort);
    if (!qualified(t)) return { ...t, rank: null, value };
    if (prev === null || value !== prev) rank = i + 1;
    prev = value;
    return { ...t, rank, value };
  });
}

export interface IshaaraHeadToHead {
  games: number;
  together: number;
  togetherWins: number;
  against: number;
  aWins: number;
  bWins: number;
}

/** Two players across finished games both sat in: as teammates and as opponents. */
export function headToHead(rows: readonly BoardRow[], a: string, b: string): IshaaraHeadToHead {
  const out: IshaaraHeadToHead = {
    games: 0,
    together: 0,
    togetherWins: 0,
    against: 0,
    aWins: 0,
    bWins: 0,
  };
  const byGame = new Map<string, { a?: BoardRow; b?: BoardRow }>();
  for (const r of rows) {
    if (r.playerId !== a && r.playerId !== b) continue;
    const g = byGame.get(r.gameId) ?? {};
    if (r.playerId === a) g.a = r;
    else g.b = r;
    byGame.set(r.gameId, g);
  }
  for (const { a: ra, b: rb } of byGame.values()) {
    if (!ra || !rb) continue;
    out.games++;
    if (ra.team === rb.team) {
      out.together++;
      if (ra.won) out.togetherWins++;
    } else {
      out.against++;
      if (ra.won) out.aWins++;
      if (rb.won) out.bWins++;
    }
  }
  return out;
}
