import { aheadOf, podiumSplit } from './boardPodium';

const rows = (...ranks: (number | null)[]) => ranks.map((rank, i) => ({ id: 'p' + i, rank }));
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe('who stands on a board’s podium', () => {
  it('takes the top three places and leaves the rest in order', () => {
    const { stand, rest } = podiumSplit(rows(1, 2, 3, 4, null));
    expect(ids(stand)).toEqual(['p0', 'p1', 'p2']);
    expect(ids(rest)).toEqual(['p3', 'p4']);
  });

  it('stands tied players together: 1, 1, 3 has nobody in second', () => {
    expect(ids(podiumSplit(rows(1, 1, 3, 3, 5)).stand)).toEqual(['p0', 'p1', 'p2', 'p3']);
  });

  it('works with two players, and with two who share first', () => {
    expect(podiumSplit(rows(1, 2)).stand).toHaveLength(2);
    expect(podiumSplit(rows(1, 1)).stand).toHaveLength(2);
  });

  it('keeps a crowded place, and every place below it, in the list', () => {
    const { stand, rest } = podiumSplit(rows(1, 2, 3, 3, 3, 3, 7));
    expect(ids(stand)).toEqual(['p0', 'p1']);
    expect(rest).toHaveLength(5);
  });

  it('has no podium for a lone ranked player, a crowd sharing first, or nobody ranked', () => {
    expect(podiumSplit(rows(1, null, null)).stand).toEqual([]);
    expect(podiumSplit(rows(1, 1, 1, 1, 5)).stand).toEqual([]);
    expect(podiumSplit(rows(1, 2, 2, 2, 2)).stand).toEqual([]);
    expect(podiumSplit(rows(null, null)).stand).toEqual([]);
    expect(podiumSplit(rows(1, 1, 1, 1, 5)).rest).toHaveLength(5);
  });
});

describe('who a player chases', () => {
  it('is the nearest player on a better rank, skipping those tied with them', () => {
    const b = rows(1, 2, 2, 4, null);
    expect(aheadOf(b, 0)).toBeNull();
    expect(aheadOf(b, 2)?.id).toBe('p0');
    expect(aheadOf(b, 3)?.id).toBe('p2');
    expect(aheadOf(b, 4)).toBeNull();
  });
});
