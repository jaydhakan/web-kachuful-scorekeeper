import { motion } from 'framer-motion';
import { SPRING } from '@/components/ui/motion';
import { t } from '@/strings';

export type Step = 0 | 1 | 2;

interface StepTrackerProps {
  step: Step;
  /** Whether a step can be reached from here (going back always can; forward only when the round allows it). */
  can: (s: Step) => boolean;
  go: (s: Step) => void;
}

/** Bid, Play, Results: where the round is, and a way back (or on) with one click. */
export function StepTracker({ step, can, go }: StepTrackerProps) {
  const labels = [t.desk.steps.bid, t.desk.steps.play, t.desk.steps.results];
  return (
    <nav aria-label={t.desk.steps.label} className="shrink-0">
      <ol className="flex gap-1.5 rounded-[14px] bg-white/[.07] p-1">
        {labels.map((label, i) => {
          const s = i as Step,
            on = s === step,
            done = s < step;
          return (
            <li key={label} className="flex-1">
              <motion.button
                type="button"
                aria-current={on ? 'step' : undefined}
                disabled={!on && !can(s)}
                onClick={() => !on && go(s)}
                whileTap={on ? undefined : { scale: 0.96 }}
                transition={SPRING}
                className={`relative isolate flex h-12 w-full items-center justify-center gap-2 rounded-[11px] text-15 font-bold disabled:cursor-default ${on ? 'text-ink-on-accent' : done ? 'text-[var(--tx)]' : 'text-[var(--tx2)]'}`}
              >
                {on && (
                  <motion.span
                    layoutId="ws-step"
                    transition={SPRING}
                    aria-hidden
                    className="absolute inset-0 -z-10 rounded-[11px] bg-accent-gradient shadow-[0_8px_22px_-8px_var(--accent)]"
                  />
                )}
                <b
                  aria-hidden
                  className={`grid h-5 w-5 place-items-center rounded-full text-13 ${on ? 'bg-black/20' : 'bg-white/[.14]'}`}
                >
                  {done ? '✓' : i + 1}
                </b>
                {label}
                <span className="sr-only">
                  {on ? `, ${t.desk.steps.now}` : done ? `, ${t.desk.steps.done}` : ''}
                </span>
              </motion.button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
