import { motion, useReducedMotion, useSpring, type HTMLMotionProps } from 'framer-motion';
import { useRef, type PointerEvent } from 'react';
import { SPRING } from './motion';

interface PrimaryButtonProps extends HTMLMotionProps<'button'> {
  tone?: 'accent' | 'danger' | 'glass';
}

const TONES = {
  accent:
    'bg-[linear-gradient(135deg,var(--accent),color-mix(in_srgb,var(--accent)_58%,black))] text-ink-on-accent shadow-[0_14px_36px_-10px_var(--accent),inset_0_1px_0_rgba(255,255,255,.35)]',
  danger: 'bg-[rgba(255,92,108,.16)] text-[var(--neg)]',
  glass: 'glass text-[var(--tx)]',
};

/** Magnetic on mouse, instant press on touch. */
export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = '',
  tone = 'accent',
  ...rest
}: PrimaryButtonProps) {
  const x = useSpring(0, { stiffness: 300, damping: 24 }),
    y = useSpring(0, { stiffness: 300, damping: 24 });
  const ref = useRef<HTMLButtonElement>(null);
  const rm = useReducedMotion();
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (rm || disabled || e.pointerType !== 'mouse' || !el) return;
    const r = el.getBoundingClientRect();
    x.set(((e.clientX - (r.left + r.width / 2)) / r.width) * 14);
    y.set(((e.clientY - (r.top + r.height / 2)) / r.height) * 10);
  };
  const leave = () => {
    x.set(0);
    y.set(0);
  };
  return (
    <motion.button
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      onClick={onClick}
      disabled={disabled}
      style={{ x, y }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={SPRING}
      className={`flex h-[60px] items-center justify-center gap-2 rounded-[20px] text-18 font-bold tracking-[-0.01em] transition-[background,color,box-shadow] duration-300 ease-apple disabled:cursor-default ${disabled ? 'bg-white/[.06] text-[var(--dis)] shadow-none' : TONES[tone]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
