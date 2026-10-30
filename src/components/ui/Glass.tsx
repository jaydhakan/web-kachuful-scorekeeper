import { motion, type HTMLMotionProps } from 'framer-motion';
import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { SPRING } from './motion';

interface GlassProps extends HTMLMotionProps<'div'> {
  glow?: boolean;
  spot?: boolean;
}

export function Glass({
  className = '',
  glow,
  spot = true,
  onClick,
  children,
  ...rest
}: GlassProps) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!spot || e.pointerType !== 'mouse' || !el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', e.clientX - r.left + 'px');
    el.style.setProperty('--my', e.clientY - r.top + 'px');
  };
  return (
    <motion.div
      ref={ref}
      onPointerMove={move}
      onClick={onClick}
      {...(onClick && {
        role: 'button',
        tabIndex: 0,
        onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
          if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
          e.preventDefault();
          e.currentTarget.click();
        },
      })}
      whileTap={onClick ? { scale: 0.975 } : undefined}
      transition={SPRING}
      className={`glass ${glow ? 'glass-glow' : ''} ${spot ? 'spot' : ''} ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
