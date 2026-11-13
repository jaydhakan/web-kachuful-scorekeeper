import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useEffect, useId, useState, type CSSProperties } from 'react';
import { useRovingFocus } from '@/hooks/useRovingFocus';
import { t } from '@/strings';
import { Edge } from './Edge';
import { Icon } from './Icons';
import { EASE, PRESS_SM, REDUCED, SPRING_POP } from './motion';
import { PrimaryButton } from './PrimaryButton';
import { shakeKF } from './stagger';

export interface BidRange {
  min?: number;
  max: number;
  step?: number;
}

/** Every bid in the range, lowest first. */
export const bidValues = ({ min = 0, max, step = 1 }: BidRange): number[] =>
  Array.from({ length: Math.max(0, Math.floor((max - min) / step) + 1) }, (_, i) => min + i * step);

/** `v` on the range's grid: snapped down to a step from `min`, then held between `min` and the highest step. */
export const snapBid = (v: number, { min = 0, max, step = 1 }: BidRange): number => {
  const top = min + Math.floor((max - min) / step) * step;
  return Math.min(top, Math.max(min, min + Math.floor((v - min) / step) * step));
};

/** `v` moved by `delta` and kept on the range. */
export const stepBid = (v: number, delta: number, range: BidRange): number =>
  snapBid(v + delta, range);

/** One row up to six pills, else two rows, so the dock stays short; never more than six across. */
const pillColumns = (pills: number) => Math.min(6, pills <= 6 ? pills : Math.ceil(pills / 2));
/** Rows of keys: 0–9 is two rows of five (as on the boards), 0–10 two rows of six; a tablet held upright uses one row. */
const keyCols = (keys: number) => (keys <= 5 ? keys : keys <= 10 ? 5 : 6);

/** A key turning locked or free: its two materials cross-fade for this long (seconds), then the key wears the new one. */
const LOCK_FADE = 0.2;
const PANE_NO =
  'cursor-not-allowed border border-dashed border-ov/30 bg-ov/[.03] text-[var(--dis)]';

interface BidKeysProps extends BidRange {
  /** The group's accessible name ("Bid for Riya"). */
  label: string;
  /** The picked key. */
  selected?: number | null;
  /** A bid already saved, outlined while another key is picked (`pane` only). */
  saved?: number | null;
  /** Keys that can be tapped but are refused: struck through and described by `describedBy`. */
  locked?: number[];
  describedBy?: string;
  /** The key that shakes once, after a refused tap. */
  shake?: number | null;
  /** `el` is the key, for a flight to the seat. */
  onPick: (v: number, el: HTMLElement) => void;
  /** `dock`: the phone's pill row above the button; `pane`: the large screen's tiles. */
  look?: 'dock' | 'pane';
  /** The selection's shared layout id, unique on screen. */
  layoutId?: string;
  keyLabel?: (v: number, locked: boolean) => string;
}

