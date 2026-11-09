// Relative, like types.ts: the mock API loads the domain outside Vite. Periods are Kachuful's ranges.
import { rangeFor } from '../../kachuful/domain/ranges';
import { doneHands, handScore, result, standings } from './scoring';
import { playerKey } from './stats';
import type { KtGame, KtHand, Player } from './types';

/** The board's periods, as the server names them: today, the last 7 days, this month, all time. */
export type KtPeriod = 'today' | 'week' | 'season' | 'all';
export type KtSort = 'points' | 'wins' | 'made';
export const PERIODS: readonly KtPeriod[] = ['today', 'week', 'season', 'all'];
export const SORTS: readonly KtSort[] = ['points', 'wins', 'made'];
/** Hands bid before made % ranks a player. Unconfirmed by Jay; the server ranks anyone with a bid. */
export const MIN_BIDS = 5;

const RANGE_OF = { today: 'today', week: '7d', season: 'month', all: 'all' } as const;

/** A period as half-open [from, to) epoch ms around `now` (the device's timezone when tz is undefined). */
export function periodRange(p: KtPeriod, now: number, tz?: string): { from: number; to: number } {
  const { from, to } = rangeFor(RANGE_OF[p], now, tz);
  return { from, to };
}

/** When a hand counts: its own time, else the game's last change (older saves). */
const doneAt = (g: KtGame, h: KtHand) => h.doneAt ?? g.updatedAt;
/** When a finished game ended; null while it can still be played. */
export const endedAt = (g: KtGame): number | null =>
  g.status === 'finished' ? (g.finishedAt ?? g.updatedAt) : null;

/** One player's totals over a period, as the server's kt_player_day sums them. */
export interface KtTally {
  playerId: string;
  /** Games whose first hand was done in the period. */
  games: number;
  /** Games that ended in the period with this player first (ties included). */
  wins: number;
  /** Points from hands done in the period. */
  points: number;
  handsBid: number;
  bidsMade: number;
}

export function ktTallies(games: KtGame[], from: number, to: number): Map<string, KtTally> {
  const out = new Map<string, KtTally>();
  const get = (id: string) => {
    let t = out.get(id);
    if (!t)
      out.set(id, (t = { playerId: id, games: 0, wins: 0, points: 0, handsBid: 0, bidsMade: 0 }));
    return t;
  };
  const inside = (t: number) => t >= from && t < to;
  for (const g of games) {
    const hs = doneHands(g);
    if (!hs.length) continue;
    const ids = g.players.map((p) => p.id);
    const key = (id: string) => playerKey(g.players[ids.indexOf(id)]);
    if (inside(Math.min(...hs.map((h) => doneAt(g, h)))))
      for (const id of ids) get(key(id)).games++;
    for (const h of hs) {
      if (!inside(doneAt(g, h))) continue;
      const s = handScore(h, g.rules, ids);
      for (const id of ids) get(key(id)).points += s[id];
      const b = get(key(h.bidder!));
      b.handsBid++;
      b.bidsMade += Number(result(h, g.rules)!.made);
    }
    const end = endedAt(g);
    if (end != null && inside(end))
      for (const s of standings(g)) get(playerKey(s.p)).wins += Number(s.rank === 1);
  }
  return out;
}

export interface KtBoardRow extends KtTally {
  /** Null when unranked: made % with fewer than the minimum bids. */
  rank: number | null;
  qualified: boolean;
  /** The sorted value: points, wins, or made % as 0–1. */
  value: number;
  madeRate: number | null;
}

export interface KtBoardQuery {
  from: number;
  to: number;
  sort: KtSort;
  minBids?: number;
}

/** Best first; ties on the value share a rank (1, 1, 3) and list by points, then id. Unranked rows go last. */
export function ktLeaderboard(games: KtGame[], q: KtBoardQuery): KtBoardRow[] {
  const min = Math.max(1, q.minBids ?? MIN_BIDS);
  const rows: KtBoardRow[] = [...ktTallies(games, q.from, q.to).values()].map((t) => {
    const madeRate = t.handsBid ? t.bidsMade / t.handsBid : null;
    return {
      ...t,
      rank: null,
      madeRate,
      qualified: q.sort !== 'made' || t.handsBid >= min,
      value: q.sort === 'points' ? t.points : q.sort === 'wins' ? t.wins : (madeRate ?? 0),
    };
  });
  rows.sort(
    (a, b) =>
      Number(b.qualified) - Number(a.qualified) ||
      b.value - a.value ||
      b.points - a.points ||
      a.playerId.localeCompare(b.playerId),
  );
  rows.forEach((r, i) => {
    if (!r.qualified) return;
    const prev = rows[i - 1];
    r.rank = prev?.qualified && prev.value === r.value ? prev.rank : i + 1;
  });
  return rows;
}

/** Everyone who has played a hand, with how they look in their latest game. Most games first, then by name. */
export interface KtRosterRow {
  playerId: string;
  player: Player;
  games: number;
  lastAt: number;
}

export function roster(games: KtGame[]): KtRosterRow[] {
  const out = new Map<string, KtRosterRow>();
  for (const g of games) {
    if (!doneHands(g).length) continue;
    for (const p of g.players) {
      const k = playerKey(p),
        e = out.get(k);
      const newer = !e || g.updatedAt >= e.lastAt;
      out.set(k, {
        playerId: k,
        player: newer ? p : e.player,
        games: (e?.games ?? 0) + 1,
        lastAt: newer ? g.updatedAt : e.lastAt,
      });
    }
  }
  return [...out.values()].sort(
    (a, b) => b.games - a.games || a.player.name.localeCompare(b.player.name),
  );
}

/** One game in a player's list: where they finished (ended games only) and their points. */
export interface KtPlayerGame {
  gameId: string;
  at: number;
  ended: boolean;
  place: number | null;
  points: number;
  hands: number;
}

/** The games a player sat in with a hand done, newest first. */
export function playerGames(games: KtGame[], key: string): KtPlayerGame[] {
  const out: KtPlayerGame[] = [];
  for (const g of games) {
    const hs = doneHands(g);
    const me = standings(g).find((s) => playerKey(s.p) === key);
    if (!me || !hs.length) continue;
    const end = endedAt(g);
    out.push({
      gameId: g.syncId,
      at: end ?? g.updatedAt,
      ended: end != null,
      place: end != null ? me.rank : null,
      points: me.t,
      hands: hs.length,
    });
  }
  return out.sort((a, b) => b.at - a.at);
}

/** Who a player sat with most, by games shared. */
export function opponents(games: KtGame[], key: string): { playerId: string; games: number }[] {
  const n = new Map<string, number>();
  for (const g of games) {
    const ks = g.players.map(playerKey);
    if (!doneHands(g).length || !ks.includes(key)) continue;
    for (const k of ks) if (k !== key) n.set(k, (n.get(k) ?? 0) + 1);
  }
  return [...n]
    .map(([playerId, c]) => ({ playerId, games: c }))
    .sort((a, b) => b.games - a.games || a.playerId.localeCompare(b.playerId));
}
