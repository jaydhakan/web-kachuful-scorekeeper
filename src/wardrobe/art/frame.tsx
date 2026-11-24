import { FACE, type ItemArt } from './types';

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
};
