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
  /** The large-screen UI (tablet and desktop). A phone on its side stays on the phone UI. */
  big: '(min-width: 768px) and (min-height: 501px)',
  /** Large screen, tablet held upright: a top bar instead of the rail. */
  tp: '(min-width: 768px) and (max-width: 1023.98px) and (min-height: 501px)',
  /** Large screen with a side rail (tablet on its side and up). */
  rail: '(min-width: 1024px) and (min-height: 501px)',
  /** Tablet on its side: rail and two columns. */
  tl: '(min-width: 1024px) and (max-width: 1279.98px) and (min-height: 501px)',
  /** Desktop: rail and three panes. */
  dt: '(min-width: 1280px) and (min-height: 501px)',
  /** Any mouse or trackpad attached, so keyboard hints are worth showing. */
  kbd: '(any-pointer: fine)',
} as const;

/** Height steps for `@h-*` container variants, in rem so large text compacts a layout sooner. */
export const CQ_HEIGHT = { short: '40rem', tiny: '32rem' } as const;
