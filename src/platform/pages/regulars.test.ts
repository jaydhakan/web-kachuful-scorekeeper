import type { LeaderboardRow } from '@/sync/types';
import { pickRegulars } from './regulars';

const row = (name: string, games: number, rounds: number): LeaderboardRow => ({
  rank: null,
  qualified: true,
  player: { id: name, displayName: name } as LeaderboardRow['player'],
  value: rounds,
  points: 0,
  games,
  rounds,
  wins: 0,
  accuracy: 0,
  longestHot: 0,
  rankDelta: null,
});

describe('pickRegulars', () => {
  it('keeps only players with at least the minimum rounds, in board order', () => {
    const rows = [row('A', 49, 900), row('B', 50, 500), row('C', 120, 499)];
    expect(pickRegulars(rows, 10, 500).map((r) => r.player.id)).toEqual(['A', 'B']);
  });

  it('stops at top', () => {
    const rows = Array.from({ length: 15 }, (_, i) => row(`P${i}`, 60, 1000 - i));
    expect(pickRegulars(rows, 10, 500)).toHaveLength(10);
  });

  it('is empty when nobody qualifies', () => {
    expect(pickRegulars([row('A', 3, 30)], 10, 500)).toEqual([]);
  });
});
