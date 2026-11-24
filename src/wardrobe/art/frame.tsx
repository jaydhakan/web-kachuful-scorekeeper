import { cloth, FACE, type ItemArt } from './types';

const { cx, cy } = FACE;
const dot = (a: number, r: number, s: number) => {
  const x = cx + Math.cos(a) * r,
    y = cy + Math.sin(a) * r;
  return `M${x} ${y - s}l${s} ${s}l${-s} ${s}l${-s} ${-s}Z`;
};

/** Ghera: the ring round the face disc (r 22). At seat size only its main colour shows, as a ring (`ring.ts`). */
export const FRAME: Record<string, ItemArt> = {
  gold_ring: {
    draw: () => (
      <>
        <circle
          cx={cx}
          cy={cy}
          r={23.6}
          style={{ fill: 'none', stroke: 'var(--medal-gold)', strokeWidth: 2.6 }}
        />
        <circle
          cx={cx}
          cy={cy}
          r={21.9}
          style={{ fill: 'none', stroke: 'var(--medal-gold-hi)', strokeWidth: 0.6 }}
        />
        <circle
          cx={cx}
          cy={cy}
          r={25.3}
          style={{ fill: 'none', stroke: 'var(--medal-gold-lo)', strokeWidth: 0.6 }}
        />
        <path
          d={[0, 1, 2, 3].map((k) => dot((k * Math.PI) / 2 - Math.PI / 2, 23.6, 1.7)).join('')}
          style={{ fill: 'var(--medal-gold-hi)', stroke: 'var(--medal-gold-lo)', strokeWidth: 0.4 }}
        />
      </>
    ),
  },
  marigold_frame: {
    draw: () => (
      <>
        {Array.from({ length: 16 }, (_, k) => {
          const a = (k * Math.PI) / 8;
          return (
            <circle
              key={k}
              cx={cx + Math.cos(a) * 24}
              cy={cy + Math.sin(a) * 24}
              r={2.9}
              style={{
                fill: k % 2 ? cloth(1) : cloth(2),
                stroke: 'var(--cloth-line)',
                strokeWidth: 0.5,
              }}
            />
          );
        })}
      </>
    ),
  },
  stumps_frame: {
    draw: () => (
      <>
        <circle
          cx={cx}
          cy={cy}
          r={23.5}
          style={{ fill: 'none', stroke: cloth(5), strokeWidth: 2 }}
        />
        {[-6, 0, 6].map((d) => (
          <path
            key={d}
            d={`M${cx + d} ${cy + 14}V${cy + 30}`}
            style={{ stroke: cloth(5), strokeWidth: 2.2, strokeLinecap: 'round' }}
          />
        ))}
        <path
          d={`M${cx - 7} ${cy + 13.5}H${cx + 7}`}
          style={{ stroke: cloth(1), strokeWidth: 1.4, strokeLinecap: 'round' }}
        />
      </>
    ),
  },
  raindrop_frame: {
    draw: () => (
      <>
        <circle
          cx={cx}
          cy={cy}
          r={23.5}
          style={{ fill: 'none', stroke: cloth(7), strokeWidth: 1.8 }}
        />
        {Array.from({ length: 8 }, (_, k) => {
          const a = (k * Math.PI) / 4 + Math.PI / 8;
          const x = cx + Math.cos(a) * 23.5,
            y = cy + Math.sin(a) * 23.5;
          return (
            <path
              key={k}
              d={`M${x} ${y - 3.2}Q${x + 2.4} ${y + 0.4} ${x} ${y + 2}Q${x - 2.4} ${y + 0.4} ${x} ${y - 3.2}Z`}
              style={{ fill: cloth(7), stroke: 'var(--cloth-line)', strokeWidth: 0.4 }}
            />
          );
        })}
      </>
    ),
  },
  grid_frame: {
    draw: () => (
      <>
        <circle
          cx={cx}
          cy={cy}
          r={23.5}
          style={{ fill: 'none', stroke: cloth(4), strokeWidth: 2.4 }}
        />
        <circle
          cx={cx}
          cy={cy}
          r={23.5}
          style={{ fill: 'none', stroke: cloth(5), strokeWidth: 2.4, strokeDasharray: '0.7 4' }}
        />
      </>
    ),
  },
  frost_frame: {
    draw: () => (
      <>
        <circle
          cx={cx}
          cy={cy}
          r={23.5}
          style={{ fill: 'none', stroke: cloth(5), strokeWidth: 1.6 }}
        />
        {Array.from({ length: 6 }, (_, k) => {
          const a = (k * Math.PI) / 3 - Math.PI / 2;
          const x = cx + Math.cos(a) * 23.5,
            y = cy + Math.sin(a) * 23.5;
          return (
            <path
              key={k}
              d={`M${x - 3} ${y}H${x + 3}M${x} ${y - 3}V${y + 3}M${x - 2} ${y - 2}L${x + 2} ${y + 2}M${x + 2} ${y - 2}L${x - 2} ${y + 2}`}
              style={{ stroke: cloth(7), strokeWidth: 0.8, strokeLinecap: 'round' }}
            />
          );
        })}
      </>
    ),
  },
  neon_ring: {
    tones: [
      [8, 7],
      [7, 3],
      [4, 1],
    ],
    draw: (t) => (
      <>
        <circle
          cx={cx}
          cy={cy}
          r={24}
          style={{ fill: 'none', stroke: t.main, strokeWidth: 4, opacity: 0.35 }}
        />
        <circle cx={cx} cy={cy} r={24} style={{ fill: 'none', stroke: t.main, strokeWidth: 1.8 }} />
        <circle cx={cx} cy={cy} r={24} style={{ fill: 'none', stroke: t.trim, strokeWidth: 0.5 }} />
      </>
    ),
  },
};
