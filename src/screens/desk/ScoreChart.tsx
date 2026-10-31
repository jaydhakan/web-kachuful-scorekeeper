import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { pts, type Game, type Round } from '@/domain';
import { fmt } from '@/lib/format';
import { EASE } from '@/components/ui/motion';
import { t } from '@/strings';

const PAD = { l: 40, r: 16, t: 12, b: 28 };
const STEPS = [10, 20, 40, 50, 100, 200, 250, 500, 1000];

/** A tick step that gives at most five gridlines over the range. */
const niceStep = (span: number) => STEPS.find((s) => span / s <= 4) ?? 1000;

/** Running totals after each round, one series per player. */
export function series(g: Game, rounds: Round[]) {
  return g.players.map((p) => {
    let tot = 0;
    return rounds.map((r) => (tot += pts(r, p.id) ?? 0));
  });
}

interface ScoreChartProps {
  g: Game;
  rounds: Round[];
  /** Draw the lines in on mount. */
  draw?: boolean;
}

/**
 * Total score after each round, as one line per player. Drawn at its real pixel size (measured), so axis text stays
 * 13px whatever the box; hovering or focusing shows the totals at a round.
 */
export function ScoreChart({ g, rounds, draw = true }: ScoreChartProps) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 640, h: 220 });
  const [hi, setHi] = useState<number | null>(null);
  const rm = useReducedMotion();
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 0 && height > 0) setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const s = series(g, rounds),
    n = rounds.length;
  const all = s.flat().concat(0);
  const step = niceStep(Math.max(1, Math.max(...all) - Math.min(...all)));
  const lo = Math.floor(Math.min(...all) / step) * step,
    hi2 = Math.ceil(Math.max(...all) / step) * step || step;
  const { w, h } = size;
  const iw = Math.max(1, w - PAD.l - PAD.r),
    ih = Math.max(1, h - PAD.t - PAD.b);
  const x = (i: number) => PAD.l + (n <= 1 ? iw / 2 : (i * iw) / (n - 1));
  const y = (v: number) => PAD.t + ((hi2 - v) / (hi2 - lo || 1)) * ih;
  const ticks: number[] = [];
  for (let v = lo; v <= hi2; v += step) ticks.push(v);
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 56))));
  const last = s.map((row) => row[n - 1] ?? 0);
  const lead = Math.max(...last);
  const pick = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || !n) return;
    const i = n <= 1 ? 0 : Math.round(((clientX - r.left - PAD.l) / iw) * (n - 1));
    setHi(Math.max(0, Math.min(n - 1, i)));
  };
  const at = hi ?? n - 1;
  const order = g.players.map((p, k) => ({ p, v: s[k][at] ?? 0 })).sort((a, b) => b.v - a.v);
  return (
    <div
      ref={box}
      className="relative min-h-0 w-full flex-1"
      onPointerMove={(e) => pick(e.clientX)}
      onPointerLeave={() => setHi(null)}
    >
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={t.desk.summary.chart(g.players.length)}
        className="absolute inset-0 overflow-visible"
      >
        <g className="stroke-white/[.08]">
          {ticks.map((v) => (
            <line
              key={v}
              x1={PAD.l}
              x2={w - PAD.r}
              y1={y(v)}
              y2={y(v)}
              className={v === 0 ? 'stroke-white/30' : ''}
              strokeDasharray={v === 0 ? '4 5' : undefined}
            />
          ))}
        </g>
        <g className="fill-[var(--tx2)] text-13" textAnchor="end">
          {ticks.map((v) => (
            <text key={v} x={PAD.l - 8} y={y(v) + 4}>
              {fmt(v)}
            </text>
          ))}
        </g>
        <g className="fill-[var(--tx2)] text-13" textAnchor="middle">
          {rounds.map((r, i) =>
            i % every === 0 || i === n - 1 ? (
              <text key={r.index} x={x(i)} y={h - 8}>
                {t.desk.summary.axis(r.index + 1)}
              </text>
            ) : null,
          )}
        </g>
        {hi != null && (
          <line
            x1={x(hi)}
            x2={x(hi)}
            y1={PAD.t}
            y2={PAD.t + ih}
            className="stroke-white/25"
            strokeDasharray="3 4"
          />
        )}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {s.map((row, k) => {
            const d = row.map((v, i) => `${i ? 'L' : 'M'}${x(i)} ${y(v)}`).join('');
            const top = last[k] === lead;
            return (
              <motion.path
                key={g.players[k].id}
                d={d}
                stroke={g.players[k].color}
                strokeWidth={top ? 4 : 2.75}
                initial={draw && !rm ? { pathLength: 0, opacity: 0 } : false}
                animate={{ pathLength: 1, opacity: hi == null || top ? 1 : 0.85 }}
                transition={{ pathLength: { duration: 1.1, ease: EASE, delay: k * 0.06 } }}
              />
            );
          })}
        </g>
        <g className="stroke-felt-950" strokeWidth={2}>
          {s.map((row, k) => (
            <motion.circle
              key={g.players[k].id}
              cx={x(at)}
              cy={y(row[at] ?? 0)}
              r={last[k] === lead ? 6 : 5}
              fill={g.players[k].color}
              initial={draw && !rm ? { scale: 0 } : false}
              animate={{ scale: 1 }}
              transition={{ delay: draw && !rm ? 1 + k * 0.05 : 0, duration: 0.3, ease: EASE }}
            />
          ))}
        </g>
      </svg>
      {hi != null && (
        <div
          aria-hidden
          className="glass pointer-events-none absolute top-2 z-10 min-w-36 !rounded-xl !bg-sheet/95 px-3 py-2 text-13"
          style={x(hi) > w / 2 ? { right: w - x(hi) + 12 } : { left: x(hi) + 12 }}
        >
          <div className="mb-1 font-bold text-[var(--tx2)]">
            {t.desk.summary.axis(rounds[hi].index + 1)}
          </div>
          {order.map(({ p, v }) => (
            <div key={p.id} className="flex items-center gap-2">
              <i className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
              <span className="flex-1">{p.name}</span>
              <b className="tick">{fmt(v)}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Colour key for the chart. */
export const ChartLegend = ({ g }: { g: Game }) => (
  <ul className="flex flex-wrap gap-x-3.5 gap-y-1 text-13 text-[var(--tx2)]">
    {g.players.map((p) => (
      <li key={p.id} className="inline-flex items-center gap-1.5">
        <i aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
        {p.name}
      </li>
    ))}
  </ul>
);
