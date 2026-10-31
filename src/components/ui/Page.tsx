import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { useApp } from '@/state/store';
import { AvatarFill, type Face } from './Avatar';
import { Icon } from './Icons';
import { IconButton } from './IconButton';
import { EASE, SPRING } from './motion';
import { t } from '@/strings';

interface PageProps {
  title: ReactNode;
  /** A plain-text name when the title is markup. */
  label?: string;
  eyebrow?: ReactNode;
  /** Buttons on the right of the header. */
  actions?: ReactNode;
  /** Up to 64rem instead of 40rem on large screens, for tables and grids. */
  wide?: boolean;
  /** Pinned under the header (tabs, range chips). */
  sub?: ReactNode;
  children: ReactNode;
}

/**
 * A screen opened over the game: Back, a title and a scrolling column. The same tree serves the phone and the
 * large-screen shell; `[data-desk]` variants give the desk its padding and type sizes.
 */
export function Page({ title, label, eyebrow, actions, wide, sub, children }: PageProps) {
  const { actions: a } = useApp();
  const titleId = useId();
  return (
    <div className="absolute inset-0 flex flex-col">
      <header className="shrink-0 pl-[max(0.5rem,var(--sal))] pr-[max(1rem,var(--sar))] pt-[calc(var(--sat)+0.5rem)] [[data-desk]_&]:px-6 [[data-desk]_&]:pt-4 rail:[[data-desk]_&]:pt-[calc(1.5rem+var(--sat))] tl:[[data-desk]_&]:px-7 dt:[[data-desk]_&]:px-8">
        <div
          className={`mx-auto flex w-full items-center gap-1 [[data-desk]_&]:gap-3 ${wide ? 'max-w-[64rem]' : 'max-w-[44rem]'}`}
        >
          <IconButton label={t.common.back} onClick={a.back} className="shrink-0">
            {Icon.back}
          </IconButton>
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <div className="text-13 font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
                {eyebrow}
              </div>
            )}
            <h1
              id={titleId}
              className="disp text-26 font-extrabold leading-[1.1] tracking-[-0.03em] [overflow-wrap:anywhere] [[data-desk]_&]:text-34 dt:[[data-desk]_&]:text-40"
            >
              {title}
            </h1>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
        {sub && (
          <div className={`mx-auto mt-2 w-full ${wide ? 'max-w-[64rem]' : 'max-w-[44rem]'}`}>
            {sub}
          </div>
        )}
      </header>
      <div
        tabIndex={0}
        role="region"
        aria-label={label ?? (typeof title === 'string' ? title : undefined)}
        aria-labelledby={label || typeof title === 'string' ? undefined : titleId}
        className="scroll-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-[max(1.5rem,var(--sab))] pt-3 focus-visible:rounded-none focus-visible:[outline-offset:-3px] [[data-desk]_&]:px-6 tl:[[data-desk]_&]:px-7 dt:[[data-desk]_&]:px-8"
      >
        <div className={`mx-auto w-full ${wide ? 'max-w-[64rem]' : 'max-w-[44rem]'}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** A titled group of content. */
export function Section({
  title,
  aside,
  children,
  className = '',
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mb-6 ${className}`}>
      {(title || aside) && (
        <div className="mb-2.5 flex items-end justify-between gap-3">
          {title && (
            <h2 className="text-13 font-bold uppercase tracking-[0.12em] text-[var(--tx2)]">
              {title}
            </h2>
          )}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

/** Nothing to show yet, with what to do about it. */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="flex flex-col items-center gap-2 px-4 py-12 text-center"
    >
      <div aria-hidden className="mb-1 text-48">
        {icon}
      </div>
      <h2 className="disp text-22 font-bold tracking-[-0.02em]">{title}</h2>
      {body && (
        <p className="max-w-[26rem] text-16 leading-[1.45] text-[var(--tx2)] [text-wrap:balance]">
          {body}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </motion.div>
  );
}

/** Something went wrong loading; says what and offers a retry. */
export function ErrorState({ msg, onRetry }: { msg: ReactNode; onRetry?: () => void }) {
  return (
    <EmptyState
      icon="⚠️"
      title={t.hub.common.errorTitle}
      body={msg}
      action={
        onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="glass min-h-12 rounded-2xl px-5 text-16 font-bold"
          >
            {t.hub.common.retry}
          </button>
        )
      }
    />
  );
}

/** Placeholder rows, shown only when loading takes longer than 150 ms so fast loads never flash. */
export function Skeleton({ rows = 4, h = 64 }: { rows?: number; h?: number }) {
  const [show, setShow] = useState(false);
  const rm = useReducedMotion();
  useEffect(() => {
    const id = setTimeout(() => setShow(true), 150);
    return () => clearTimeout(id);
  }, []);
  if (!show) return <div aria-busy="true" style={{ minHeight: rows * (h + 8) }} />;
  return (
    <div aria-busy="true" aria-label={t.hub.common.loading} className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-2xl bg-white/[.05]"
          style={{ height: h }}
        >
          {!rm && (
            <motion.div
              aria-hidden
              className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/[.06] to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '250%' }}
              transition={{ duration: 1.3, repeat: Infinity, ease: 'linear', delay: i * 0.08 }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/** A round chip for filters, scopes and ranges. */
export function Chip({
  on,
  children,
  onClick,
  ...rest
}: {
  on?: boolean;
  children: ReactNode;
  onClick: () => void;
  'aria-label'?: string;
}) {
  return (
    <motion.button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      transition={SPRING}
      className={`relative isolate inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-15 font-bold ${on ? 'text-ink-on-accent' : 'text-[var(--tx)]'}`}
      {...rest}
    >
      <span
        aria-hidden
        className={`absolute inset-0 -z-10 rounded-full ${on ? 'bg-[var(--accent)]' : 'bg-white/[.07] shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]'}`}
      />
      {children}
    </motion.button>
  );
}

/** A row of chips that scrolls sideways on a narrow screen. */
export function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="scroll-thin -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [[data-desk]_&]:mx-0 [[data-desk]_&]:flex-wrap [[data-desk]_&]:px-0"
    >
      {children}
    </div>
  );
}

/** A few overlapping avatars. */
export function AvatarStack({
  players,
  s = 26,
  max = 6,
}: {
  players: (Face & { name?: string })[];
  s?: number;
  max?: number;
}) {
  const shown = players.slice(0, max),
    more = players.length - shown.length;
  return (
    <span aria-hidden className="inline-flex items-center">
      {shown.map((p, i) => (
        <span
          key={i}
          className="relative grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-felt-950"
          style={{
            width: s,
            height: s,
            fontSize: Math.round(s * 0.55),
            background: p.color,
            marginLeft: i ? -s * 0.3 : 0,
          }}
        >
          <AvatarFill p={p} />
        </span>
      ))}
      {more > 0 && <span className="ml-1 text-13 font-bold text-[var(--tx2)]">+{more}</span>}
    </span>
  );
}
