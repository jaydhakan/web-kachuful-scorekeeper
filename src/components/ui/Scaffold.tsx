import { motion, useIsPresent, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { t } from '@/strings';
import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';

interface ScaffoldProps {
  left?: ReactNode;
  right?: ReactNode;
  navTitle?: ReactNode;
  title?: ReactNode;
  children: ReactNode;
  bar?: ReactNode;
  /** Status line above the bar's buttons, announced politely (why a button is disabled). */
  barNote?: ReactNode;
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
  barNote,
  className = '',
  scrollRef,
}: ScaffoldProps) {
  const inner = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const hasBar = !!bar;
  const owner = useId();
  const ref = scrollRef || inner;
  const isPresent = useIsPresent();
  const present = useRef(isPresent);
  useEffect(() => {
    present.current = isPresent;
  }, [isPresent]);
  // The scroll body and the toast clear the bar by its real height, which grows with the note and the home indicator.
  useEffect(() => {
    const el = barRef.current,
      body = ref.current;
    if (!el || !body || typeof ResizeObserver === 'undefined') return;
    const anchor = body.closest('.app-root')?.querySelector<HTMLElement>('[data-bar-anchor]');
    let last = 0;
    const ro = new ResizeObserver(([e]) => {
      const h = Math.round(e.borderBoxSize?.[0]?.blockSize ?? el.offsetHeight);
      // A screen animating out still resizes (popLayout); it must not take the anchor back from the new one.
      if (h === last || !present.current) return;
      last = h;
      // Written to the two elements that use it: a variable on the root would restyle the whole app.
      body.style.paddingBottom = `${h + 24}px`;
      if (!anchor) return;
      anchor.style.setProperty('--bar-h', `${h}px`);
      anchor.dataset.barOwner = owner;
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      // Screens overlap while they cross-fade; only the screen that set the value may clear it.
      if (anchor?.dataset.barOwner === owner) {
        anchor.style.removeProperty('--bar-h');
        delete anchor.dataset.barOwner;
      }
    };
  }, [hasBar, owner, ref]);
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
        className="no-scroll absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pb-[120px] pt-[calc(64px+var(--sat))]"
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
        <div
          ref={barRef}
          className="chrome-bot absolute inset-x-0 bottom-0 z-20 px-5 pb-[max(18px,var(--sab))] pt-[18px]"
        >
          {barNote !== undefined && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-xl text-14 font-medium leading-[1.35] text-[var(--warn)] [&:not(:empty)]:mb-2.5 [&:not(:empty)]:bg-felt-950/85 [&:not(:empty)]:px-3 [&:not(:empty)]:py-2"
            >
              {barNote}
            </div>
          )}
          <div className="flex min-h-[60px] items-center gap-3">{bar}</div>
        </div>
      )}
    </div>
  );
}
