import { legendOf, plusPoints, sitaraOf } from './stars';

describe('Aaj ka Sitara', () => {
  const pts = new Map([
    ['a', 40],
    ['b', 60],
    ['c', -10],
  ]);

  it("is tonight's points leader from the second game on", () => {
    expect(sitaraOf(pts, 1)).toEqual([]);
    expect(sitaraOf(pts, 2)).toEqual(['b']);
  });

  it('is shared on a tie, and nobody when nobody is above zero', () => {
    expect(
      sitaraOf(
        new Map([
          ['a', 50],
          ['b', 50],
        ]),
        3,
      ),
    ).toEqual(['a', 'b']);
    expect(
      sitaraOf(
        new Map([
          ['a', 0],
          ['b', -20],
        ]),
        3,
      ),
    ).toEqual([]);
  });

  it("adds this game's points to the night", () => {
    const now = plusPoints(
      pts,
      new Map([
        ['a', { points: 30 }],
        ['d', { points: 10 }],
      ]),
    );
    expect(sitaraOf(now, 2)).toEqual(['a']);
    expect(now.get('d')).toBe(10);
  });
});

describe('the Legend', () => {
  it('is the most season titles, at least two, ties shared', () => {
    expect(legendOf(['a', 'b', 'a', null, 'c'])).toEqual(['a']);
    expect(legendOf(['a', 'b', 'c'])).toEqual([]);
    expect(legendOf(['a', 'b', 'a', 'b'])).toEqual(['a', 'b']);
    expect(legendOf([])).toEqual([]);
  });
});
