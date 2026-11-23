/**
 * Baithak Wrapped for one night (REWARDS-PLAN §7.2): the games played with gaps of three hours or less, and the
 * night's story from their facts. Pure: the table device builds it from its own games.
 */
import type { Facts } from './timeline';

/** Games further apart than this are different nights; a night across midnight stays one. */
export const NIGHT_GAP_MS = 3 * 3600e3;
/** A night is "tonight" until its last game is this old. */
export const NIGHT_FRESH_MS = 12 * 3600e3;

export interface NightPlayer {
  playerId: string;
  wins: number;
  games: number;
  /** Points against the table: each game's points minus that table's average, summed. */
  edge: number;
}

export interface Night {
  from: number;
  to: number;
  gameIds: string[];
  players: NightPlayer[];
  /** Most wins, then the best edge; null when nobody won a game. */
  winner: string | null;
  /** The largest single round, up or down. */
  swing: { playerId: string; points: number } | null;
  /** The highest bid made, and (at a table of three or more) the highest missed: told kindly. */
  bestBid: { playerId: string; bid: number; cards: number } | null;
  braveCall: { playerId: string; bid: number; cards: number } | null;
  /** Each game's winners, in order. */
  gameWinners: string[][];
}

/** The night of the latest ended game, if it is still tonight; null otherwise. */
export function nightOf(f: Facts, now: number): Night | null {
  const ended = f.games.filter((g) => g.endedAt != null).sort((a, b) => b.endedAt! - a.endedAt!);
  if (!ended.length || now - ended[0].endedAt! > NIGHT_FRESH_MS) return null;
  const night = [ended[0]];
  for (const g of ended.slice(1)) {
    const later = night[night.length - 1];
    if (later.createdAt - g.endedAt! > NIGHT_GAP_MS) break;
    night.push(g);
  }
  night.reverse();
  const ids = new Set(night.map((g) => g.gameId));
  const seats = f.players.filter((p) => ids.has(p.gameId));
  const rounds = f.rounds.filter((r) => ids.has(r.gameId));

  const players = new Map<string, NightPlayer>();
  for (const g of night) {
    const here = seats.filter((p) => p.gameId === g.gameId);
    const avg = here.reduce((a, p) => a + p.points, 0) / Math.max(1, here.length);
    for (const p of here) {
      const x = players.get(p.playerId) ?? { playerId: p.playerId, wins: 0, games: 0, edge: 0 };
      x.games++;
      x.wins += p.won ? 1 : 0;
      x.edge += p.points - avg;
      players.set(p.playerId, x);
    }
  }
  const ranked = [...players.values()].sort(
    (a, b) => b.wins - a.wins || b.edge - a.edge || (a.playerId < b.playerId ? -1 : 1),
  );
  const swing = rounds.reduce<Night['swing']>(
    (best, r) =>
      !best || Math.abs(r.points) > Math.abs(best.points)
        ? { playerId: r.playerId, points: r.points }
        : best,
    null,
  );
  const bid = (made: boolean) =>
    rounds
      .filter((r) => (r.outcome === 'made') === made && (made || r.tableSize >= 3))
      .reduce<Night['bestBid']>(
        (best, r) =>
          !best || r.bid > best.bid ? { playerId: r.playerId, bid: r.bid, cards: r.cards } : best,
        null,
      );
  return {
    from: night[0].createdAt,
    to: night[night.length - 1].endedAt!,
    gameIds: night.map((g) => g.gameId),
    players: ranked,
    winner: ranked[0]?.wins ? ranked[0].playerId : null,
    swing,
    bestBid: bid(true),
    braveCall: bid(false),
    gameWinners: night.map((g) =>
      seats.filter((p) => p.gameId === g.gameId && p.won).map((p) => p.playerId),
    ),
  };
}
