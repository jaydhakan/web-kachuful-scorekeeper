import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { customRange, rangeFor, type Metric, type Range, type RangeKind } from '@/domain';
import { shortDay } from '@/lib/dates';
import { Icon } from './Icons';
import { Sheet } from './Sheet';
import { DateRangePicker } from './DateRangePicker';
import { EASE, PRESS, SPRING } from './motion';
import { t } from '@/strings';

const s = t.hub.stats;

const PRESETS: Exclude<RangeKind, 'custom'>[] = ['today', '7d', 'month', 'lastMonth', 'all'];

/** A button showing the current choice; it opens a sheet of the options. */
function PickButton({
  label,
  value,
  onClick,
}: {
  label: string;
  value: ReactNode;
  onClick: () => void;
}) {
  return (
    <m.button
      type="button"
      aria-haspopup="dialog"
      onClick={onClick}
      whileTap={PRESS}
      transition={SPRING}
      className="glass flex min-h-11 min-w-0 flex-1 items-center gap-1.5 !rounded-full py-1 pl-4 pr-3 text-left [[data-desk]_&]:flex-none"
    >
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-13 font-bold uppercase tracking-[0.06em] text-[var(--tx2)]">
          {label}
        </span>
        <span className="text-15 font-bold">{value}</span>
      </span>
      <span aria-hidden className="shrink-0 rotate-90 text-[var(--tx2)]">
        {Icon.chev}
      </span>
    </m.button>
  );
}

/** The options as full-width rows; the current one is ticked. */
function OptionSheet<T extends string>({
  title,
  options,
  value,
  onPick,
  onClose,
  groups,
  hints,
}: {
  title: string;
  options: [T, ReactNode][];
  value: T;
  onPick: (v: T) => void;
  onClose: () => void;
  /** Sections of the list, in order; options outside every group are left out. */
  groups?: { title: string; keys: T[] }[];
  /** A line under an option saying what it means. */
  hints?: Partial<Record<T, string>>;
}) {
  const label = new Map(options);
  const sections = groups ?? [{ title: '', keys: options.map(([v]) => v) }];
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {sections.map((g) => (
          <div
            key={g.title}
            role="group"
            aria-label={g.title || title}
            className="flex flex-col gap-1"
          >
            {g.title && (
              <h3 className="mono-label px-4 pt-1 text-12 uppercase text-[var(--tx2)]">
                {g.title}
              </h3>
            )}
            {g.keys.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={v === value}
                onClick={() => onPick(v)}
                className={`press flex min-h-12 items-center justify-between gap-3 rounded-2xl px-4 py-1.5 text-left ${v === value ? 'bg-ov/[.07] text-[var(--accent)]' : ''}`}
              >
                <span className="flex flex-col">
                  <span className="text-17 font-bold">{label.get(v)}</span>
                  {hints?.[v] && (
                    <span className="text-13 font-medium text-[var(--tx2)]">{hints[v]}</span>
                  )}
                </span>
                {v === value && <span aria-hidden>{Icon.check}</span>}
              </button>
            ))}
          </div>
        ))}
      </div>
    </Sheet>
  );
}

const SKILL: Metric[] = ['avgPerRound', 'accuracy', 'winRate'];

