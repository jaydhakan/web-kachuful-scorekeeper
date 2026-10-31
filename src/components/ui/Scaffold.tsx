import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { t } from '@/strings';
import { useRef, type ReactNode, type RefObject } from 'react';

interface ScaffoldProps {
  left?: ReactNode;
  right?: ReactNode;
  navTitle?: ReactNode;
  title?: ReactNode;
  children: ReactNode;
  bar?: ReactNode;
  className?: string;
  scrollRef?: RefObject<HTMLDivElement>;
}

/** Translucent chrome over a scrolling body, with a collapsing large title. */
export function Scaffold({
  left,
  right,
  navTitle,
  title,
  children,
  bar,
  className = '',
  scrollRef,
}: ScaffoldProps) {
  const inner = useRef<HTMLDivElement>(null);
  const ref = scrollRef || inner;
  const { scrollY } = useScroll({ container: ref });
  const navO = useTransform(scrollY, [24, 64], [0, 1]);
  const topBg = useTransform(scrollY, [0, 40], [0, 1]);
  const lgO = useTransform(scrollY, [0, 56], [1, 0]);
  const lgY = useTransform(scrollY, [0, 80], [0, -14]);
  const lgS = useTransform(scrollY, [0, 80], [1, 0.94]);
  const rm = useReducedMotion();
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <div
        ref={ref}
        tabIndex={0}
        role="region"
        aria-label={t.common.content}
        className="no-scroll absolute inset-0 overflow-y-auto overscroll-contain px-5 pb-[120px] pt-[calc(64px+var(--sat))]"
      >
        {title && (
          <motion.h1
            style={rm ? undefined : { opacity: lgO, y: lgY, scale: lgS, transformOrigin: '0 50%' }}
            className="disp mb-3 mt-1 text-30 font-extrabold leading-[1.08] tracking-[-0.035em] [text-wrap:balance]"
          >
            {title}
          </motion.h1>
        )}
        {children}
      </div>
      <motion.div
        style={{ opacity: topBg }}
        className="chrome-top pointer-events-none absolute inset-x-0 top-0 z-10 h-[calc(88px+var(--sat))]"
      />
      <div className="absolute inset-x-0 top-[var(--sat)] z-20 flex h-14 items-center justify-between px-2">
        <div className="w-12">{left}</div>
        <motion.span
          style={{ opacity: title ? navO : 1 }}
          className="disp text-19 font-bold tracking-[-0.02em]"
        >
          {navTitle}
        </motion.span>
        <div className="flex w-12 justify-end">{right}</div>
      </div>
      {bar && (
        <div className="chrome-bot absolute inset-x-0 bottom-0 z-20 flex min-h-[96px] items-center gap-3 px-5 pb-[max(18px,var(--sab))] pt-[18px]">
          {bar}
        </div>
      )}
    </div>
  );
}
