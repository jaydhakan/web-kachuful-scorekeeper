import { cloth, LINE, NO_LINE, type ItemArt } from './types';

const gold = 'var(--medal-gold)';

/** Gala: over the outfit's collar, under the chin (the face disc's bottom is y 64). */
export const NECKWEAR: Record<string, ItemArt> = {
  gold_chain: {
    draw: () => (
      <>
        <path
          d="M38 63Q50 80 62 63"
          style={{ fill: 'none', stroke: 'var(--medal-gold-lo)', strokeWidth: 2.4 }}
        />
        <path
          d="M38 63Q50 80 62 63"
          style={{ fill: 'none', stroke: gold, strokeWidth: 1.6, strokeDasharray: '1.6 0.8' }}
        />
        <circle
          cx={50}
          cy={73}
          r={2.6}
          style={{ fill: gold, stroke: 'var(--medal-gold-lo)', strokeWidth: 0.6 }}
        />
      </>
    ),
  },
  whistle: {
    draw: () => (
      <>
        <path
          d="M40 63Q48 76 55 74Q60 70 61 63"
          style={{ fill: 'none', stroke: cloth(2), strokeWidth: 1 }}
        />
        <path
          d="M53 72H62Q65 72 65 75Q65 78 62 78H55Q53 78 53 75Z"
          style={{ ...LINE, fill: 'var(--medal-silver)' }}
        />
        <circle cx={60} cy={75} r={1.4} style={{ ...NO_LINE, fill: 'var(--shade)' }} />
      </>
    ),
  },
  muffler: {
    tones: [
      [2, 5],
      [3, 1],
      [4, 5],
      [1, 6],
    ],
    draw: (t) => (
      <>
        <path d="M33 62Q50 72 67 62L68 68Q50 79 32 68Z" style={{ ...LINE, fill: t.main }} />
        <path d="M56 70L60 96H67L63 68Z" style={{ ...LINE, fill: t.main }} />
        <path d="M60 90H66M61 94H67" style={{ fill: 'none', stroke: t.trim, strokeWidth: 1.2 }} />
        <path
          d="M40 67V71M46 69V73M52 69V73M58 67V71"
          style={{ fill: 'none', stroke: t.shade, strokeWidth: 1 }}
        />
      </>
    ),
  },
  id_lanyard: {
    tones: [
      [3, 5],
      [2, 5],
      [4, 5],
    ],
    draw: (t) => (
      <>
        <path
          d="M40 63L48 84M60 63L52 84"
          style={{ fill: 'none', stroke: t.main, strokeWidth: 2 }}
        />
        <rect x={44} y={83} width={12} height={15} rx={1.5} style={{ ...LINE, fill: t.trim }} />
        <rect x={46.5} y={86} width={7} height={5} rx={1} style={{ ...NO_LINE, fill: t.main }} />
        <path d="M46.5 94H53.5" style={{ fill: 'none', stroke: t.shade, strokeWidth: 0.8 }} />
      </>
    ),
  },
  marigold_mala: {
    draw: () => (
      <>
        {Array.from({ length: 11 }, (_, k) => {
          const a = Math.PI * (0.08 + (0.84 * k) / 10);
          const x = 50 - Math.cos(a) * 16,
            y = 62 + Math.sin(a) * 18;
          return (
            <circle
              key={k}
              cx={x}
              cy={y}
              r={2.6}
              style={{
                fill: k % 3 === 1 ? cloth(2) : cloth(1),
                stroke: 'var(--cloth-line)',
                strokeWidth: 0.5,
              }}
            />
          );
        })}
      </>
    ),
  },
  bow_tie: {
    tones: [
      [2, 6],
      [6, 5],
      [3, 1],
      [8, 2],
    ],
    draw: (t) => (
      <>
        <path d="M50 68L40 63V73ZM50 68L60 63V73Z" style={{ ...LINE, fill: t.main }} />
        <rect x={47.5} y={65.5} width={5} height={5} rx={1.2} style={{ ...LINE, fill: t.trim }} />
      </>
    ),
  },
};
