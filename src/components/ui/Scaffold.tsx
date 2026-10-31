import { motion, useIsPresent, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { t } from '@/strings';
import { useEffect, useId, useRef, type ReactNode } from 'react';

interface ScaffoldProps {
  left?: ReactNode;
  right?: ReactNode;
  navTitle?: ReactNode;
  title?: ReactNode;
  /** The main area. It fills the height left over, so a table inside it can grow to fit. */
  children: ReactNode;
  /** Controls that sit beside the main area when the screen is wide or short, and below it otherwise. */
  aside?: ReactNode;
  /** Put the aside above the main area in the one-column layout. */
  asideFirst?: boolean;
  /** The main area takes the height left over and does not scroll, so a fitted table can fill it. */
  fit?: boolean;
  bar?: ReactNode;
  /** Status line above the bar's buttons, announced politely (why a button is disabled). */
  barNote?: ReactNode;
  className?: string;
}

// Two panes (land, wide) exist only when there is an aside. Class names are spelled out so Tailwind can see them.
const COLUMN =
  'pl-[max(var(--sal),calc((100%-40rem)/2))] pr-[max(var(--sar),calc((100%-40rem)/2))]';
const PANES =
  'land:grid-cols-[minmax(0,1fr)_clamp(17rem,44vw,23rem)] wide:grid-cols-[minmax(0,1.15fr)_minmax(20rem,26rem)] pane:pl-[max(var(--sal),calc((100%-72rem)/2))] pane:pr-[max(var(--sar),calc((100%-72rem)/2))]';
// The body hands its two rows and columns to its children, so main spans the bar's row and the bar sits under the aside.
const BODY_PANES =
  'pane:grid pane:[grid-area:2/1/4/3] pane:grid-cols-subgrid pane:grid-rows-subgrid pane:overflow-visible pane:p-0';
const MAIN_PANE =
  'scroll-thin pane:[grid-area:1/1/3/2] pane:min-h-0 pane:overflow-y-auto pane:overflow-x-hidden pane:overscroll-contain pane:px-5 pane:pt-2 pane:pb-[max(1.5rem,var(--sab))]';
const ASIDE_PANE =
  'scroll-thin shrink-0 pane:[grid-area:1/2/2/3] pane:min-h-0 pane:overflow-y-auto pane:overflow-x-hidden pane:overscroll-contain pane:px-5 pane:pt-2';

/** The controls pane. Its heading is the large title's twin: the title hides in two panes and this shows. */
function AsidePane({
  title,
  bar,
  children,
}: {
  title: ReactNode;
  bar: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`${ASIDE_PANE} ${bar ? 'pane:pb-6' : 'pane:pb-[max(1.5rem,var(--sab))]'}`}>
      {title && (
        <h1 className="disp mb-3 mt-1 hidden font-extrabold leading-[1.08] tracking-[-0.035em] [text-wrap:balance] land:text-22 wide:text-36 pane:block">
          {title}
        </h1>
      )}
      {children}
    </div>
  );
}

