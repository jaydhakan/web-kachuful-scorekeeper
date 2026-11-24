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
};
