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
  office_shirt: {
    tones: [
      [5, 3],
      [3, 2],
      [7, 6],
    ],
    draw: (t) => (
      <>
        <path d={SHOULDERS} style={{ ...LINE, fill: t.main }} />
        <Sleeves fill={t.shade} />
        <path d="M50 66L46.5 70L48 94L50 97L52 94L53.5 70Z" style={{ ...LINE, fill: t.trim }} />
        <path d="M38 63L50 67L44 74ZM62 63L50 67L56 74Z" style={{ ...LINE, fill: t.main }} />
        <path d="M50 76V100" style={{ fill: 'none', stroke: t.shade, strokeWidth: 0.6 }} />
      </>
    ),
  },
  cricket_whites: {
    tones: [[5, 4]],
    draw: (t) => (
      <>
        <path d={SHOULDERS} style={{ ...LINE, fill: t.main }} />
        <Sleeves fill={t.shade} />
        <path d="M38 63L50 72L62 63L57 75L50 72L43 75Z" style={{ ...LINE, fill: t.main }} />
        <path
          d="M38.5 66L50 74L61.5 66"
          style={{ fill: 'none', stroke: t.trim, strokeWidth: 1.4 }}
        />
        <path d="M50 74V88" style={{ fill: 'none', stroke: t.shade, strokeWidth: 0.7 }} />
        <circle cx={50} cy={80} r={0.9} style={{ ...NO_LINE, fill: t.shade }} />
      </>
    ),
  },
  jersey: {
    tones: [
      [3, 5],
      [2, 5],
      [4, 5],
      [6, 1],
    ],
    draw: (t, it) => (
      <>
        <path d={SHOULDERS} style={{ ...LINE, fill: t.main }} />
        <path
          d="M6 100C7 84 13 76 22 71L26 76L22 100ZM94 100C93 84 87 76 78 71L74 76L78 100Z"
          style={{ ...NO_LINE, fill: t.trim }}
        />
        <path d="M41 64.5Q50 72 59 64.5" style={{ ...LINE, fill: 'none' }} />
        <text
          x={50}
          y={92}
          textAnchor="middle"
          style={{ fill: t.trim, fontSize: 15, fontWeight: 800, fontFamily: 'inherit' }}
        >
          {String(it.number ?? 7)}
        </text>
      </>
    ),
  },
  nehru_jacket: {
    tones: [
      [6, 5],
      [2, 5],
      [3, 5],
      [1, 5],
    ],
    draw: (t) => (
      <>
        <path d={SHOULDERS} style={{ ...LINE, fill: t.trim }} />
        <path
          d="M13 100C14 84 21 74 33 68L41 65L45 100ZM87 100C86 84 79 74 67 68L59 65L55 100Z"
          style={{ ...LINE, fill: t.main }}
        />
        <path d="M44 64.5H56V68H44Z" style={{ ...LINE, fill: t.main }} />
        {[76, 84, 92].map((y) => (
          <circle
            key={y}
            cx={46.6}
            cy={y}
            r={1}
            style={{ ...NO_LINE, fill: 'var(--medal-gold)' }}
          />
        ))}
        <path d="M30 84H38" style={{ fill: 'none', stroke: t.shade, strokeWidth: 1 }} />
      </>
    ),
  },
  knit_sweater: {
    tones: [
      [2, 5],
      [4, 5],
      [3, 1],
      [8, 5],
    ],
    draw: (t) => (
      <>
        <path d={SHOULDERS} style={{ ...LINE, fill: t.main }} />
        <Sleeves fill={t.shade} />
        <path d="M40 64Q50 70 60 64L60 68Q50 74 40 68Z" style={{ ...LINE, fill: t.shade }} />
        <path
          d="M14 84L20 80L26 84L32 80L38 84L44 80L50 84L56 80L62 84L68 80L74 84L80 80L86 84"
          style={{ fill: 'none', stroke: t.trim, strokeWidth: 1.6, strokeLinejoin: 'round' }}
        />
        <path
          d="M18 92L24 88L30 92L36 88L42 92L48 88L54 92L60 88L66 92L72 88L78 92L84 88"
          style={{ fill: 'none', stroke: t.trim, strokeWidth: 1.2, strokeLinejoin: 'round' }}
        />
      </>
    ),
  },
  raincoat: {
    tones: [
      [1, 6],
      [4, 5],
      [8, 5],
    ],
    draw: (t) => (
      <>
        <path d={SHOULDERS} style={{ ...LINE, fill: t.main }} />
        <Sleeves fill={t.shade} />
        <path
          d="M37 63L49 70L49 100H51V70L63 63L60 74L51 70H49L40 74Z"
          style={{ ...LINE, fill: t.shade }}
        />
        {[78, 87, 96].map((y) => (
          <path
            key={y}
            d={`M53 ${y}h4`}
            style={{ fill: 'none', stroke: t.trim, strokeWidth: 1.6, strokeLinecap: 'round' }}
          />
        ))}
      </>
    ),
  },
  shawl: {
    tones: [
      [2, 1],
      [7, 5],
      [6, 8],
      [4, 1],
    ],
    draw: (t) => (
      <>
        <path d={SHOULDERS} style={{ ...LINE, fill: 'var(--cloth-base)' }} />
        <path
          d="M6 100C7 81 17 71 33 66.5Q45 64 50 64Q55 64 67 66.5C83 71 93 81 94 100H70L58 72Q50 78 42 72L30 100Z"
          style={{ ...LINE, fill: t.main }}
        />
        <path
          d="M30 100L42 72M70 100L58 72"
          style={{ fill: 'none', stroke: t.trim, strokeWidth: 1.6 }}
        />
        <path
          d="M14 93Q20 89 26 93M74 93Q80 89 86 93"
          style={{ fill: 'none', stroke: t.shade, strokeWidth: 1 }}
        />
      </>
    ),
  },
  dupatta: {
    tones: [
      [8, 1],
      [1, 2],
      [7, 1],
      [4, 8],
    ],
    draw: (t) => (
      <>
        <path d={SHOULDERS} style={{ ...LINE, fill: t.shade }} />
        <path
          d="M20 72C30 66 42 64 52 66C62 69 72 80 80 100H66C60 86 52 76 42 72C34 70 26 71 20 72Z"
          style={{ ...LINE, fill: t.main }}
        />
        <path
          d="M66 100C60 86 52 76 42 72"
          style={{ fill: 'none', stroke: t.trim, strokeWidth: 1.8, strokeDasharray: '2 2' }}
        />
      </>
    ),
  },
  sherwani: {
    tones: [
      [5, 1],
      [2, 1],
      [6, 1],
    ],
    draw: (t) => (
      <>
        <path d={SHOULDERS} style={{ ...LINE, fill: t.main }} />
        <Sleeves fill={t.shade} />
        <path d="M43 64H57V69H43Z" style={{ ...LINE, fill: t.trim }} />
        <path d="M50 69V100" style={{ fill: 'none', stroke: t.trim, strokeWidth: 1.6 }} />
        {[74, 80, 86, 92, 98].map((y) => (
          <circle
            key={y}
            cx={50}
            cy={y}
            r={1.1}
            style={{ ...NO_LINE, fill: 'var(--medal-gold)' }}
          />
        ))}
        <path
          d="M28 76Q34 72 40 76M60 76Q66 72 72 76"
          style={{ fill: 'none', stroke: t.trim, strokeWidth: 0.9 }}
        />
      </>
    ),
  },
  // The joke legendary: a vest, and a checked lungi just showing at the bottom.
  lungi_banian: {
    tones: [
      [4, 5],
      [3, 5],
      [2, 5],
    ],
    draw: (t) => (
      <>
        <path d={SHOULDERS} style={{ ...LINE, fill: 'var(--cloth-base)' }} />
        <path
          d="M24 100C24 86 26 76 31 70Q38 76 50 76Q62 76 69 70C74 76 76 86 76 100Z"
          style={{ ...LINE, fill: cloth(5) }}
        />
        <path d="M24 94H76V100H24Z" style={{ ...LINE, fill: t.main }} />
        <path
          d="M30 94V100M38 94V100M46 94V100M54 94V100M62 94V100M70 94V100"
          style={{ fill: 'none', stroke: t.trim, strokeWidth: 0.8 }}
        />
        <path d="M24 97H76" style={{ fill: 'none', stroke: t.trim, strokeWidth: 0.8 }} />
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