/** A small range of bids as keys, one per value: arrow keys move, Enter or a tap picks. */
export function BidKeys({
  label,
  selected,
  saved,
  locked = [],
  describedBy,
  shake,
  onPick,
  look = 'dock',
  layoutId = look === 'dock' ? 'pillsel' : 'ws-key',
  keyLabel = (v, lock) => (lock ? t.bidding.locked(v) : t.bidding.bid(v)),
  ...range
}: BidKeysProps) {
  const values = bidValues(range);
  const roving = useRovingFocus({
    selected: selected == null ? -1 : values.indexOf(selected),
    columns: 'auto',
    orientation: 'grid',
  });
  const keys = values.length;
  const cols = pillColumns(keys);
  const dock = look === 'dock';
  const rm = useReducedMotion();
  const fade = rm ? REDUCED : LOCK_FADE;
  // Keys whose lock just changed while on screen (never on mount): set while rendering, so no frame shows a jump.
  const lockKey = locked.join();
  const [seen, setSeen] = useState(lockKey);
  const [turning, setTurning] = useState<number[]>([]);
  if (seen !== lockKey) {
    const was = seen ? seen.split(',').map(Number) : [];
    setSeen(lockKey);
    setTurning(values.filter((v) => was.includes(v) !== locked.includes(v)));
  }
  useEffect(() => {
    if (!turning.length) return;
    const id = setTimeout(() => setTurning([]), fade * 1000 + 20);
    return () => clearTimeout(id);
  }, [turning, fade]);
  const mat = (lock: boolean, sel: boolean) =>
    dock
      ? lock
        ? 'mat-key-no'
        : sel
          ? 'mat-key text-ink-on-accent'
          : 'mat-key'
      : lock
        ? PANE_NO
        : sel
          ? 'text-ink-on-accent'
          : 'glass';
  return (
    <div
      role="group"
      aria-label={label}
      {...roving.group}
      style={
        dock
          ? // At most `cols` across and each at least 44px: the gap gives way before a pill gets smaller.
            ({
              '--g': `max(0px, min(0.5rem, calc((100% - ${cols} * 2.75rem) / ${cols - 1})))`,
              columnGap: 'var(--g)',
              gridTemplateColumns: `repeat(auto-fill, minmax(max(2.75rem, calc((100% - ${cols - 1} * var(--g)) / ${cols})), 1fr))`,
            } as CSSProperties)
          : ({ '--kc': keyCols(keys), '--kt': keys } as CSSProperties)
      }
      className={
        dock
          ? 'grid justify-items-center gap-y-2 @h-short:gap-y-1.5 @h-tiny:gap-y-1'
          : 'grid gap-2.5 [grid-template-columns:repeat(var(--kt),minmax(0,1fr))] tp:gap-1.5 rail:[grid-template-columns:repeat(var(--kc),minmax(0,1fr))]'
      }
    >
      {values.map((v, i) => {
        const lock = locked.includes(v),
          sel = selected === v,
          kept = !dock && saved === v && !sel,
          turn = turning.includes(v),
          // While it turns the key is bare and two layers carry the old and new material, so only opacity moves.
          own = turn ? (lock && !dock ? 'cursor-not-allowed' : '') : mat(lock, sel),
          round = dock ? 'rounded-[18px]' : 'rounded-2xl';
        return (
          <m.button
            key={v}
            type="button"
            {...(!dock && { 'data-bid-key': v })}
            aria-label={keyLabel(v, lock)}
            aria-pressed={sel}
            aria-disabled={lock || undefined}
            aria-describedby={lock ? describedBy : undefined}
            {...roving.item(i)}
            animate={shake === v ? shakeKF : { x: 0 }}
            whileHover={dock || lock ? undefined : { y: -3 }}
            whileTap={PRESS_SM}
            onClick={(e) => onPick(v, e.currentTarget)}
            className={
              dock
                ? `disp relative grid aspect-square min-h-11 w-full min-w-11 max-w-[60px] @h-short:max-w-12 @h-tiny:max-w-11 place-items-center rounded-[18px] text-22 font-bold tracking-[-0.02em] ${own}`
                : `disp relative grid h-[76px] min-w-0 place-items-center rounded-2xl text-30 font-extrabold dt:h-[60px] dt:text-26 tl:text-32 ${own}`
            }
          >
            {turn &&
              [!lock, lock].map((to, at) => (
                <m.span
                  key={String(to)}
                  aria-hidden
                  data-lock-fade={to ? 'in' : 'out'}
                  initial={{ opacity: at ? 0 : 1 }}
                  animate={{ opacity: at ? 1 : 0 }}
                  transition={{ duration: fade, ease: EASE }}
                  className={`pointer-events-none absolute inset-0 grid place-items-center ${round} ${mat(to, false)}`}
                >
                  <span className={to && !dock ? 'line-through' : ''}>{v}</span>
                </m.span>
              ))}
            {kept && <Edge tone="saved" />}
            {sel &&
              (dock ? (
                <m.span
                  layoutId={layoutId}
                  transition={SPRING_POP}
                  className="mat-key-on absolute inset-0 rounded-[18px]"
                />
              ) : (
                <m.span
                  layoutId={layoutId}
                  transition={SPRING_POP}
                  aria-hidden
                  className="absolute inset-0 rounded-2xl bg-accent-gradient shadow-[0_0_0_3px_var(--glow),0_10px_26px_-6px_var(--accent)]"
                />
              ))}
            {/* On the dock the forbidden bid is struck through by its material, not a lock (reference audit fix). */}
            <span
              className={`relative ${lock && !dock ? 'line-through' : ''} ${turn ? 'opacity-0' : ''}`}
            >
              {v}
            </span>
            <AnimatePresence initial={false}>
              {lock && !dock && (
                <m.span
                  key="lock"
                  data-lock
                  initial={rm ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: rm ? REDUCED : 0.22, ease: EASE }}
                  className="absolute right-1.5 top-1.5 text-[var(--warn)]"
                >
                  {Icon.lock}
                </m.span>
              )}
            </AnimatePresence>
          </m.button>
        );
      })}
    </div>
  );
}

