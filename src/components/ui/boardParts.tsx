import { m } from 'framer-motion';
import { createContext, useContext, useEffect, useState } from 'react';
import { SPRING } from './motion';
import { t } from '@/strings';

// The small parts every game's board shares, kept apart from Stats.tsx (Kachuful's pickers and charts).
const s = t.hub.stats;

/**
 * Lets a page play the rank arrows' entrance once per visit: the first list shown animates, a list shown after a
 * filter change appears still. Without a provider the arrows always animate.
 */
export const DeltaIntro = createContext<{ done: boolean } | null>(null);

/** A rank's movement since the period before; it springs in from its direction after the row lands. */
export function RankDelta({ d, i = 0 }: { d: number | null; i?: number }) {
  const intro = useContext(DeltaIntro);
  // Read at mount: every row of the first list mounts in one render, before the effect below marks it done.
  const [play] = useState(() => !intro?.done);
  useEffect(() => {
    if (intro) intro.done = true;
  }, [intro]);
  if (!d) return null;
  return (
    <m.span
      initial={play ? { opacity: 0, y: d > 0 ? 8 : -8, scale: 0.6 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...SPRING, delay: 0.3 + Math.min(i, 12) * 0.04 }}
      aria-label={d > 0 ? s.up(d) : s.down(-d)}
      className={`mt-0.5 text-center text-13 font-extrabold leading-none ${d > 0 ? 'text-[var(--pos)]' : 'text-[var(--neg-tx)]'}`}
    >
      {d > 0 ? '▲' : '▼'}
      {Math.abs(d)}
    </m.span>
  );
}

/** How far along a count is. */
export const Progress = ({
  v,
  of,
  fill = 'bg-[var(--tx2)]',
}: {
  v: number;
  of: number;
  fill?: string;
}) => (
  <span className="relative block h-1.5 w-full overflow-hidden rounded-full bg-ov/[.08]">
    <span
      className={`absolute inset-0 origin-left rounded-full ${fill}`}
      style={{ transform: `scaleX(${Math.min(1, v / of)})` }}
    />
  </span>
);
