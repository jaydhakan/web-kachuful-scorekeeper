import { festivalOn } from './festival';

const at = (d: string) => Date.parse(`${d}T12:00:00+05:30`);
const TZ = 'Asia/Kolkata';

describe('festival days', () => {
  it('knows the fixed days every year and the lunar ones by year', () => {
    expect(festivalOn(at('2026-12-25'), TZ)).toBe('christmas');
    expect(festivalOn(at('2031-01-14'), TZ)).toBe('uttarayan');
    expect(festivalOn(at('2027-01-01'), TZ)).toBe('newyear');
    expect(festivalOn(at('2027-10-29'), TZ)).toBe('diwali');
    expect(festivalOn(at('2027-03-22'), TZ)).toBe('holi');
    expect(festivalOn(at('2027-03-10'), TZ)).toBe('eid');
  });

  it('is nothing on an ordinary day', () => {
    expect(festivalOn(at('2026-11-20'), TZ)).toBeNull();
  });
});
