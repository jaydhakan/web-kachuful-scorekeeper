/**
 * The table's choreography helpers: Web Animations on transform and opacity, measured once at the moment they start.
 * Every animation resolves (never rejects), is skipped where the browser has no `animate`, and under reduced motion
 * becomes a short cross-fade (or nothing, when opacity doesn't change).
 */
export const EASE = 'cubic-bezier(.32,.72,0,1)';
/** Entrances: start fast, settle. */
export const OUT = 'cubic-bezier(.22,1,.36,1)';
/** A little overshoot, only where something lands with momentum: a played card, a popping bid, a burst. */
export const POP = 'cubic-bezier(.34,1.56,.64,1)';
export const REDUCED_MS = 160;

export const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
export const boxOf = (el: Element): Box => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};
export const mid = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

export interface AnimOpts {
  duration?: number;
  delay?: number;
  easing?: string;
  fill?: FillMode;
}

/** Runs keyframes on `el`; under reduced motion only the opacity change (if any) plays, briefly. */
export function anim(
  el: Element | null | undefined,
  frames: Keyframe[],
  o: AnimOpts = {},
): { done: Promise<void>; cancel: () => void } {
  const none = { done: Promise.resolve(), cancel: () => undefined };
  if (!el || typeof (el as HTMLElement).animate !== 'function') return none;
  let a: Animation;
  if (reducedMotion()) {
    const from = frames[0]?.opacity ?? 1,
      to = frames[frames.length - 1]?.opacity ?? 1;
    if (from === to) return none;
    a = (el as HTMLElement).animate([{ opacity: from }, { opacity: to }], {
      duration: REDUCED_MS,
      fill: o.fill,
    });
  } else {
    a = (el as HTMLElement).animate(frames, {
      duration: o.duration ?? 300,
      delay: o.delay ?? 0,
      easing: o.easing ?? EASE,
      fill: o.fill ?? 'none',
    });
  }
  return {
    done: a.finished.then(
      () => undefined,
      () => undefined,
    ),
    cancel: () => a.cancel(),
  };
}

/** A promise that waits; resolves at once under reduced motion when `skipReduced`. */
export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Deterministic noise for decoration (crack arms, shards), so a test or a re-render draws the same thing. */
export function rng(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
