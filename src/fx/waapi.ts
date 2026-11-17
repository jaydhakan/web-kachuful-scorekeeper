import { BEAT_HOLD_MS } from '@/components/ui/motion';

/**
 * Choreography on Web Animations for every game: transform and opacity, measured once at the moment they start.
 * Every animation resolves (never rejects), is skipped where the browser has no `animate`, and under reduced motion
 * keeps only its opacity, still (`reducedFrames`). The easings are CSS-string twins of `components/ui/motion.ts`.
 */
export const EASE = 'cubic-bezier(.32,.72,0,1)';
/** Entrances: start fast, settle. */
export const OUT = 'cubic-bezier(.22,1,.36,1)';
/** A little overshoot, only where something lands with momentum: a played card, a popping bid, a burst. */
export const POP = 'cubic-bezier(.34,1.56,.64,1)';
/** Something crossing the table: a spotlight, a stack of tricks. */
export const TRAVEL = 'cubic-bezier(.65,0,.35,1)';
export const REDUCED_MS = 160;

let forced: boolean | null = null;
/** The moments lab's reduced-motion switch; null follows the system again. */
export const forceReducedMotion = (v: boolean | null) => {
  forced = v;
};
let rate = 1;
/** The moments lab's speed (0.25 to watch a moment slowly); 1 everywhere else. */
export const setTimeScale = (r: number) => {
  rate = r;
};
export const timeScale = () => rate;

export const reducedMotion = () =>
  forced ??
  (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

export interface AnimOpts {
  duration?: number;
  delay?: number;
  easing?: string;
  fill?: FillMode;
  /** Times it plays (reduced motion plays its still version once). */
  iterations?: number;
}

const opacityOf = (f: Keyframe | undefined) => Number(f?.opacity ?? 1);

/**
 * Under reduced motion: an opacity change plays as a brief cross-fade; an in-and-out fade (a banner, a "−100") shows
 * still, in its held pose, for its length (at least BEAT_HOLD_MS), then hides; anything else plays nothing.
 */
function reducedFrames(
  frames: Keyframe[],
  o: AnimOpts,
): [Keyframe[], KeyframeAnimationOptions] | null {
  const from = opacityOf(frames[0]),
    to = opacityOf(frames[frames.length - 1]);
  if (from !== to)
    return [[{ opacity: from }, { opacity: to }], { duration: REDUCED_MS, fill: o.fill }];
  const held = frames.reduce<Keyframe | null>(
    (best, f) => (f.opacity != null && opacityOf(f) > (best ? opacityOf(best) : from) ? f : best),
    null,
  );
  if (!held) return null;
  const peak = opacityOf(held),
    pose = held.transform != null ? { transform: held.transform } : {},
    total = Math.max(o.duration ?? 300, BEAT_HOLD_MS),
    k = REDUCED_MS / total;
  return [
    [
      { ...pose, opacity: from },
      { ...pose, opacity: peak, offset: k },
      { ...pose, opacity: peak, offset: 1 - k },
      { ...pose, opacity: to },
    ],
    { duration: total, delay: o.delay ?? 0, easing: 'linear', fill: o.fill },
  ];
}

/** Runs keyframes on `el`; under reduced motion only the opacity (if any) plays, still (`reducedFrames`). */
export function anim(
  el: Element | null | undefined,
  frames: Keyframe[],
  o: AnimOpts = {},
): { done: Promise<void>; cancel: () => void } {
  const none = { done: Promise.resolve(), cancel: () => undefined };
  if (!el || typeof (el as HTMLElement).animate !== 'function') return none;
  let a: Animation;
  if (reducedMotion()) {
    const r = reducedFrames(frames, o);
    if (!r) return none;
    a = (el as HTMLElement).animate(...r);
  } else {
    a = (el as HTMLElement).animate(frames, {
      duration: o.duration ?? 300,
      delay: o.delay ?? 0,
      easing: o.easing ?? EASE,
      fill: o.fill ?? 'none',
      iterations: o.iterations ?? 1,
    });
  }
  a.playbackRate = rate;
  return {
    done: a.finished.then(
      () => undefined,
      () => undefined,
    ),
    cancel: () => a.cancel(),
  };
}

/** A promise that waits. */
export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms / rate));
