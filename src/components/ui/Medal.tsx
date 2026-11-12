import { m, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { EASE } from './motion';
import { icon } from './IconsMore';

const SIZE = { md: 'h-12 w-12 text-28', sm: 'h-10 w-10 text-22' } as const;

// The stamp, in seconds: the medal turns over raised, drops into its slot, and one ring leaves it.
const TURN = 0.6;
const DROP = 0.17;
const RING = 0.45;
const STAMP = TURN + DROP;
/** When the stamp lands, counted from the start of its turn: what follows it (the shine, a label) waits this long. */
export const STAMP_LANDS = STAMP;
// Keyframe stops: edge-on (the face shows from here), flat but still raised, landed.
const STOPS = [0, (TURN * 0.38) / STAMP, TURN / STAMP, 1];
const OUT = [0.22, 1, 0.36, 1] as const;

/**
 * An achievement or award medallion: gold ring and glow once won, a dashed padlock until then. `shine` sweeps light
 * across it once (skipped with reduced motion); `delay` staggers that sweep in a list. `stamp` turns the medal over
 * and stamps it into place once, before the shine (reduced motion: only the ring fades through).
 */
export function Medal({
  emoji,
  won = true,
  shine = false,
  stamp = false,
  delay = 0,
  size = 'md',
  className = '',
}: {
  emoji: string;
  won?: boolean;
  shine?: boolean;
  stamp?: boolean;
  delay?: number;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const rm = useReducedMotion();
  // Latched: once stamped the medal keeps this markup, so a later render can neither cut the stamp short nor replay it.
  const [armed, setArmed] = useState(stamp && won);
  if (stamp && won && !armed) setArmed(true);
  const face = `relative grid shrink-0 place-items-center overflow-hidden rounded-full leading-none ${SIZE[size]} ${
    won
      ? 'bg-gold/[.16] shadow-[0_0_0_1.5px_var(--gold),0_0_18px_color-mix(in_srgb,var(--medal-gold)_45%,transparent)]'
      : 'border border-dashed border-ov/25'
  } ${className}`;
  const content = won ? emoji : icon('locked', 'h-5 w-5 text-[var(--dis)]');
  const light = shine && won && !rm && (
    <m.span
      className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_30%,color-mix(in_srgb,var(--medal-gold-hi)_75%,transparent)_50%,transparent_70%)]"
      initial={{ x: '-110%' }}
      animate={{ x: '110%' }}
      transition={{ duration: 0.9, ease: EASE, delay: armed ? delay + STAMP + 0.1 : delay }}
    />
  );
  if (!armed)
    return (
      <span aria-hidden className={face}>
        {content}
        {light}
      </span>
    );
  return (
    <span aria-hidden className="relative grid shrink-0 place-items-center">
      <m.span
        className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_2px_var(--gold)]"
        initial={{ opacity: 0, scale: 1 }}
        animate={rm ? { opacity: [0, 0.7, 0] } : { opacity: [0.7, 0], scale: [1, 1.5] }}
        transition={{ duration: RING, ease: 'easeOut', delay: rm ? delay : delay + STAMP }}
      />
      <m.span
        className={face}
        initial={rm ? false : { rotateY: 180, scale: 1.12, y: -6, transformPerspective: 400 }}
        animate={
          rm
            ? undefined
            : { rotateY: [180, 90, 0, 0], scale: [1.12, 1.12, 1.12, 1], y: [-6, -6, -6, 0] }
        }
        transition={{ duration: STAMP, times: STOPS, ease: ['linear', OUT, 'easeIn'], delay }}
      >
        {/* The back of the medal is blank: the face shows from the moment it is edge-on. */}
        <m.span
          initial={rm ? false : { opacity: 0 }}
          animate={rm ? undefined : { opacity: [0, 0, 1, 1] }}
          transition={{ duration: STAMP, times: [0, STOPS[1], STOPS[1] + 0.001, 1], delay }}
        >
          {content}
        </m.span>
        {light}
      </m.span>
    </span>
  );
}
