import type { LeaderboardRow } from '@/sync/types';

/** The first `top` rows with at least `minRounds` rounds, in the board's order (most rounds first). */
export const pickRegulars = (rows: LeaderboardRow[], top: number, minRounds: number) =>
  rows.filter((r) => r.rounds >= minRounds).slice(0, top);

/** The server's "no end" (2100-01-01); a fixed end, unlike tomorrow, keeps the cache key the same every day. */
export const ALL_TIME_TO = 4_102_444_800_000;
