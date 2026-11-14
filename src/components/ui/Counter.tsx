import { animate } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { fmt } from '@/lib/format';
import { EASE } from './motion';

interface CounterProps {
  from: number;
  to: number;
  run: boolean;
  duration?: number;
  /** Seconds to hold `from` before counting, for a number that waits its turn in a sequence. */
  delay?: number;
  /** How a value on the way is written; whole numbers by default. Give a stable function. */
  format?: (v: number) => string;
}

const whole = (v: number) => fmt(Math.round(v));

/** Count-up number; writes text directly so it never re-renders mid-count. */
export function Counter({
  from,
  to,
  run,
  duration = 0.6,
  delay = 0,
  format = whole,
}: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!run) {
      el.textContent = format(from);
      return;
    }
    const c = animate(from, to, {
      duration,
      delay,
      ease: EASE,
      onUpdate: (v) => {
        el.textContent = format(v);
      },
    });
    // Variable-weight score (DESIGN-SYSTEM.md, Motion): the number swells from light to heavy as it counts, then
    // settles on its own weight. Off under reduced motion; a theme whose face has one weight simply doesn't change.
    const w =
      from !== to && !matchMedia('(prefers-reduced-motion: reduce)').matches
        ? el.animate?.(
            [
              { fontWeight: 300, letterSpacing: '0.03em' },
              { fontWeight: 800, letterSpacing: '-0.02em', offset: 0.7 },
            ],
            {
              duration: duration * 1000 + 250,
              delay: delay * 1000,
              easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
            },
          )
        : undefined;
    return () => {
      c.stop();
      w?.cancel();
    };
  }, [run, from, to, duration, delay, format]);
  return <span ref={ref}>{format(from)}</span>;
}
