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

/** A design-space point as percentages of the table box, so seats follow the box as it is resized. */
export const toPct = (sz: TableSize, p: { x: number; y: number }) => ({
  x: (p.x / TD[sz].W) * 100,
  y: (p.y / TD[sz].H) * 100,
});

/** `v` design pixels at the table's current size (--s is set by .table-box, never more than 1.5×). */
export const dpx = (v: number) => `calc(${v} * var(--s))`;

/** The "deals" pill. The seat's chip and the spin token share it, so the token settles exactly on the chip. */
export const DEALS_PILL = { width: `max(66px, ${dpx(66)})`, height: `max(20px, ${dpx(20)})` };

/** How far a fitted table may shrink; seven seats need more room for their 13px labels than fewer do. */
export const minScale = (players: number) => (players >= 7 ? 0.8 : 0.72);
