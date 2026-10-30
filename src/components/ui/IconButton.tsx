import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { SPRING } from './motion';

interface IconButtonProps {
  children: ReactNode;
  onClick: () => void;
  label: string;
  className?: string;
}

export function IconButton({ children, onClick, label, className = '' }: IconButtonProps) {
  return (
    <motion.button
      type="button"
      aria-label={label}
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