/** Today, 7 days, this month, last month, all time, or a custom range picked on a calendar. */
export function RangePick({
  value,
  onChange,
  tz,
}: {
  value: Range;
  onChange: (r: Range) => void;
  tz?: string;
}) {
  const [open, setOpen] = useState<'list' | 'days' | null>(null);
  const shown =
    value.kind === 'custom'
      ? `${shortDay(value.from)} – ${shortDay(value.to - 1)}`
      : s.ranges[value.kind];
  return (
    <>
      <PickButton label={s.range} value={shown} onClick={() => setOpen('list')} />
      <AnimatePresence>
        {open === 'list' && (
          <OptionSheet
            key="list"
            title={s.range}
            value={value.kind}
            options={[...PRESETS, 'custom' as const].map((k) => [k, s.ranges[k]])}
            onPick={(k) =>
              k === 'custom'
                ? setOpen('days')
                : (setOpen(null), onChange(rangeFor(k, Date.now(), tz)))
            }
            onClose={() => setOpen(null)}
          />
        )}
        {open === 'days' && (
          <DateRangePicker
            key="days"
            onClose={() => setOpen(null)}
            onPick={(a, b) => {
              setOpen(null);
              onChange(customRange(a, b, tz));
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/** What the board ranks by. */
export function MetricPick({ value, onChange }: { value: Metric; onChange: (m: Metric) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PickButton
        label={s.metric}
        value={shortened(
          s.metrics[value],
          (s.metricShort as Partial<Record<Metric, string>>)[value],
        )}
        onClick={() => setOpen(true)}
      />
      <AnimatePresence>
        {open && (
          <OptionSheet
            title={s.metric}
            value={value}
            options={(Object.keys(s.metrics) as Metric[]).map((k) => [k, s.metrics[k]])}
            groups={[
              { title: s.metricGroups.skill, keys: SKILL },
              {
                title: s.metricGroups.totals,
                keys: (Object.keys(s.metrics) as Metric[]).filter((k) => !SKILL.includes(k)),
              },
            ]}
            hints={s.metricHints}
            onPick={(k) => (setOpen(false), onChange(k))}
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/** A short label on screen where the full one would wrap; screen readers still hear the full one. */
const shortened = (full: string, short?: string): ReactNode =>
  short ? (
    <>
      <span aria-hidden>{short}</span>
      <span className="sr-only">{full}</span>
    </>
  ) : (
    full
  );

/** A number with what it is. */
export function StatTile({
  label,
  short,
  value,
  sub,
}: {
  label: string;
  short?: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="glass flex min-h-[5.5rem] flex-col justify-between gap-1 p-3.5">
      <div className="text-13 font-bold uppercase tracking-[0.08em] text-[var(--tx2)]">
        {shortened(label, short)}
      </div>
      <div className="disp text-28 font-extrabold leading-none tracking-[-0.02em]">{value}</div>
      {sub && <div className="text-13 text-[var(--tx2)]">{sub}</div>}
    </div>
  );
}

export const TileGrid = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-2 gap-2 md:grid-cols-3 land:grid-cols-3 wide:grid-cols-3 [[data-desk]_&]:grid-cols-4">
    {children}
  </div>
);

/** A line of values, revealed left to right. */
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const rm = useReducedMotion();
  if (values.length < 2) return null;
  const W = 300,
    H = 80;
  const lo = Math.min(0, ...values),
    hi = Math.max(0, ...values);
  const x = (i: number) => (i * W) / (values.length - 1);
  const y = (v: number) => H - ((v - lo) / (hi - lo || 1)) * H;
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  return (
    <div className="relative overflow-hidden" role="img" aria-label={label}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-24 w-full">
        <line x1="0" x2={W} y1={y(0)} y2={y(0)} className="stroke-ov/15" strokeDasharray="4 4" />
        <path
          d={d}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* A cover that slides away: the line appears to draw, using transform only. */}
      {!rm && (
        <m.div
          aria-hidden
          className="absolute inset-0 origin-right bg-felt-950"
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
        />
      )}
    </div>
  );
}

export interface Bar {
  label: ReactNode;
  value: number;
  /** 0–1 */
  share: number;
  note?: string;
  /** Too few rounds behind it to mean much: drawn faded. */
  low?: boolean;
}

/** Horizontal bars that grow in. */
export function Bars({ bars, label }: { bars: Bar[]; label: string }) {
  const rm = useReducedMotion();
  return (
    <ul aria-label={label} className="flex flex-col gap-1.5">
      {bars.map((b, i) => (
        <li
          key={i}
          className={`grid grid-cols-[6rem_minmax(0,1fr)_5.5rem] items-center gap-2 text-14 ${b.low ? 'opacity-50' : ''}`}
        >
          <span className="whitespace-nowrap font-bold">{b.label}</span>
          <span className="relative h-3 overflow-hidden rounded-full bg-ov/[.07]">
            <m.span
              className="absolute inset-0 origin-left rounded-full bg-[var(--accent)]"
              initial={rm ? false : { scaleX: 0 }}
              animate={{ scaleX: Math.max(0.02, b.share) }}
              transition={{ ...SPRING, delay: rm ? 0 : i * 0.03 }}
            />
          </span>
          <span className="text-right text-[var(--tx2)]">{b.note ?? b.value}</span>
        </li>
      ))}
    </ul>
  );
}

/** A year of days as small squares, darker for more rounds. */
export function Heatmap({ days, year }: { days: Record<string, number>; year: number }) {
  const rm = useReducedMotion();
  const start = new Date(year, 0, 1);
  const lead = start.getDay();
  const n = Math.round((new Date(year + 1, 0, 1).getTime() - start.getTime()) / 864e5);
  const max = Math.max(1, ...Object.values(days));
  const cells = Array.from({ length: lead + n }, (_, i) => {
    if (i < lead) return null;
    const d = new Date(year, 0, 1 + i - lead);
    const k = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { k, v: days[k] ?? 0 };
  });
  const total = Object.entries(days)
    .filter(([k]) => k.startsWith(String(year)))
    .reduce((a, [, v]) => a + v, 0);
  return (
    <div className="scroll-thin overflow-x-auto pb-1">
      <div
        role="img"
        aria-label={s.heatmap(year, total)}
        className="grid w-max grid-flow-col grid-rows-7 gap-[3px]"
      >
        {cells.map((c, i) =>
          c ? (
            <m.span
              key={c.k}
              title={`${c.k}: ${c.v}`}
              initial={rm ? false : { opacity: 0 }}
              animate={{ opacity: c.v ? 0.25 + 0.75 * (c.v / max) : 1 }}
              transition={{ duration: 0.3, delay: rm ? 0 : Math.min(0.8, i * 0.0025) }}
              className={`h-3 w-3 rounded-[3px] ${c.v ? 'bg-[var(--accent)]' : 'bg-ov/[.06]'}`}
            />
          ) : (
            <span key={'x' + i} className="h-3 w-3" />
          ),
        )}
      </div>
    </div>
  );
}

/** Up or down since the previous window. */
export function RankDelta({ d }: { d: number | null }) {
  if (!d) return null;
  return (
    <m.span
      initial={{ opacity: 0, y: d > 0 ? 6 : -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      aria-label={d > 0 ? s.up(d) : s.down(-d)}
      className={`mt-0.5 text-center text-13 font-extrabold leading-none ${d > 0 ? 'text-[var(--pos)]' : 'text-[var(--neg-tx)]'}`}
    >
      {d > 0 ? '▲' : '▼'}
      {Math.abs(d)}
    </m.span>
  );
}

/** How far along a count is. */
export const Progress = ({
  v,
  of,
  fill = 'bg-[var(--tx2)]',
}: {
  v: number;
  of: number;
  fill?: string;
}) => (
  <span className="relative block h-1.5 w-full overflow-hidden rounded-full bg-ov/[.08]">
    <span
      className={`absolute inset-0 origin-left rounded-full ${fill}`}
      style={{ transform: `scaleX(${Math.min(1, v / of)})` }}
    />
  </span>
);

/** A share of a whole as a gold ring (0 to 1); the number it stands for goes beside or inside it. */
export function ProgressRing({
  share,
  className = 'h-16 w-16',
}: {
  share: number;
  className?: string;
}) {
  const R = 26,
    C = 2 * Math.PI * R;
  return (
    <svg aria-hidden viewBox="0 0 64 64" className={`shrink-0 -rotate-90 ${className}`}>
      <circle cx="32" cy="32" r={R} fill="none" strokeWidth="6" className="stroke-ov/[.1]" />
      <circle
        cx="32"
        cy="32"
        r={R}
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${C * Math.min(1, share)} ${C}`}
        className="stroke-gold"
      />
    </svg>
  );
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;
