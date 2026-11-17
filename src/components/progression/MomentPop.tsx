import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';
import { SPRING_POP } from '@/components/ui/motion';
import type { PopCard } from './popCard';

const HOLD_MS = 2500;

/**
 * Moments just earned as cards that drop in under the top bar and leave on their own; they never take focus or
 * block a tap. A new `pops` object is a new batch (null shows nothing); `onDone` fires once it has been read.
 */
export function MomentPop({
  pops,
  onDone,
}: {
  pops: { id: number | string; cards: PopCard[] } | null;
  onDone: () => void;
}) {
  const rm = useReducedMotion();
  const n = pops?.cards.length ?? 0;
  useEffect(() => {
    if (!pops) return;
    const tm = setTimeout(onDone, HOLD_MS + n * 250);
    return () => clearTimeout(tm);
  }, [pops, n, onDone]);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute left-[var(--toast-x,0px)] top-[calc(var(--toast-top,calc(var(--sat)+0.375rem))+3.25rem)] z-[57] flex w-[var(--toast-w,100%)] flex-col items-center gap-1.5 px-4"
    >
      <AnimatePresence>
        {pops &&
          pops.cards.map((c, i) => (
            <m.div
              key={`${pops.id}-${c.k}`}
              initial={rm ? { opacity: 0 } : { opacity: 0, y: -28, rotate: -4, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
              exit={rm ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.95 }}
              transition={{ ...SPRING_POP, delay: rm ? 0 : i * 0.12 }}
              className="badge-pop flex max-w-full items-center gap-2 rounded-2xl border border-ov/10 bg-toast px-3.5 py-2 text-15 font-bold shadow-[0_10px_28px_-8px_color-mix(in_srgb,var(--shade)_70%,transparent)]"
            >
              <span aria-hidden className="text-22">
                {c.emoji}
              </span>
              <span className="[overflow-wrap:anywhere]">{c.text}</span>
            </m.div>
          ))}
      </AnimatePresence>
    </div>
  );
}
