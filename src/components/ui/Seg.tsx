import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useRovingFocus } from '@/hooks/useRovingFocus';
import { SPRING } from './motion';

export interface SegOption<T extends string> {
  v: T;
  label: ReactNode;
  tone?: 'pos' | 'neg';
  /** Not allowed right now. It stays focusable so assistive tech can read why (`why`). */
  disabled?: boolean;
  why?: string;
}

interface SegProps<T extends string> {
  uid: string;
  value: T | undefined;
  options: SegOption<T>[];
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
  /** Names the group for assistive tech. */
  label?: string;
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
  label,
  className = '',
}: SegProps<T>) {
  const roving = useRovingFocus({ selected: options.findIndex((o) => o.v === value) });
  return (
    <div
      role="group"
      aria-label={label}
      {...roving.group}
      className={`relative inline-flex rounded-2xl bg-white/[.06] p-[3px] ${className}`}
    >
      {options.map((o, i) => {
        const on = value === o.v;
        return (
          <motion.button
            key={o.v}
            type="button"
            aria-pressed={on}
            aria-disabled={o.disabled || undefined}
            title={o.disabled ? o.why : undefined}
            {...roving.item(i)}
            // Commit on release: a touch that turns into a scroll never fires click.
            onClick={() => !o.disabled && onChange(o.v)}
            whileTap={o.disabled ? undefined : { scale: 0.95, opacity: 0.85 }}
            transition={SPRING}
            className={`relative z-10 flex items-center justify-center rounded-[13px] px-3.5 font-bold tracking-[-0.005em] ${size === 'sm' ? 'h-11 min-w-[48px] text-15' : 'h-11 min-w-[56px] text-16'} ${on ? onInk(o.tone) : 'text-[var(--tx2)]'} ${o.disabled ? 'opacity-35' : ''}`}
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
