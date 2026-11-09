import { chase } from './awards';

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
