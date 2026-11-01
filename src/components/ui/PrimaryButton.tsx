import { m, useReducedMotion, useSpring, type HTMLMotionProps } from 'framer-motion';
import { useRef, type PointerEvent, type ReactNode } from 'react';
import { PRESS, SPRING } from './motion';

interface PrimaryButtonProps extends HTMLMotionProps<'button'> {
  tone?: 'accent' | 'danger' | 'glass';
}

// Each theme paints these materials (src/styles/themes.css); the button only picks one.
const FILL = { accent: 'mat-fill', danger: 'mat-fill-d', glass: 'mat-fill-s' };
const INK = {
  accent: 'text-ink-on-accent',
  danger: 'text-[var(--neg-tx)]',
  glass: 'text-[var(--tx)]',
};
const layer = 'absolute inset-0 -z-10 rounded-[inherit] transition-opacity duration-300 ease-apple';

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
    <m.button
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      onClick={onClick}
      disabled={disabled}
      style={{ x, y }}
      whileTap={disabled ? undefined : PRESS}
      transition={SPRING}
      className={`mat-cta mat-tone-${tone} relative isolate flex h-[60px] items-center justify-center gap-2 rounded-[20px] text-18 font-bold tracking-[-0.01em] disabled:cursor-default ${disabled ? 'text-[var(--tx2)]' : `mat-cta-on ${INK[tone]}`} ${className}`}
      {...rest}
    >
      {/* Enabling cross-fades two pre-painted fills; colours and shadows never animate. */}
      <span aria-hidden className={`${layer} mat-fill-off ${disabled ? '' : 'opacity-0'}`} />
      <span aria-hidden className={`${layer} ${FILL[tone]} ${disabled ? 'opacity-0' : ''}`} />
      {children as ReactNode}
    </m.button>
  );
}
