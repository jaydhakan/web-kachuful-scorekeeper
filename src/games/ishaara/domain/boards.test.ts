import { describe, expect, it } from 'vitest';
import { headToHead, leaderboard, tallies, type BoardRow } from './boards';

const row = (
  gameId: string,
  playerId: string,
  team: 'sun' | 'moon',
  won: boolean,
  o: Partial<BoardRow> = {},
): BoardRow => ({
  gameId,
  playerId,
  team,
  won,
  finishedAt: 0,
  role: 'guesser',
  wordsFound: 3,
  wrongPicks: 1,
  trapHit: false,
  cluesGiven: 0,
  avgClueNumber: null,
  penalties: 0,
  ...o,
});

const rows: BoardRow[] = [
  row('g1', 'a', 'sun', true, { role: 'clue-giver', cluesGiven: 4, avgClueNumber: 2 }),
  row('g1', 'b', 'sun', true),
  row('g1', 'c', 'moon', false, { trapHit: true }),
  row('g2', 'a', 'moon', false, {
    role: 'clue-giver',
    cluesGiven: 3,
    avgClueNumber: 3,
    penalties: 1,
  }),
  row('g2', 'b', 'sun', true, { wordsFound: 8 }),
  row('g2', 'c', 'sun', true),
  row('g3', 'a', 'sun', true),
  row('g3', 'c', 'moon', false),
];

describe('Ishaara boards', () => {
  it('tallies games, wins, picks and clue-giving', () => {
    const a = tallies(rows).find((t) => t.playerId === 'a')!;
    expect(a).toMatchObject({
      games: 3,
      wins: 2,
      clueGames: 2,
      clueWins: 1,
      cluesGiven: 7,
      avgClueNumber: 2.5,
      penalties: 1,
    });
    expect(tallies(rows).find((t) => t.playerId === 'c')!.trapHits).toBe(1);
  });

  it('ranks by wins, sharing ranks on ties', () => {
    expect(leaderboard(rows, 'wins').map((r) => [r.playerId, r.rank])).toEqual([
      ['a', 1],
      ['b', 1],
      ['c', 3],
    ]);
  });

  it('ranks win % only from 3 games', () => {
    expect(leaderboard(rows, 'rate').map((r) => [r.playerId, r.rank])).toEqual([
      ['a', 1],
      ['c', 2],
      ['b', null],
    ]);
  });

  it('head-to-head splits teammates from opponents', () => {
    expect(headToHead(rows, 'a', 'b')).toEqual({
      games: 2,
      together: 1,
      togetherWins: 1,
      against: 1,
      aWins: 0,
      bWins: 1,
    });
  });
});
