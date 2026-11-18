import { m, useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { REDUCED, SPRING_POP } from './motion';

/** Every podium's reveal (WOW-MOMENTS-PLAN A2): the light lands on first place, then the crown drops on its winner. */
export const LIGHT_MS = { ceremony: 900, board: 600 } as const;
const TRAVEL = 'cubic-bezier(.65,0,.35,1)';

/**
 * A soft light that crosses the podium from the side and comes to rest on first place; put it first in the winner's
 * column, which must be `relative isolate`. `at` (ms) starts it; null shows it at rest (reduced motion, a reopened
 * screen). It is a radial gradient moved by transform, never a loop.
 */
export function Spotlight({ at, ms }: { at: number | null; ms: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const rm = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (at == null || rm || typeof el?.animate !== 'function') return;
    const a = el.animate(
      [
        { transform: 'translateX(-130%)', opacity: 0 },
        { transform: 'translateX(-60%)', opacity: 1, offset: 0.4 },
        { transform: 'translateX(0)', opacity: 1 },
      ],
      { duration: ms, delay: at, easing: TRAVEL, fill: 'both' },
    );
    return () => a.cancel();
  }, [at, ms, rm]);
  return (
    <span
      ref={ref}
      aria-hidden
      data-spotlight
      className="pointer-events-none absolute -inset-x-1/2 -top-1/4 bottom-0 -z-10 bg-[radial-gradient(ellipse_45%_60%_at_50%_35%,color-mix(in_srgb,var(--medal-gold-hi)_30%,transparent),transparent_75%)]"
    />
  );
}

/**
 * The winner's crown, set on their avatar (which must be `relative`): it drops and snaps on with `SPRING_POP` at `at`
 * (ms); null: already on. Reduced motion fades it in.
 */
export function Crown({ at }: { at: number | null }) {
  const rm = useReducedMotion();
  const staged = at != null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-[78%]"
    >
      <m.span
        data-crown
        className="block text-[0.62em] leading-none"
        initial={staged ? (rm ? { opacity: 0 } : { y: '-160%', rotate: -18, opacity: 0 }) : false}
        animate={{ y: 0, rotate: -8, opacity: 1 }}
        style={staged ? undefined : { rotate: -8 }}
        transition={
          rm
            ? { duration: REDUCED, delay: (at ?? 0) / 1000 }
            : { ...SPRING_POP, delay: (at ?? 0) / 1000 }
        }
      >
        👑
      </m.span>
    </span>
  );
}
