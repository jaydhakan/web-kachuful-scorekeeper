import { Sleeves, SHOULDERS } from './base';
import { cloth, LINE, NO_LINE, type ItemArt } from './types';

const gold = 'var(--medal-gold)';
const diamond = (x: number, y: number, s = 2.2) =>
  `M${x} ${y - s}l${s} ${s}l${-s} ${s}l${-s} ${-s}Z`;

/** Libaas (REWARDS-PLAN §4.4): the shoulders and chest, under the face disc. */
export const OUTFIT: Record<string, ItemArt> = {
  kurta: {
    tones: [
      [5, 1],
      [1, 2],
      [3, 5],
      [4, 1],
      [2, 1],
      [8, 5],
    ],
    draw: (t) => (
      <>
        <path d={SHOULDERS} style={{ ...LINE, fill: t.main }} />
        <Sleeves fill={t.shade} />
        <path d="M47.5 64h5v25h-5Z" style={{ ...LINE, fill: t.trim }} />
        {[71, 77, 83].map((y) => (
          <circle key={y} cx={50} cy={y} r={0.95} style={{ ...NO_LINE, fill: t.main }} />
        ))}
        <path
          d="M38 65.5Q50 70.5 62 65.5L61 61.5Q50 66 39 61.5Z"
          style={{ ...LINE, fill: t.trim }}
        />
      </>
    ),
  },
  hoodie: {
    tones: [
      [6, 1],
      [3, 5],
      [2, 5],
      [4, 5],
    ],
    draw: (t) => (
      <>
        <path d={SHOULDERS} style={{ ...LINE, fill: t.main }} />
        <Sleeves fill={t.shade} />
        <path
          d="M27 70C26 58 36 52 50 52C64 52 74 58 73 70C66 66 58 64.5 50 64.5C42 64.5 34 66 27 70Z"
          style={{ ...LINE, fill: t.shade }}
        />
        <path d="M32 100L36 88Q50 85 64 88L68 100Z" style={{ ...LINE, fill: t.shade }} />
        <path
          d="M45 66L44 82M55 66L56 82"
          style={{ fill: 'none', stroke: t.trim, strokeWidth: 1.4, strokeLinecap: 'round' }}
        />
        <circle cx={44} cy={83} r={1.2} style={{ ...NO_LINE, fill: t.trim }} />
        <circle cx={56} cy={83} r={1.2} style={{ ...NO_LINE, fill: t.trim }} />
      </>
    ),
  },
  // Honour-only and woven: maroon with a gold border over a cream kurta, the same in every look.
  champions_shaal: {
    draw: () => (
      <>
        <path d={SHOULDERS} style={{ ...LINE, fill: cloth(5) }} />
        <path
          d="M6 100C7 81 17 71 33 66.5Q38 65 41 65L44 100ZM94 100C93 81 83 71 67 66.5Q62 65 59 65L56 100Z"
          style={{ ...LINE, fill: cloth(2) }}
        />
        <path
          d="M41 65L44 100M59 65L56 100"
          style={{ fill: 'none', stroke: gold, strokeWidth: 2.4 }}
        />
        <path
          d="M37.5 66L40.5 100M62.5 66L59.5 100"
          style={{ fill: 'none', stroke: gold, strokeWidth: 0.7 }}
        />
        <path
          d={[
            diamond(22, 88),
            diamond(29, 79),
            diamond(78, 88),
            diamond(71, 79),
            diamond(33, 92),
            diamond(67, 92),
          ].join('')}
          style={{ ...NO_LINE, fill: gold }}
        />
      </>
    ),
  },
};
