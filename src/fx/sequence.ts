import { playCue, type Cue } from './feedback';
import { timeScale } from './reduced';

/** A cue and when it plays, in ms from the start of the sequence: taken from the animation's own timing. */
export interface TimedCue extends Cue {
  at: number;
}
export interface CuePlan {
  cues: readonly TimedCue[];
  /** The one sound that stands for the whole sequence under reduced motion (it plays at once). */
  reduced?: Cue;
  /** The one sound that stands for the end state when a tap skips the sequence (a new leader's crown). */
  settle?: Cue;
}
export interface CueRun {
  /** Drops every cue not yet played; `settle` plays the plan's `settle` cue instead, if the run hadn't finished. */
  cancel: (o?: { settle?: boolean }) => void;
}

/**
 * Plays a plan's cues from the timing the animation uses, so sound and motion can't drift apart. Every cue goes
 * through a timer, even at 0, so cancelling (skip, unmount, a StrictMode effect re-run) always catches it.
 * Reduced motion plays only `reduced`: sound isn't motion, but a staggered run collapses into one. `play` lets the
 * Sound Board play whatever the setting says.
 */
export function scheduleCues(
  plan: CuePlan,
  { reduced = false, play = playCue }: { reduced?: boolean; play?: (c: Cue) => void } = {},
): CueRun {
  const timers: ReturnType<typeof setTimeout>[] = [];
  let pending = 0;
  const fire = (c: Cue) => () => {
    pending--;
    play(c);
  };
  const list: TimedCue[] = reduced
    ? plan.reduced
      ? [{ ...plan.reduced, at: 0 }]
      : []
    : [...plan.cues];
  pending = list.length;
  for (const { at, ...c } of list) timers.push(setTimeout(fire(c), at * timeScale()));
  return {
    cancel: (o) => {
      const unfinished = pending > 0;
      timers.forEach(clearTimeout);
      timers.length = 0;
      pending = 0;
      if (o?.settle && unfinished && plan.settle) play(plan.settle);
    },
  };
}
