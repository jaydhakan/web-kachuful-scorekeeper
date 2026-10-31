import { motion, useReducedMotion } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { customRange, rangeFor, type Metric, type Range, type RangeKind } from '@/domain';
import { shortDay } from '@/lib/dates';
import { Chip, ChipRow } from './Page';
import { DateRangePicker } from './DateRangePicker';
import { EASE, SPRING } from './motion';
import { t } from '@/strings';

const s = t.hub.stats;

const PRESETS: Exclude<RangeKind, 'custom'>[] = ['today', '7d', 'month', 'lastMonth', 'all'];

/** Today, 7 days, this month, last month, all time, or a custom range picked on a calendar. */
export function RangeChips({
  value,
  onChange,
  tz,
}: {
  value: Range;
  onChange: (r: Range) => void;
  tz?: string;
}) {
  const [pick, setPick] = useState(false);
  return (
    <>
      <ChipRow label={s.range}>
        {PRESETS.map((k) => (
          <Chip key={k} on={value.kind === k} onClick={() => onChange(rangeFor(k, Date.now(), tz))}>
            {s.ranges[k]}
          </Chip>
        ))}
        <Chip on={value.kind === 'custom'} onClick={() => setPick(true)}>
          {value.kind === 'custom'
            ? `${shortDay(value.from)} – ${shortDay(value.to - 1)}`
            : s.ranges.custom}
        </Chip>
      </ChipRow>
      {pick && (
        <DateRangePicker
          onClose={() => setPick(false)}
          onPick={(a, b) => {
            setPick(false);
            onChange(customRange(a, b, tz));
          }}
        />
      )}
    </>
  );
}

export function MetricChips({ value, onChange }: { value: Metric; onChange: (m: Metric) => void }) {
  return (
    <ChipRow label={s.metric}>
      {(Object.keys(s.metrics) as Metric[]).map((m) => (
        <Chip key={m} on={value === m} onClick={() => onChange(m)}>
          {s.metrics[m]}
        </Chip>
      ))}
    </ChipRow>
  );
}

/** A number with what it is. */
export function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="glass flex min-h-[5.5rem] flex-col justify-between gap-1 p-3.5">
      <div className="text-13 font-bold uppercase tracking-[0.08em] text-[var(--tx2)]">{label}</div>
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
        <line x1="0" x2={W} y1={y(0)} y2={y(0)} className="stroke-white/15" strokeDasharray="4 4" />
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
        <motion.div
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
}

/** Horizontal bars that grow in. */
export function Bars({ bars, label }: { bars: Bar[]; label: string }) {
  const rm = useReducedMotion();
  return (
    <ul aria-label={label} className="flex flex-col gap-1.5">
      {bars.map((b, i) => (
        <li
          key={i}
          className="grid grid-cols-[4.5rem_minmax(0,1fr)_3.5rem] items-center gap-2 text-14"
        >
          <span className="font-bold">{b.label}</span>
          <span className="relative h-3 overflow-hidden rounded-full bg-white/[.07]">
            <motion.span
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
            <motion.span
              key={c.k}
              title={`${c.k}: ${c.v}`}
              initial={rm ? false : { opacity: 0 }}
              animate={{ opacity: c.v ? 0.25 + 0.75 * (c.v / max) : 1 }}
              transition={{ duration: 0.3, delay: rm ? 0 : Math.min(0.8, i * 0.0025) }}
              className={`h-3 w-3 rounded-[3px] ${c.v ? 'bg-[var(--accent)]' : 'bg-white/[.06]'}`}
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
  if (!d) return <span aria-hidden className="w-7" />;
  return (
    <motion.span
      initial={{ opacity: 0, y: d > 0 ? 6 : -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      aria-label={d > 0 ? s.up(d) : s.down(-d)}
      className={`w-7 text-center text-13 font-extrabold ${d > 0 ? 'text-[var(--pos)]' : 'text-[var(--neg-tx)]'}`}
    >
      {d > 0 ? '▲' : '▼'}
      {Math.abs(d)}
    </motion.span>
  );
}

/** How far along a count is. */
export const Progress = ({ v, of }: { v: number; of: number }) => (
  <span className="relative block h-1.5 w-full overflow-hidden rounded-full bg-white/[.08]">
    <span
      className="absolute inset-0 origin-left rounded-full bg-[var(--tx2)]"
      style={{ transform: `scaleX(${Math.min(1, v / of)})` }}
    />
  </span>
);

export const pct = (x: number) => `${Math.round(x * 100)}%`;
