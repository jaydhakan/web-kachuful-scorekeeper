import { confettiCount, MAX_STEP_MS, stepConfetti, type ConfettiPiece } from './confettiCount';

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

describe('stepConfetti', () => {
  const piece = (): ConfettiPiece => ({
    x: 10,
    y: 20,
    vx: 6,
    vy: -12,
    a: 1,
    va: 0.2,
    ph: 0,
    vph: 0.2,
  });
  const after = (frames: number, ms: number) => {
    const q = piece();
    for (let k = 0; k < frames; k++) stepConfetti(q, ms / frames);
    return q;
  };

  it('flies the same second at 60 and at 120 frames', () => {
    const slow = after(60, 1000),
      fast = after(120, 1000);
    for (const k of ['x', 'y', 'vx', 'vy', 'a', 'ph'] as const)
      expect(fast[k]).toBeCloseTo(slow[k], 6);
    expect(slow.y).not.toBeCloseTo(20, 0);
  });

  it('drifts down instead of dropping: the fall settles at a steady speed', () => {
    const q = after(600, 10000);
    expect(q.vy).toBeGreaterThan(9);
    expect(q.vy).toBeLessThanOrEqual(10.01);
  });

  it('counts a long gap (a background tab) as one short step', () => {
    const a = piece(),
      b = piece();
    stepConfetti(a, 5000);
    stepConfetti(b, MAX_STEP_MS);
    expect(a).toEqual(b);
  });
});
