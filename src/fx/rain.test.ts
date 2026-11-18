import { rainOf, type Reaction } from './rain';

const run = (rs: Reaction[]) => {
  let recent: Reaction[] = [];
  const rains: string[] = [];
  for (const r of rs) {
    const o = rainOf(recent, r);
    recent = o.recent;
    if (o.rain) rains.push(o.rain);
  }
  return rains;
};

describe('emoji rain', () => {
  it('rains when three different players send the same reaction within two seconds', () => {
    expect(
      run([
        { seat: 0, emoji: '🔥', at: 0 },
        { seat: 1, emoji: '🔥', at: 900 },
        { seat: 2, emoji: '🔥', at: 1900 },
      ]),
    ).toEqual(['🔥']);
  });

  it('needs different players, the same emoji, and the window', () => {
    expect(
      run([
        { seat: 0, emoji: '🔥', at: 0 },
        { seat: 0, emoji: '🔥', at: 100 },
        { seat: 1, emoji: '🔥', at: 200 },
      ]),
    ).toEqual([]);
    expect(
      run([
        { seat: 0, emoji: '🔥', at: 0 },
        { seat: 1, emoji: '😂', at: 100 },
        { seat: 2, emoji: '🔥', at: 200 },
      ]),
    ).toEqual([]);
    expect(
      run([
        { seat: 0, emoji: '🔥', at: 0 },
        { seat: 1, emoji: '🔥', at: 1000 },
        { seat: 2, emoji: '🔥', at: 2100 },
      ]),
    ).toEqual([]);
  });

  it('rains once per burst: a fourth sender does not rain again', () => {
    expect(
      run([
        { seat: 0, emoji: '🔥', at: 0 },
        { seat: 1, emoji: '🔥', at: 100 },
        { seat: 2, emoji: '🔥', at: 200 },
        { seat: 3, emoji: '🔥', at: 300 },
      ]),
    ).toEqual(['🔥']);
  });
});
