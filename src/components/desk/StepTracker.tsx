import { m } from 'framer-motion';
import { PRESS, SPRING } from '@/components/ui/motion';
import { t } from '@/strings';

interface StepTrackerProps {
  /** One label per step, in order. */
  labels: readonly string[];
  step: number;
  /** Whether a step can be reached from here (going back always can; forward only when the game allows it). */
  can: (s: number) => boolean;
  go: (s: number) => void;
  /** The tracker's accessible name. */
  label: string;
}

/** Where a hand or round is (Bid, Play, Results…), and a way back (or on) with one click. */
export function StepTracker({ labels, step, can, go, label }: StepTrackerProps) {
  return (
    <nav aria-label={label} className="shrink-0">
      <ol className="flex gap-1.5 rounded-[14px] bg-ov/[.07] p-1">
        {labels.map((name, s) => {
          const on = s === step,
            done = s < step;
          return (
            <li key={name} className="min-w-0 flex-1">
              <m.button
                type="button"
                aria-current={on ? 'step' : undefined}
                disabled={!on && !can(s)}
                onClick={() => !on && go(s)}
                whileTap={on ? undefined : PRESS}
                transition={SPRING}
                className={`relative isolate flex h-12 w-full items-center justify-center gap-2 rounded-[11px] text-15 font-bold disabled:cursor-default ${on ? 'text-ink-on-accent' : done ? 'text-[var(--tx)]' : 'text-[var(--tx2)]'}`}
              >
                {on && (
                  <m.span
                    layoutId="ws-step"
                    transition={SPRING}
                    aria-hidden
                    className="absolute inset-0 -z-10 rounded-[11px] bg-accent-gradient shadow-[0_8px_22px_-8px_var(--accent)]"
                  />
                )}
                <b
                  aria-hidden
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-13 ${on ? 'bg-shade/20' : 'bg-ov/[.14]'}`}
                >
                  {done ? '✓' : s + 1}
                </b>
                {name}
                <span className="sr-only">
                  {on ? `, ${t.desk.steps.now}` : done ? `, ${t.desk.steps.done}` : ''}
                </span>
              </m.button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