/** Nav bar, a content area that scrolls only when it must, and an action bar that never moves. */
export function Scaffold({
  left,
  right,
  navTitle,
  title,
  children,
  aside,
  asideFirst,
  fit,
  bar,
  barNote,
  className = '',
}: ScaffoldProps) {
  const body = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const hasBar = !!bar;
  const owner = useId();
  const isPresent = useIsPresent();
  const present = useRef(isPresent);
  useEffect(() => {
    present.current = isPresent;
  }, [isPresent]);
  // Overlays follow the layout: the toast sits over the bar (so over the controls pane in two panes) and the
  // banner over the main pane. Layout offsets, not bounding boxes, so a screen mid-transition measures true.
  useEffect(() => {
    const bar = barRef.current,
      pane = mainRef.current ?? body.current;
    const root = pane?.closest<HTMLElement>('.app-root');
    if (!pane || !root || typeof ResizeObserver === 'undefined') return;
    const toast = bar ? root.querySelector<HTMLElement>('[data-bar-anchor]') : null,
      banner = root.querySelector<HTMLElement>('[data-main-anchor]');
    let last = '';
    const publish = () => {
      // A screen animating out still resizes (popLayout); it must not take the anchors back from the new one.
      if (!present.current) return;
      const cs = getComputedStyle(pane),
        pl = parseFloat(cs.paddingLeft) || 0,
        pr = parseFloat(cs.paddingRight) || 0;
      const v = {
        '--bar-h': `${bar?.offsetHeight ?? 0}px`,
        '--bar-x': `${bar?.offsetLeft ?? 0}px`,
        '--bar-w': `${bar?.offsetWidth ?? 0}px`,
        '--main-x': `${Math.round(pane.offsetLeft + pl)}px`,
        '--main-w': `${Math.round(pane.clientWidth - pl - pr)}px`,
      };
      const key = JSON.stringify(v);
      if (key === last) return;
      last = key;
      // Written to the elements that use them: a variable on the root would restyle the whole app.
      if (toast)
        for (const k of ['--bar-h', '--bar-x', '--bar-w'] as const)
          toast.style.setProperty(k, v[k]);
      if (toast) toast.dataset.barOwner = owner;
      if (banner)
        for (const k of ['--main-x', '--main-w'] as const) banner.style.setProperty(k, v[k]);
      if (banner) banner.dataset.mainOwner = owner;
    };
    const ro = new ResizeObserver(publish);
    for (const el of [bar, pane, root]) if (el) ro.observe(el);
    return () => {
      ro.disconnect();
      // Screens overlap while they cross-fade; only the screen that set the values may clear them.
      if (toast?.dataset.barOwner === owner) {
        for (const k of ['--bar-h', '--bar-x', '--bar-w']) toast.style.removeProperty(k);
        delete toast.dataset.barOwner;
      }
      if (banner?.dataset.mainOwner === owner) {
        for (const k of ['--main-x', '--main-w']) banner.style.removeProperty(k);
        delete banner.dataset.mainOwner;
      }
    };
  }, [hasBar, owner]);
  const { scrollY } = useScroll({ container: body });
  const navO = useTransform(scrollY, [24, 64], [0, 1]);
  const topBg = useTransform(scrollY, [0, 40], [0, 1]);
  const lgO = useTransform(scrollY, [0, 56], [1, 0]);
  const lgY = useTransform(scrollY, [0, 80], [0, -14]);
  const lgS = useTransform(scrollY, [0, 80], [1, 0.94]);
  const rm = useReducedMotion();
  const main =
    aside || fit ? (
      <div
        ref={mainRef}
        className={`${aside ? MAIN_PANE : ''} ${fit ? 'flex min-h-0 flex-1 flex-col' : ''}`}
      >
        {children}
      </div>
    ) : (
      children
    );
  return (
    <div
      className={`absolute inset-0 grid grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] cq-size overflow-hidden ${COLUMN} ${aside ? PANES : ''} ${className}`}
    >
      <motion.div
        style={{ opacity: topBg }}
        className="chrome-top pointer-events-none absolute inset-x-0 top-0 z-10 h-[calc(5.5rem+var(--sat))]"
      />
      <div className="relative z-20 col-span-full mt-[var(--sat)] flex h-14 items-center justify-between px-2 land:h-12">
        <div className="w-12">{left}</div>
        <motion.span
          style={{ opacity: title ? navO : 1 }}
          className={`disp text-19 font-bold tracking-[-0.02em] ${aside && title ? 'pane:!opacity-100' : ''}`}
        >
          {navTitle}
        </motion.span>
        <div className="flex w-12 justify-end">{right}</div>
      </div>
      <div
        ref={body}
        tabIndex={0}
        role="region"
        aria-label={t.common.content}
        // A block, not a flex column: flex items stop vertical margins collapsing, which moves content.
        className={`scroll-thin min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pt-2 ${hasBar ? 'pb-6' : 'pb-[max(1.5rem,var(--sab))]'} ${fit ? 'flex flex-col' : ''} ${aside ? BODY_PANES : ''}`}
      >
        {title && (
          <motion.h1
            style={rm ? undefined : { opacity: lgO, y: lgY, scale: lgS, transformOrigin: '0 50%' }}
            className={`disp mb-3 mt-1 text-30 font-extrabold leading-[1.08] tracking-[-0.035em] [text-wrap:balance] ${aside ? 'pane:hidden' : ''}`}
          >
            {title}
          </motion.h1>
        )}
        {aside ? (
          <>
            {asideFirst && (
              <AsidePane title={title} bar={hasBar}>
                {aside}
              </AsidePane>
            )}
            {main}
            {!asideFirst && (
              <AsidePane title={title} bar={hasBar}>
                {aside}
              </AsidePane>
            )}
          </>
        ) : (
          main
        )}
      </div>
      {bar && (
        <div
          ref={barRef}
          className={`chrome-bot relative z-20 px-5 pb-[max(1.125rem,var(--sab))] pt-[1.125rem] before:pointer-events-none before:absolute before:inset-x-0 before:-top-6 before:h-6 before:bg-gradient-to-b before:from-transparent before:to-felt-950/60 ${aside ? 'pane:[grid-area:3/2]' : ''}`}
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
          <div className="flex min-h-[3.75rem] items-center gap-3">{bar}</div>
        </div>
      )}
    </div>
  );
}
