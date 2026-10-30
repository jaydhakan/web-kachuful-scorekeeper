import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { SPRING } from './motion';

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
    <motion.button
      type="button"
      aria-label={label}
      data-skip-initial-focus={skipInitialFocus || undefined}
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      whileHover={{ backgroundColor: 'rgba(255,255,255,.08)' }}
      transition={SPRING}
      className={`grid h-12 w-12 place-items-center rounded-2xl ${className}`}
    >
      {children}
    </motion.button>
  );
}
