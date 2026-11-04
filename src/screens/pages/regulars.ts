import type { LeaderboardRow } from '@/sync/types';

/** The first `top` rows with at least `minGames` games, in the board's order; the server trims too, this is the guard. */
export const pickRegulars = (rows: LeaderboardRow[], top: number, minGames: number) =>
  rows.filter((r) => r.games >= minGames).slice(0, top);

/** The server's "no end" (2100-01-01); a fixed end, unlike tomorrow, keeps the cache key the same every day. */
export const ALL_TIME_TO = 4_102_444_800_000;
