import type { Direction } from '@/domain';

export type TableSize = 'full' | 'mini' | 'wide';

export const TD = {
  full: { W: 340, H: 300, cy: 150, R: 22, rx: 134, ry: 104 },
  mini: { W: 320, H: 170, cy: 82, R: 16, rx: 128, ry: 56 },
  /** The large-screen table: a wider oval with bigger seats (design board Table, 560×380). */
  wide: { W: 560, H: 380, cy: 190, R: 34, rx: 224, ry: 130 },
} as const;

/** Up to this many seats a table names each player; beyond it there is no room under an avatar, so only avatars show. */
export const MAX_LABELLED = 7;
export const showNames = (players: number): boolean => players <= MAX_LABELLED;

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

/** From this many seats, seats are spaced evenly along the table's edge: by angle they crowd the ends of a flat table. */
const EVEN_FROM = 8;

const offsets = new Map<string, number[]>();
/** Degrees clockwise from the first seat to each seat, for seats spaced evenly by distance along the edge. */
function edgeOffsets(sz: TableSize, n: number): number[] {
  const key = `${sz}${n}`,
    hit = offsets.get(key);
  if (hit) return hit;
  const STEPS = 1440,
    len = [0];
  let prev = posAt(sz, 90);
  for (let i = 1; i <= STEPS; i++) {
    const p = posAt(sz, 90 + (i * 360) / STEPS);
    len.push(len[i - 1] + Math.hypot(p.x - prev.x, p.y - prev.y));
    prev = p;
  }
  const out = Array.from({ length: n }, (_, k) => {
    const want = (k * len[STEPS]) / n;
    let i = 1;
    while (i < STEPS && len[i] < want) i++;
    const span = len[i] - len[i - 1] || 1;
    return ((i - 1 + (want - len[i - 1]) / span) * 360) / STEPS;
  });
  offsets.set(key, out);
  return out;
}

export const angOf = (n: number, k: number, dir: Direction, sz: TableSize = 'full'): number =>
  90 + (dir === 'cw' ? 1 : -1) * (n >= EVEN_FROM ? edgeOffsets(sz, n)[k] : (k * 360) / n);
export const seatPos = (sz: TableSize, n: number, k: number, dir: Direction) =>
  posAt(sz, angOf(n, k, dir, sz));

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

/** The setup preview shows seat numbers only, no names, so it may shrink further to leave room for the controls. */
export const PREVIEW_SCALE = 0.45;

/** The wide "deals" pill needs room above the avatar; seven seats are too close for it, so they use the small chip. */
export const pillChip = (size: TableSize, players: number) => size !== 'mini' && players < 7;

/** The small round chip on an avatar's upper-left corner, the same on the flat table and on crowded ones. */
export const SMALL_CHIP = {
  width: `max(1.125rem, ${dpx(22)})`,
  height: `max(1.125rem, ${dpx(22)})`,
};

/** Seats right of the middle put their small chip on the right corner, the rest on the left. */
export const chipOnRight = (xPct: number) => xPct > 52;

/**
 * Which corner a seat's dealer chip takes. A seat in the middle of the table would put it towards the next seat,
 * whose "1st" tag is there; a crowded table puts it on the far side instead.
 */
export const chipSide = (at: { x: number; y: number }, dir: Direction, players: number): boolean =>
  players > MAX_LABELLED && Math.abs(at.x - 50) < 2
    ? at.y > 50 === (dir === 'cw')
    : chipOnRight(at.x);

/** Where the small chip sits on an avatar's upper corner, as an offset from the avatar's centre (design pixels). */
export const smallChipOffset = (radius: number, right: boolean) => ({
  x: (right ? 1 : -1) * radius * 0.707 - 11,
  y: -radius * 0.707 - 11,
});
