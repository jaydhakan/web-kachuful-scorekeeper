import { anim, OUT, TRAVEL, wait } from './waapi';

/** REWARDS-PLAN §5.1: a moment's stage is at most 2.5s (4s at a game's end); the travel is a small part of it. */
export const RISE_MS = 520;
export const SETTLE_MS = 420;
export const HOLD_MS = 1400;

export interface StageRun {
  done: Promise<void>;
  cancel: () => void;
}

type Box = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;
const boxOf = (b: Element | Box) => (b instanceof Element ? b.getBoundingClientRect() : b);

/** The transform that puts `el` (where it is laid out) over the seat's box. */
export function seatTransform(el: Box, seat: Box | null | undefined): string {
  if (!seat || !el.width) return 'translateY(24px) scale(.6)';
  const dx = seat.left + seat.width / 2 - (el.left + el.width / 2),
    dy = seat.top + seat.height / 2 - (el.top + el.height / 2);
  return `translate(${dx}px,${dy}px) scale(${seat.width / el.width})`;
}

/**
 * The stage (REWARDS-PLAN §3.1): `el`, laid out where the moment plays (the centre, usually a `StageBust`), rises
 * out of the seat's box, holds while the moment plays, and settles back into it. A FLIP: measured once, then
 * transform and opacity only. Reduced motion fades in and out in place, with no travel (`anim`'s still version).
 */
export function riseAndSettle(
  el: HTMLElement | null | undefined,
  seat: Element | Box | null | undefined,
  { hold = HOLD_MS, settle = true }: { hold?: number; settle?: boolean } = {},
): StageRun {
  if (!el) return { done: Promise.resolve(), cancel: () => undefined };
  const at = seatTransform(el.getBoundingClientRect(), seat ? boxOf(seat) : null);
  let live = true,
    run = anim(
      el,
      [
        { transform: at, opacity: 0 },
        { opacity: 1, offset: 0.2 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: RISE_MS, easing: OUT, fill: 'both' },
    );
  const done = (async () => {
    await run.done;
    if (!live || !settle) return;
    await wait(hold);
    if (!live) return;
    run = anim(
      el,
      [
        { transform: 'none', opacity: 1 },
        { opacity: 1, offset: 0.7 },
        { transform: at, opacity: 0 },
      ],
      { duration: SETTLE_MS, easing: TRAVEL, fill: 'both' },
    );
    await run.done;
  })();
  return {
    done,
    cancel: () => {
      live = false;
      run.cancel();
    },
  };
}
