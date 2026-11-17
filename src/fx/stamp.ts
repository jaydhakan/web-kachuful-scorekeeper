import { STAMP_MS } from '@/components/ui/motion';
import { OUT, POP, REDUCED_MS, reducedMotion } from './waapi';

/** A running effect: `done` always resolves (finished, cancelled or skipped). */
export interface Played {
  done: Promise<void>;
  cancel: () => void;
}
const NONE: Played = { done: Promise.resolve(), cancel: () => undefined };
const SETTLE_MS = 140;

const run = (el: Element, frames: Keyframe[], o: KeyframeAnimationOptions): Played => {
  if (typeof (el as HTMLElement).animate !== 'function') return NONE;
  const a = (el as HTMLElement).animate(frames, o);
  return { done: a.finished.then(noop, noop), cancel: () => a.cancel() };
};
const noop = () => undefined;

export interface StampOpts {
  /** Where it comes to rest, in degrees. */
  angle?: number;
  /** A positioning transform kept underneath (`translate(-50%,-50%)`). */
  base?: string;
  delay?: number;
}

/**
 * A verdict lands (SET, BOSTON, SOLD, TRAPPED, 1000; WOW-MOMENTS-PLAN §2): scale 1.6 → 1 while turning to its angle,
 * STAMP_MS with POP, then a 3px settle. It stays on screen (fill both). Reduced motion: it fades in where it rests.
 */
export function stamp(el: Element | null | undefined, o: StampOpts = {}): Played {
  if (!el) return NONE;
  const { angle = -8, base = '', delay = 0 } = o;
  const pose = (deg: number, s: number, y: number) =>
    `${base} rotate(${deg}deg) scale(${s}) translateY(${y}px)`.trim();
  if (reducedMotion())
    return run(
      el,
      [
        { transform: pose(angle, 1, 0), opacity: 0 },
        { transform: pose(angle, 1, 0), opacity: 1 },
      ],
      { duration: REDUCED_MS, delay, fill: 'both' },
    );
  const total = STAMP_MS + SETTLE_MS,
    k = STAMP_MS / total;
  return run(
    el,
    [
      { transform: pose(angle - 6, 1.6, 0), opacity: 0, easing: POP },
      { transform: pose(angle, 1, 0), opacity: 1, offset: k, easing: OUT },
      { transform: pose(angle, 1, 3), opacity: 1, offset: k + (1 - k) / 2, easing: OUT },
      { transform: pose(angle, 1, 0), opacity: 1 },
    ],
    { duration: total, delay, easing: 'linear', fill: 'both' },
  );
}

export interface SheenOpts {
  duration?: number;
  delay?: number;
}

/**
 * One gold light crosses `host` once (winners get one sheen, never a loop): a layer added on top, clipped to the
 * host's corners, removed when it ends. The host must be positioned. Reduced motion: none (it is decoration).
 */
export function sheen(host: HTMLElement | null | undefined, o: SheenOpts = {}): Played {
  if (!host || reducedMotion() || typeof host.animate !== 'function') return NONE;
  const clip = document.createElement('span');
  clip.setAttribute('aria-hidden', 'true');
  clip.style.cssText =
    'position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none';
  const light = document.createElement('span');
  light.style.cssText =
    'position:absolute;inset:-10%;transform:translateX(-110%);background:linear-gradient(105deg,transparent 38%,color-mix(in srgb,var(--medal-gold-hi) 70%,transparent) 50%,transparent 62%)';
  clip.append(light);
  host.append(clip);
  const p = run(light, [{ transform: 'translateX(-110%)' }, { transform: 'translateX(110%)' }], {
    duration: o.duration ?? 800,
    delay: o.delay ?? 0,
    easing: 'linear',
    fill: 'both',
  });
  return { done: p.done.then(() => clip.remove()), cancel: p.cancel };
}
