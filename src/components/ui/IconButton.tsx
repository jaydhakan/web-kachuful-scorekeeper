import { m } from 'framer-motion';
import type { ReactNode } from 'react';
import { PRESS_SM, SPRING } from './motion';

interface IconButtonProps {
  children: ReactNode;
  onClick: () => void;
  label: string;
  className?: string;
  /** Keeps a dialog from focusing this control first (close buttons). */
  skipInitialFocus?: boolean;
}

export function IconButton({
  children,
  onClick,
  label,
  className = '',
  skipInitialFocus,
}: IconButtonProps) {
  return (
    <m.button
      type="button"
      aria-label={label}
      data-skip-initial-focus={skipInitialFocus || undefined}
      onClick={onClick}
      whileTap={PRESS_SM}
      transition={SPRING}
      className={`group relative isolate grid h-12 w-12 place-items-center rounded-2xl ${className}`}
    >
      <span
        aria-hidden
        className="absolute inset-0 -z-10 rounded-[inherit] bg-ov/[.08] opacity-0 transition-opacity duration-200 [@media(hover:hover)]:group-hover:opacity-100"
      />
      {children}
    </m.button>
  );
}
