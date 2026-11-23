import { chase, seasonMetric } from './awards';

const row = (playerId: string, rank: number | null, value: number, rounds = 60) => ({
  playerId,
  rank,
  qualified: rank != null,
  value,
  rounds,
});

const table = [
  row('a', 1, 9.4),
  row('b', 2, 8.1),
  row('c', 3, 7.5),
  row('d', 3, 7.5),
  row('e', 5, 6.9),
  row('f', null, 12, 32),
];

describe('the chase line', () => {
  it('says how far ahead the leader is', () => {
    expect(chase(table, 'a')).toEqual({ kind: 'top', ahead: expect.closeTo(1.3) });
  });

  it('measures the gap to the nearest rank above, skipping past a tie', () => {
    expect(chase(table, 'b')).toEqual({
      kind: 'behind',
      rank: 2,
      target: 1,
      gap: expect.closeTo(1.3),
    });
    expect(chase(table, 'e')).toEqual({
      kind: 'behind',
      rank: 5,
      target: 3,
      gap: expect.closeTo(0.6),
    });
  });

  it('says when accuracy is level and the rank came from the average', () => {
    const level = [row('a', 1, 0.8), row('b', 2, 0.8), row('c', 3, 0.7)];
    expect(chase(level, 'a')).toEqual({ kind: 'top', ahead: 0, level: true });
    expect(chase(level, 'b')).toEqual({ kind: 'behind', rank: 2, target: 1, gap: 0, level: true });
    expect(chase(level, 'c')).toEqual({
      kind: 'behind',
      rank: 3,
      target: 2,
      gap: expect.closeTo(0.1),
    });
    expect(chase(level, 'c')).not.toHaveProperty('level');
  });

  it('calls a shared rank a tie', () => {
    expect(chase(table, 'c')).toEqual({ kind: 'tied', rank: 3 });
  });

  it('counts the rounds still needed to be ranked, and knows who is not playing', () => {
    expect(chase(table, 'f')).toEqual({ kind: 'unranked', need: 19 });
    expect(chase(table, 'z')).toEqual({ kind: 'absent' });
  });

  it('leads alone with nobody else ranked', () => {
    expect(chase([row('a', 1, 5)], 'a')).toEqual({ kind: 'top', ahead: 0 });
  });
});

describe("a season's metric", () => {
  it('is bid accuracy, unless the season was closed on average per round', () => {
    expect(seasonMetric([{ value: 0.8, accuracy: 0.8 }])).toBe('accuracy');
    expect(seasonMetric([])).toBe('accuracy');
    expect(seasonMetric([{ value: 12.5, accuracy: 0.8 }])).toBe('avgPerRound');
  });
});
