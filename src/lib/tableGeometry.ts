import type { Direction } from '@/domain';

export type TableSize = 'full' | 'mini';

export const TD = {
  full: { W: 340, H: 300, cy: 150, R: 22, rx: 134, ry: 104 },
  mini: { W: 320, H: 170, cy: 82, R: 16, rx: 128, ry: 56 },
} as const;

/** Superellipse (exponent 3/2) point at `ang` degrees around the table. */
export function posAt(sz: TableSize, ang: number): { x: number; y: number } {
  const d = TD[sz],
    a = (ang * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  return {
    x: d.W / 2 + d.rx * Math.sign(c) * Math.pow(Math.abs(c), 2 / 3),
    y: d.cy + d.ry * Math.sign(s) * Math.pow(Math.abs(s), 2 / 3),
  };
}

export const angOf = (n: number, k: number, dir: Direction): number =>
  90 + ((dir === 'cw' ? 1 : -1) * (k * 360)) / n;
export const seatPos = (sz: TableSize, n: number, k: number, dir: Direction) =>
  posAt(sz, angOf(n, k, dir));
