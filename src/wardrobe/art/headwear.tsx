import { cloth, LINE, NO_LINE, type ItemArt } from './types';

/** Sar: on top of the face disc, whose top edge is y 20. A crown (Taj) takes this slot's place in its game. */
export const HEADWEAR: Record<string, ItemArt> = {
  cricket_cap: {
    tones: [
      [5, 3],
      [3, 5],
      [2, 5],
    ],
    draw: (t) => (
      <>
        <path d="M28 31C28 17 37 11 50 11C63 11 72 17 72 31Z" style={{ ...LINE, fill: t.main }} />
        <path
          d="M50 11.5V30M39 13.5Q37 22 37 30M61 13.5Q63 22 63 30"
          style={{ fill: 'none', stroke: t.shade, strokeWidth: 0.7 }}
        />
        <path
          d="M28.5 30.5Q50 26.5 71.5 30.5"
          style={{ fill: 'none', stroke: t.trim, strokeWidth: 1.3 }}
        />
        <path
          d="M25.5 31.5Q50 25.5 74.5 31.5Q77 35 70.5 36.5Q50 32.5 29.5 36.5Q23 35 25.5 31.5Z"
          style={{ ...LINE, fill: t.shade }}
        />
        <circle cx={50} cy={11.5} r={1.7} style={{ ...LINE, fill: t.trim }} />
      </>
    ),
  },
  safa: {
    tones: [
      [1, 2],
      [8, 1],
      [2, 1],
    ],
    draw: (t) => (
      <>
        <path
          d="M25 33C23 20 33 9 50 8C67 9 77 20 75 33C66 29 58 28 50 28C42 28 34 29 25 33Z"
          style={{ ...LINE, fill: t.main }}
        />
        <path
          d="M27 26C38 17 56 13 72 18M26 31C40 22 58 19 74.5 25"
          style={{ fill: 'none', stroke: t.shade, strokeWidth: 2 }}
        />
        <path
          d="M33 14C44 12 52 15 60 22"
          style={{ fill: 'none', stroke: t.trim, strokeWidth: 1, strokeLinecap: 'round' }}
        />
        <path
          d="M50 19.5C47 13 49 7 54.5 3C53 9 53 14 50 19.5Z"
          style={{ ...LINE, fill: t.trim }}
        />
        <circle cx={50} cy={22} r={2.9} style={{ ...LINE, fill: 'var(--medal-gold)' }} />
        <circle cx={50} cy={22} r={1.2} style={{ ...NO_LINE, fill: cloth(2) }} />
      </>
    ),
  },
  umbrella_hat: {
    tones: [
      [1, 3],
      [8, 5],
      [4, 1],
    ],
    draw: (t) => (
      <>
        <path d="M18 24C20 10 34 3 50 3C66 3 80 10 82 24Z" style={{ ...LINE, fill: t.main }} />
        <path
          d="M18 24Q26 20 34 24Q42 20 50 24Q58 20 66 24Q74 20 82 24"
          style={{ ...LINE, fill: t.trim }}
        />
        <path
          d="M50 3V24M34 5Q31 14 34 24M66 5Q69 14 66 24"
          style={{ fill: 'none', stroke: t.shade, strokeWidth: 0.8 }}
        />
        <path
          d="M33 24L36 30M67 24L64 30"
          style={{ fill: 'none', stroke: 'var(--cloth-line)', strokeWidth: 1 }}
        />
        <circle cx={50} cy={2.5} r={1.6} style={{ ...LINE, fill: t.trim }} />
      </>
    ),
  },
  monkey_cap: {
    tones: [
      [2, 5],
      [6, 1],
      [3, 5],
    ],
    draw: (t) => (
      <>
        <path
          d="M25 46C22 26 32 10 50 10C68 10 78 26 75 46L71 46C71 34 62 26 50 26C38 26 29 34 29 46Z"
          style={{ ...LINE, fill: t.main }}
        />
        <path d="M30 30Q50 22 70 30" style={{ fill: 'none', stroke: t.trim, strokeWidth: 1.6 }} />
        <circle cx={50} cy={9} r={3.4} style={{ ...LINE, fill: t.trim }} />
      </>
    ),
  },
  shades: {
    tones: [
      [6, 1],
      [2, 1],
    ],
    draw: (t) => (
      <>
        <path d="M30 37H70" style={{ fill: 'none', stroke: t.main, strokeWidth: 1.6 }} />
        <path
          d="M31 36H47Q47 46 39 46Q31 46 31 36ZM53 36H69Q69 46 61 46Q53 46 53 36Z"
          style={{ ...LINE, fill: t.main }}
        />
        <path
          d="M34 38.5L38 38.5M56 38.5L60 38.5"
          style={{ fill: 'none', stroke: t.trim, strokeWidth: 1, strokeLinecap: 'round' }}
        />
      </>
    ),
  },
  headphones: {
    tones: [
      [6, 7],
      [5, 8],
      [2, 6],
    ],
    draw: (t) => (
      <>
        <path
          d="M24 42C24 22 35 13 50 13C65 13 76 22 76 42"
          style={{ fill: 'none', stroke: t.main, strokeWidth: 3.4, strokeLinecap: 'round' }}
        />
        <rect x={20} y={36} width={9} height={14} rx={4} style={{ ...LINE, fill: t.main }} />
        <rect x={71} y={36} width={9} height={14} rx={4} style={{ ...LINE, fill: t.main }} />
        <rect x={23.5} y={39} width={3} height={8} rx={1.5} style={{ ...NO_LINE, fill: t.trim }} />
        <rect x={73.5} y={39} width={3} height={8} rx={1.5} style={{ ...NO_LINE, fill: t.trim }} />
      </>
    ),
  },
};
