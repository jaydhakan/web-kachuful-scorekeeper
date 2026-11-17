/**
 * Choreography on Web Animations for every game: transform and opacity, measured once at the moment they start.
 * Every animation resolves (never rejects), is skipped where the browser has no `animate`, and under reduced motion
 * becomes a short cross-fade (or nothing, when opacity doesn't change). CSS-string twins of `components/ui/motion.ts`.
 */
export const EASE = 'cubic-bezier(.32,.72,0,1)';
/** Entrances: start fast, settle. */
export const OUT = 'cubic-bezier(.22,1,.36,1)';
/** A little overshoot, only where something lands with momentum: a played card, a popping bid, a burst. */
export const POP = 'cubic-bezier(.34,1.56,.64,1)';
export const REDUCED_MS = 160;

export const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

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
