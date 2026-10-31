/**
 * Page layouts (docs/RESPONSIVE-PLAN.md §4.1). Tailwind's `screens` and `useMediaQuery` both read these, so the
 * layout CSS and the motion that depends on it can never disagree.
 */
const land = '(orientation: landscape) and (max-height: 500px)';
const wide = '(min-width: 768px) and (orientation: landscape) and (min-height: 501px)';

export const MQ = {
  /** Phone on its side, or any short window: two compact panes. */
  land,
  /** Tablet held upright: one wider centred column. */
  md: '(min-width: 768px) and (orientation: portrait)',
  /** Tablet on its side, laptop, desktop: two panes, centred. */
  wide,
  /** Either two-pane layout, for rules that are the same in both. */
  pane: `${land}, ${wide}`,
  /** Room for a centred modal or side panel instead of a bottom sheet (md or wide). */
  roomy: '(min-width: 768px) and (min-height: 501px)',
  /** Mouse or trackpad. */
  fine: '(pointer: fine)',
} as const;

/** Height steps for `@h-*` container variants, in rem so large text compacts a layout sooner. */
export const CQ_HEIGHT = { short: '40rem', tiny: '32rem' } as const;
