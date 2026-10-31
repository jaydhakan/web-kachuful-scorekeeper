import { TD, angOf, chipSide, minScale, posAt, seatPos, showNames, toPct } from './tableGeometry';

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
    '%s table keeps every seat inside its box for 3–10 players',
    (size) => {
      for (let n = 3; n <= 10; n++)
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

  it.each(['full', 'mini'] as const)('%s table: ten avatars never overlap', (size) => {
    const pts = Array.from({ length: 10 }, (_, k) => seatPos(size, 10, k, 'cw'));
    for (let i = 0; i < 10; i++)
      for (let j = i + 1; j < 10; j++)
        expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)).toBeGreaterThan(
          TD[size].R * 2 + 8,
        );
  });

  it.each(['full', 'mini'] as const)(
    '%s table: eight or more seats are spaced evenly along the edge',
    (size) => {
      const pts = Array.from({ length: 9 }, (_, k) => seatPos(size, 9, k, 'cw'));
      const gaps = pts.map((p, i) =>
        Math.hypot(p.x - pts[(i + 1) % 9].x, p.y - pts[(i + 1) % 9].y),
      );
      expect(Math.max(...gaps) / Math.min(...gaps)).toBeLessThan(1.25);
    },
  );

  it('keeps the seat angles of up to seven players evenly spread by angle', () => {
    expect(angOf(7, 3, 'cw')).toBeCloseTo(90 + (3 * 360) / 7);
    expect(angOf(7, 3, 'ccw')).toBeCloseTo(90 - (3 * 360) / 7);
  });

  it('starts at the bottom and mirrors for anticlockwise at ten seats too', () => {
    expect(angOf(10, 0, 'cw')).toBe(90);
    expect(seatPos('mini', 10, 1, 'cw').x).toBeCloseTo(TD.mini.W - seatPos('mini', 10, 1, 'ccw').x);
  });

  it('names players only up to seven seats', () => {
    expect(showNames(7)).toBe(true);
    expect(showNames(8)).toBe(false);
  });

  it("puts a crowded middle seat's dealer chip away from the next seat, and leaves the rest alone", () => {
    expect(chipSide({ x: 50, y: 90 }, 'cw', 10)).toBe(true);
    expect(chipSide({ x: 50, y: 90 }, 'ccw', 10)).toBe(false);
    expect(chipSide({ x: 50, y: 10 }, 'cw', 10)).toBe(false);
    expect(chipSide({ x: 50, y: 90 }, 'cw', 7)).toBe(false);
    expect(chipSide({ x: 80, y: 50 }, 'cw', 10)).toBe(true);
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

  it('lets seven players shrink the table less than fewer do', () => {
    expect(minScale(7)).toBeGreaterThan(minScale(6));
    expect(minScale(3)).toBe(minScale(6));
  });
});
