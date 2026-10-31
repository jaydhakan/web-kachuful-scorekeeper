import { animate } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { fmt } from '@/lib/format';
import { EASE } from './motion';

interface CounterProps {
  from: number;
  to: number;
  run: boolean;
  duration?: number;
}

/** Count-up number; writes text directly so it never re-renders mid-count. */
export function Counter({ from, to, run, duration = 0.6 }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!run) {
      el.textContent = fmt(from);
      return;
    }
    const c = animate(from, to, {
      duration,
      ease: EASE,
      onUpdate: (v) => {
        el.textContent = fmt(Math.round(v));
      },
    });
    return () => c.stop();
  }, [run, from, to, duration]);
  return <span ref={ref}>{fmt(from)}</span>;
}
