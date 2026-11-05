import { m, useReducedMotion } from 'framer-motion';
import { EASE } from './motion';
import { icon } from './IconsMore';

const SIZE = { md: 'h-12 w-12 text-28', sm: 'h-10 w-10 text-22' } as const;

/**
 * An achievement or award medallion: gold ring and glow once won, a dashed padlock until then. `shine` sweeps light
 * across it once (skipped with reduced motion); `delay` staggers that sweep in a list.
 */
export function Medal({
  emoji,
  won = true,
  shine = false,
  delay = 0,
  size = 'md',
  className = '',
}: {
  emoji: string;
  won?: boolean;
  shine?: boolean;
  delay?: number;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const rm = useReducedMotion();
  return (
    <span
      aria-hidden
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full leading-none ${SIZE[size]} ${
        won
          ? 'bg-gold/[.16] shadow-[0_0_0_1.5px_var(--gold),0_0_18px_color-mix(in_srgb,var(--medal-gold)_45%,transparent)]'
          : 'border border-dashed border-ov/25'
      } ${className}`}
    >
      {won ? emoji : icon('locked', 'h-5 w-5 text-[var(--dis)]')}
      {shine && won && !rm && (
        <m.span
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_30%,color-mix(in_srgb,var(--medal-gold-hi)_75%,transparent)_50%,transparent_70%)]"
          initial={{ x: '-110%' }}
          animate={{ x: '110%' }}
          transition={{ duration: 0.9, ease: EASE, delay }}
        />
      )}
    </span>
  );
}
