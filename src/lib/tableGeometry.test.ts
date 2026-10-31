import { TD, angOf, posAt, seatPos, toPct } from './tableGeometry';

describe('table geometry', () => {
  it('seats the first player bottom-centre', () => {
    const p = seatPos('full', 5, 0, 'cw');
    expect(p.x).toBeCloseTo(TD.full.W / 2);
    expect(p.y).toBeCloseTo(TD.full.cy + TD.full.ry);
  });

  it('runs clockwise bottom → left, anticlockwise bottom → right', () => {
    expect(seatPos('full', 4, 1, 'cw').x).toBeLessThan(TD.full.W / 2);
    expect(seatPos('full', 4, 1, 'ccw').x).toBeGreaterThan(TD.full.W / 2);
    expect(angOf(4, 1, 'cw')).toBe(180);
    expect(angOf(4, 1, 'ccw')).toBe(0);
  });

  it.each(['full', 'mini'] as const)(
    '%s table keeps every seat inside its box for 3–7 players',
    (size) => {
      for (let n = 3; n <= 7; n++)
        for (let k = 0; k < n; k++) {
          const { x, y } = posAt(size, angOf(n, k, 'cw'));
          expect(x - 36).toBeGreaterThanOrEqual(-4);
          expect(x + 36).toBeLessThanOrEqual(TD[size].W + 4);
          expect(y).toBeGreaterThan(0);
          expect(y).toBeLessThan(TD[size].H);
        }
    },
  );

  it.each(['full', 'mini'] as const)('%s table: seven avatars never overlap', (size) => {
    const pts = Array.from({ length: 7 }, (_, k) => seatPos(size, 7, k, 'cw'));
    for (let i = 0; i < 7; i++)
      for (let j = i + 1; j < 7; j++)
        expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)).toBeGreaterThan(
          TD[size].R * 2,
        );
  });

  it.each(['full', 'mini'] as const)(
    '%s table: percent positions map back to design pixels',
    (size) => {
      for (let k = 0; k < 7; k++) {
        const p = seatPos(size, 7, k, 'cw'),
          pct = toPct(size, p);
        expect((pct.x * TD[size].W) / 100).toBeCloseTo(p.x);
        expect((pct.y * TD[size].H) / 100).toBeCloseTo(p.y);
        expect(pct.x).toBeGreaterThan(0);
        expect(pct.x).toBeLessThan(100);
      }
    },
  );
});
