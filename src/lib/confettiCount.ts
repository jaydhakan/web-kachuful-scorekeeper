/** Particles grow with the screen so a big window is not sparse and a phone is not crowded: 150 up to 300. */
export const confettiCount = (width: number, height: number): number =>
  Math.round(Math.min(300, Math.max(150, (width * height) / 4400)));

export interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Turn in the plane, and the flutter's phase (the piece seen edge-on and face-on in turn). */
  a: number;
  va: number;
  ph: number;
  vph: number;
}

/** Per 60fps frame: gravity, and the air's drag across and down (the fall settles near G / DRAG_Y px a frame). */
const G = 0.35;
const DRAG_X = 0.01;
const DRAG_Y = 0.035;
/** One 60fps frame, in ms; a longer gap than MAX_STEP_MS (a background tab) counts as that much. */
export const FRAME_MS = 1000 / 60;
export const MAX_STEP_MS = 50;

/**
 * Moves a piece on by `ms` of elapsed time. Solved exactly for linear drag rather than added up per frame, so a 60Hz
 * and a 120Hz screen draw the same flight.
 */
export function stepConfetti(q: ConfettiPiece, ms: number): void {
  const f = Math.min(ms, MAX_STEP_MS) / FRAME_MS,
    ex = Math.exp(-DRAG_X * f),
    ey = Math.exp(-DRAG_Y * f),
    fall = G / DRAG_Y;
  q.x += (q.vx * (1 - ex)) / DRAG_X;
  q.vx *= ex;
  q.y += fall * f + ((q.vy - fall) * (1 - ey)) / DRAG_Y;
  q.vy = fall + (q.vy - fall) * ey;
  q.a += q.va * f;
  q.ph += q.vph * f;
}
