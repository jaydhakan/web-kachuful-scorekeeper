import { forwardRef, type ReactNode } from 'react';

const TONE = {
  neg: 'text-[var(--neg-tx)]',
  gold: 'text-[var(--gold-tx)]',
  pos: 'text-[var(--pos)]',
  silver: 'text-[var(--medal-silver)]',
  /** The two sides of a team game (Spades, Ishaara). */
  sun: 'text-[var(--team-sun-tx)]',
  moon: 'text-[var(--team-moon-tx)]',
} as const;

/**
 * A verdict's look (SET, BOSTON, SOLD, TRAPPED, 1000): a bordered word in its colour on a near-solid plate. It is
 * visible as drawn; `stamp()` from `src/fx/stamp.ts` lands it (call it in a layout effect, so it never flashes first).
 */
export const Stamp = forwardRef<
  HTMLSpanElement,
  { children: ReactNode; tone?: keyof typeof TONE; className?: string }
>(function Stamp({ children, tone = 'neg', className = '' }, ref) {
  return (
    <span
      ref={ref}
      className={`disp pointer-events-none inline-block whitespace-nowrap rounded-[10px] border-[3px] border-current bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] px-3 py-1 font-extrabold uppercase tracking-[0.06em] ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
});