interface BidStepperProps extends BidRange {
  value: number;
  onChange: (v: number) => void;
  /** Quick changes, e.g. [-5, 5, 10, 25]; a change that would leave the range is disabled. */
  quick?: number[];
  /** The confirm button's text ("Riya · 180"); without it there is no button. */
  confirmLabel?: string;
  onConfirm?: (v: number) => void;
  /** The amount's accessible name. */
  label?: string;
  className?: string;
}

const sign = (d: number) => (d > 0 ? `+${d}` : `−${-d}`);

/**
 * A large range of bids (150–250 in fives) as one amount with quick changes. The amount is a spin button: arrow keys
 * step, Page keys take the largest quick change, Home and End jump to the ends.
 */
export function BidStepper({
  value,
  onChange,
  quick = [],
  confirmLabel,
  onConfirm,
  label = t.keypad.amount,
  className = '',
  ...range
}: BidStepperProps) {
  const { min = 0, max, step = 1 } = range;
  const v = snapBid(value, range);
  const id = useId();
  const big = Math.max(step, ...quick.map(Math.abs));
  const set = (to: number) => {
    const next = snapBid(to, range);
    if (next !== v) onChange(next);
  };
  const keys: Record<string, number> = {
    ArrowUp: v + step,
    ArrowRight: v + step,
    ArrowDown: v - step,
    ArrowLeft: v - step,
    PageUp: v + big,
    PageDown: v - big,
    Home: min,
    End: max,
  };
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div
        id={id}
        role="spinbutton"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={snapBid(max, range)}
        aria-valuenow={v}
        onKeyDown={(e) => {
          if (!(e.key in keys) || e.altKey || e.ctrlKey || e.metaKey) return;
          e.preventDefault();
          set(keys[e.key]);
        }}
        className="disp tick rounded-2xl text-center text-52 font-extrabold leading-none tracking-[-0.03em]"
      >
        <m.span
          key={v}
          initial={{ opacity: 0.4, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING_POP}
          className="inline-block"
        >
          {v}
        </m.span>
      </div>
      {quick.length > 0 && (
        <div
          role="group"
          aria-label={t.keypad.quick}
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${quick.length}, minmax(2.75rem, 1fr))` }}
        >
          {quick.map((d) => {
            const to = snapBid(v + d, range);
            return (
              <m.button
                key={d}
                type="button"
                aria-label={t.keypad.change(d)}
                aria-controls={id}
                disabled={to === v}
                whileTap={PRESS_SM}
                onClick={() => set(v + d)}
                className="mat-key disp tick grid min-h-12 place-items-center rounded-[18px] text-20 font-bold disabled:opacity-40"
              >
                {sign(d)}
              </m.button>
            );
          })}
        </div>
      )}
      {confirmLabel && onConfirm && (
        <PrimaryButton className="w-full" onClick={() => onConfirm(v)}>
          {confirmLabel}
        </PrimaryButton>
      )}
    </div>
  );
}
