import { cloth, type ItemArt } from './types';

/** Roshni: behind everything, across the whole 100×100 box (centred on the face disc at 50,42). */
export const AURA: Record<string, ItemArt> = {
  smoke: {
    tones: [
      [6, 5],
      [3, 5],
    ],
    draw: (t) => (
      <g style={{ fill: t.main, opacity: 0.35 }}>
        <circle cx={22} cy={50} r={14} />
        <circle cx={78} cy={50} r={14} />
        <circle cx={30} cy={24} r={12} />
        <circle cx={70} cy={24} r={12} />
        <circle cx={50} cy={12} r={12} />
      </g>
    ),
  },
  sunburst: {
    tones: [
      [1, 5],
      [8, 5],
    ],
    draw: (t) => (
      <g style={{ fill: t.main, opacity: 0.45 }}>
        {Array.from({ length: 12 }, (_, k) => {
          const a = (k * Math.PI) / 6;
          const p = (r: number, d: number) =>
            `${50 + Math.cos(a + d) * r} ${42 + Math.sin(a + d) * r}`;
          return <path key={k} d={`M${p(26, -0.09)}L${p(48, 0)}L${p(26, 0.09)}Z`} />;
        })}
      </g>
    ),
  },
  diya_glow: {
    draw: () => (
      <>
        <circle cx={50} cy={42} r={40} style={{ fill: cloth(1), opacity: 0.18 }} />
        <circle cx={50} cy={42} r={32} style={{ fill: cloth(1), opacity: 0.2 }} />
        {[18, 82].map((x) => (
          <g key={x}>
            <path
              d={`M${x - 6} 70Q${x} 77 ${x + 6} 70Z`}
              style={{ fill: cloth(2), stroke: 'var(--cloth-line)', strokeWidth: 0.5 }}
            />
            <path
              d={`M${x} 69Q${x - 2.5} 64 ${x} 60Q${x + 2.5} 64 ${x} 69Z`}
              style={{ fill: cloth(1) }}
            />
          </g>
        ))}
      </>
    ),
  },
  starfield: {
    draw: () => (
      <g style={{ fill: 'var(--medal-gold-hi)' }}>
        {[
          [14, 18, 1.6],
          [24, 8, 1],
          [36, 4, 1.3],
          [64, 5, 1],
          [78, 10, 1.6],
          [88, 22, 1.1],
          [10, 40, 1.1],
          [90, 44, 1.4],
          [16, 60, 1],
          [84, 62, 1],
          [30, 18, 0.8],
          [72, 18, 0.8],
        ].map(([x, y, s]) => (
          <path
            key={`${x}-${y}`}
            d={`M${x} ${y - s * 2}L${x + s * 0.6} ${y - s * 0.6}L${x + s * 2} ${y}L${x + s * 0.6} ${y + s * 0.6}L${x} ${y + s * 2}L${x - s * 0.6} ${y + s * 0.6}L${x - s * 2} ${y}L${x - s * 0.6} ${y - s * 0.6}Z`}
          />
        ))}
      </g>
    ),
  },
};
