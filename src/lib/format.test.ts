import { agoTxt, fmt, sgnN, trunc } from './format';

describe('format', () => {
  it('signs points with a real minus sign', () => {
    expect([sgnN(30), sgnN(-20), sgnN(0)]).toEqual(['+30', '−20', '0']);
    expect([fmt(-5), fmt(0), fmt(12)]).toEqual(['−5', '0', '12']);
  });

  it('truncates names to 8 characters', () => {
    expect(trunc('Aarav')).toBe('Aarav');
    expect(trunc('Abcdefgh')).toBe('Abcdefgh');
    expect(trunc('Abcdefghi')).toBe('Abcdefg…');
  });

  it('describes elapsed time', () => {
    const now = 1_000_000_000_000;
    expect(agoTxt(now, now)).toBe('1 min ago');
    expect(agoTxt(now - 12 * 60e3, now)).toBe('12 min ago');
    expect(agoTxt(now - 3 * 3600e3, now)).toBe('3 hr ago');
    expect(agoTxt(now - 2 * 86400e3, now)).toBe('2 d ago');
  });
});
