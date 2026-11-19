/**
 * The hand's fan (plan §10): a card width that always fits 13 across, a step that never overlaps more than it must,
 * a gentle arc and tilt. Pure, so the maths is tested without a browser.
 */
export const CARD_MIN = 46;
export const CARD_MAX = 72;
/** One card plus twelve 38% strips: 13 cards fit in `1 + 12 × 0.38` card widths. */
export const FIT = 1 + 12 * 0.38;
/** The ratio of a card's height to its width. */
export const CARD_RATIO = 1.4;
/** How far a lifted card rises. */
export const LIFT = 24;
/** How far a playable card stands above the unplayable ones when some can't be played. */
export const NUDGE = 8;

export interface FanSlot {
  /** Left edge of the card, from the container's left. */
  x: number;
  /** Top of the card in the arc. */
  y: number;
  /** Tilt in degrees. */
  r: number;
}

export interface Fan {
  cw: number;
  slots: FanSlot[];
}

/** The card width for a container `width` px wide; `maxCw` lets a short landscape screen ask for smaller cards. */
export function cardWidth(width: number, maxCw = CARD_MAX): number {
  return Math.max(CARD_MIN, Math.min(CARD_MAX, maxCw, (width - 20) / FIT));
}

export function fanLayout(n: number, width: number, maxCw = CARD_MAX): Fan {
  const cw = cardWidth(width, maxCw);
  const half = (n - 1) / 2;
  const tilt = Math.min(2.6, 30 / Math.max(n, 1));
  // An end card turns about its centre, so its outer corner swings past its box: keep that inside the screen too.
  const rad = (half * tilt * Math.PI) / 180;
  const swing = ((cw * CARD_RATIO) / 2) * Math.sin(rad) - (cw / 2) * (1 - Math.cos(rad));
  const room = width - 2 * Math.max(10, Math.ceil(swing) + 4);
  const step = n > 1 ? Math.min(cw * 0.66, (room - cw) / (n - 1)) : 0;
  const slots = Array.from({ length: n }, (_, i) => {
    const d = i - half;
    return {
      x: width / 2 + d * step - cw / 2,
      y: 22 + Math.pow(d / Math.max(half, 1), 2) * 14,
      r: d * tilt,
    };
  });
  return { cw, slots };
}

/** The part of each card not covered by the next one: its tap target. */
export function strip(f: Fan, i: number): number {
  const next = f.slots[i + 1];
  return next ? next.x - f.slots[i].x : f.cw;
}

/** Rank sizes (px) the hand's index can take; each is a step on the type scale. */
export const INDEX_SIZES = [17, 19, 20, 22] as const;
export type IndexSize = (typeof INDEX_SIZES)[number];
/** A bold two-character rank ("10") is about one font size wide; the index sits 3% of the card in from its edge. */
const indexWidth = (px: number, cw: number) => px + cw * 0.03 + 1;

/** The largest rank size whose "10" still fits in a card's visible strip, so the index is never half-covered. */
export function indexSize(cw: number, visible: number): IndexSize {
  let best: IndexSize = INDEX_SIZES[0];
  for (const px of INDEX_SIZES) if (indexWidth(px, cw) <= visible) best = px;
  return best;
}
