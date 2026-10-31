import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';
import { ACH } from '@/domain';
import { useApp } from '@/state/store';
import { achName } from '@/strings/achievements';
import { SPRING_POP } from './ui/motion';
import { t } from '@/strings';

const HOLD_MS = 2500;

/**
 * The round's smaller achievements as cards that drop in under the top bar, after any full-screen streak burst,
 * and leave on their own. They never take focus or block a tap.
 */
export function BadgePop() {
  const { state, actions } = useApp();
  const rm = useReducedMotion();
  const pops = state.streakFx ? null : state.pops;
  const n = pops ? pops.items.length + (pops.more ? 1 : 0) : 0;
  useEffect(() => {
    if (!pops) return;
    const tm = setTimeout(actions.popsDone, HOLD_MS + n * 250);
    return () => clearTimeout(tm);
  }, [pops, n, actions]);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute left-[var(--toast-x,0px)] top-[calc(var(--toast-top,calc(var(--sat)+0.375rem))+3.25rem)] z-[57] flex w-[var(--toast-w,100%)] flex-col items-center gap-1.5 px-4"
    >
      <AnimatePresence>
        {pops &&
          [
            ...pops.items.map((x) => ({
              k: x.code + x.name,
              emoji: ACH.get(x.code)?.emoji ?? '🏅',
              text: `${x.name} · ${achName(x.code)}`,
            })),
            ...(pops.more ? [{ k: 'more', emoji: '✨', text: t.hub.pops.more(pops.more) }] : []),
          ].map((c, i) => (
            <motion.div
              key={`${pops.id}-${c.k}`}
              initial={rm ? { opacity: 0 } : { opacity: 0, y: -28, rotate: -4, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
              exit={rm ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.95 }}
              transition={{ ...SPRING_POP, delay: rm ? 0 : i * 0.12 }}
              className="flex max-w-full items-center gap-2 rounded-2xl border border-white/10 bg-toast px-3.5 py-2 text-15 font-bold shadow-[0_10px_28px_-8px_rgba(0,0,0,.7)]"
            >
              <span aria-hidden className="text-22">
                {c.emoji}
              </span>
              <span className="[overflow-wrap:anywhere]">{c.text}</span>
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );
}
