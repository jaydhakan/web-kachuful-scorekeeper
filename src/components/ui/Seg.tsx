import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { SPRING } from './motion';

export interface SegOption<T extends string> {
  v: T;
  label: ReactNode;
  tone?: 'pos' | 'neg';
}

interface SegProps<T extends string> {
  uid: string;
  value: T | undefined;
  options: SegOption<T>[];
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

const thumbBg = (tone?: 'pos' | 'neg') =>
  tone === 'pos' ? 'var(--pos)' : tone === 'neg' ? 'var(--neg)' : 'var(--accent)';
const onInk = (tone?: 'pos' | 'neg') =>
  tone === 'neg' ? 'text-ink-negative' : 'text-ink-on-accent';

/** Segmented control with a sliding thumb. */
export function Seg<T extends string>({
  uid,
  value,
  options,
  onChange,
  size = 'md',
  className = '',
}: SegProps<T>) {
  return (
    <div className={`relative inline-flex rounded-2xl bg-white/[.06] p-[3px] ${className}`}>
      {options.map((o) => {
        const on = value === o.v;
        return (
          <motion.button
            key={o.v}
            type="button"
            aria-pressed={on}
            onPointerDown={() => onChange(o.v)}
            onClick={(e) => {
              // Pointer taps already fired on pointer-down; a click with no pointer is the keyboard.
              if (e.detail === 0) onChange(o.v);
            }}
            whileTap={{ scale: 0.95 }}
            transition={SPRING}
            className={`relative z-10 flex items-center justify-center rounded-[13px] px-3.5 font-bold tracking-[-0.005em] ${size === 'sm' ? 'h-[42px] min-w-[48px] text-15' : 'h-11 min-w-[56px] text-16'} ${on ? onInk(o.tone) : 'text-[var(--tx2)]'}`}
          >
            {on && (
              <motion.span
                layoutId={uid}
                transition={SPRING}
                className="absolute inset-0 -z-10 rounded-[13px]"
                style={{ background: thumbBg(o.tone), boxShadow: '0 6px 18px -6px rgba(0,0,0,.6)' }}
              />
            )}
            {o.label}
          </motion.button>
        );
      })}
    </div>
  );
}
