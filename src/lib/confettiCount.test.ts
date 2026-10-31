import { confettiCount } from './confettiCount';

describe('confettiCount', () => {
  it('keeps a phone at the minimum and a big window at the maximum', () => {
    expect(confettiCount(390, 844)).toBe(150);
    expect(confettiCount(320, 568)).toBe(150);
    expect(confettiCount(1920, 1080)).toBe(300);
    expect(confettiCount(2560, 1440)).toBe(300);
  });

  it('grows with the area in between', () => {
    expect(confettiCount(1024, 768)).toBeGreaterThan(confettiCount(768, 1024) - 1);
    expect(confettiCount(1280, 800)).toBeGreaterThan(confettiCount(768, 1024));
    expect(confettiCount(1280, 800)).toBeLessThan(300);
  });
});
