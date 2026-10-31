import { animate, motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import type { Trump } from '@/domain';
import { TR } from '@/theme/trumps';
import { dpx } from '@/lib/tableGeometry';
import { fmt, sgnN } from '@/lib/format';
import { Avatar as UiAvatar, type Face } from '@/components/ui/Avatar';
import { EASE, SPRING, SPRING_POP } from '@/components/ui/motion';
import { t } from '@/strings';

/** A key cap. Hidden where there is no mouse or trackpad, since there is probably no keyboard either. */
export const Kbd = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <kbd
    className={`hidden h-6 min-w-6 place-items-center rounded-md bg-black/20 px-1.5 font-sans text-13 font-bold not-italic text-current kbd:inline-grid ${className}`}
  >
    {children}
  </kbd>
);

/** A row of shortcut hints: pairs of key and what it does. */
export const KeyHints = ({ items }: { items: [ReactNode, string][] }) => (
  <div className="hidden flex-wrap items-center justify-center gap-x-3 gap-y-1 text-13 text-[var(--tx2)] kbd:flex">
    {items.map(([k, label]) => (
      <span key={label} className="inline-flex items-center gap-1.5">
        <Kbd className="bg-white/[.12]">{k}</Kbd>
        {label}
      </span>
    ))}
  </div>
);

export const Eyebrow = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={`text-13 font-bold uppercase tracking-[0.12em] text-[var(--accent)] ${className}`}
  >
    {children}
  </div>
);

interface PageHeadProps {
  eyebrow: ReactNode;
  title: ReactNode;
  actions?: ReactNode;
  /** The top bar already names the screen on a tablet held upright. */
  barTitled?: boolean;
}

export function PageHead({ eyebrow, title, actions, barTitled }: PageHeadProps) {
  return (
    <header
      className={`flex shrink-0 flex-wrap items-end justify-between gap-x-6 gap-y-3 ${barTitled ? 'tp:hidden' : ''}`}
    >
      <div className="min-w-0">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="disp text-28 font-extrabold leading-[1.05] tracking-[-0.03em] tl:text-34 dt:text-40">
          {title}
        </h1>
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}

/** A screen's frame inside the shell: padding per layout, and a column that may scroll when the content is tall. */
export function DeskPage({
  children,
  scroll,
  label,
  className = '',
}: {
  children: ReactNode;
  scroll?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <div
      {...(scroll && { tabIndex: 0, role: 'region', 'aria-label': label })}
      className={`absolute inset-0 flex flex-col gap-4 px-6 pb-4 pt-4 rail:pb-5 focus-visible:rounded-none focus-visible:[outline-offset:-3px] rail:pt-[calc(1.75rem+var(--sat))] tl:px-7 tl:pb-7 dt:gap-5 dt:px-8 dt:py-9 ${scroll ? 'scroll-thin overflow-y-auto overflow-x-hidden' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

interface AvatarProps {
  p: Face;
  /** Diameter in px. */
  s: number;
  className?: string;
  style?: CSSProperties;
}

export const Avatar = ({ p, s, className = '', style }: AvatarProps) => (
  <UiAvatar
    p={p}
    className={`grid shrink-0 place-items-center rounded-full border-2 border-white/20 shadow-[0_8px_22px_rgba(0,0,0,.45)] ${className}`}
    style={{ width: s, height: s, fontSize: Math.round(s * 0.55), ...style }}
  />
);

/** The secondary, glass button of the large-screen boards. */
export function GhostButton({
  children,
  className = '',
  icon,
  ...rest
}: HTMLMotionProps<'button'> & { icon?: boolean }) {
  return (
    <motion.button
      type="button"
      whileHover={rest.disabled ? undefined : { y: -2 }}
      whileTap={{ scale: 0.95 }}
      transition={SPRING}
      className={`glass inline-flex h-12 shrink-0 items-center justify-center gap-2 !rounded-[14px] text-16 font-bold disabled:cursor-default disabled:opacity-45 ${icon ? 'w-12' : 'px-[18px]'} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

/** Points won or lost this round. */
export const Delta = ({ v, className = '' }: { v: number; className?: string }) => (
  <motion.span
    key={v}
    initial={{ scale: 0.5, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={SPRING_POP}
    className={`tick inline-grid h-[30px] min-w-[52px] shrink-0 place-items-center rounded-[10px] px-2.5 text-15 font-extrabold ${className} ${v > 0 ? 'bg-[rgba(74,222,128,.16)] text-[var(--pos)]' : v < 0 ? 'bg-[rgba(255,92,108,.16)] text-[var(--neg-tx)]' : 'bg-white/[.08] text-[var(--tx2)]'}`}
  >
    {sgnN(v)}
  </motion.span>
);

export const rankTone = (rank: number) =>
  rank === 1
    ? 'text-gold'
    : rank === 2
      ? 'text-rank-silver'
      : rank === 3
        ? 'text-rank-bronze'
        : 'text-[var(--tx)]';

export const totalTone = (v: number) => (v < 0 ? 'text-[var(--neg-tx)]' : '');

/** A total that counts to its new value when it changes; writes the text directly so it never re-renders mid-count. */
export function Ticker({ v, className = '' }: { v: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(v);
  const rm = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || shown.current === v) return;
    if (rm) {
      shown.current = v;
      el.textContent = fmt(v);
      return;
    }
    const c = animate(shown.current, v, {
      duration: 0.6,
      ease: EASE,
      onUpdate: (x) => {
        shown.current = Math.round(x);
        el.textContent = fmt(shown.current);
      },
    });
    return () => c.stop();
  }, [v, rm]);
  return (
    <span ref={ref} className={className}>
      {fmt(shown.current)}
    </span>
  );
}

/**
 * The trump in the middle of the large-screen table, sized in table units (--s) rather than by the box's width: the
 * wide oval is short for its width, so a width-based size would reach the seats when the table is small.
 */
export const TableCenter = ({ trump, cards }: { trump: Trump; cards: number }) => (
  <>
    <div
      className="relative leading-none"
      style={{
        color: TR[trump].col,
        textShadow: '0 0 20px var(--accent)',
        fontSize: `max(2rem, ${dpx(72)})`,
      }}
    >
      {TR[trump].sym}
      <span
        aria-hidden
        className="suit-glow absolute inset-0"
        style={{ textShadow: '0 0 52px var(--accent), 0 0 90px var(--glow)' }}
      >
        {TR[trump].sym}
      </span>
    </div>
    <div
      className="whitespace-nowrap font-medium tracking-[0.01em]"
      style={{ fontSize: `max(0.8125rem, ${dpx(15)})` }}
    >
      {t.suit.big(TR[trump].name, cards)}
    </div>
  </>
);
