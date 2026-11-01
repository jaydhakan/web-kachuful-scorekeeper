import type { Config } from 'tailwindcss';
import containerQueries from '@tailwindcss/container-queries';
import plugin from 'tailwindcss/plugin';
import { CQ_HEIGHT, MQ } from './src/theme/breakpoints';
import { COLOR_VARS, GRADIENTS } from './src/theme/colors';

// Theme variables with Tailwind's opacity modifier (`bg-ov/[.07]`) mixed in, so `/alpha` keeps working.
const colors = Object.fromEntries(
  Object.entries(COLOR_VARS).map(([k, v]) => [
    k,
    `color-mix(in srgb, var(--${v}) calc(<alpha-value> * 100%), transparent)`,
  ]),
);
// 44 to 148 are the large-screen display sizes (design boards: page titles, bidder name, keys, the Home hero).
const sizes = [
  13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 26, 28, 30, 32, 34, 36, 40, 44, 48, 52, 56, 64, 72,
  96, 148,
];

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  future: { hoverOnlyWhenSupported: true },
  theme: {
    // Layouts are chosen by orientation and height as well as width, so every screen is a raw query.
    screens: Object.fromEntries(Object.entries(MQ).map(([k, raw]) => [k, { raw }])),
    extend: {
      colors,
      // rem, so browser and OS text-size settings scale type; 16px is 1rem, so nothing moves by default.
      fontSize: Object.fromEntries(sizes.map((s) => [s, `${s / 16}rem`])),
      // Each theme names its own faces (src/styles/themes.css); only the active theme's are downloaded.
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      backgroundImage: GRADIENTS,
      transitionTimingFunction: { apple: 'cubic-bezier(0.32,0.72,0,1)' },
    },
  },
  plugins: [
    containerQueries,
    // The official plugin only queries width; a size container also answers to its height.
    plugin(({ addUtilities, matchVariant }) => {
      addUtilities({ '.cq-size': { 'container-type': 'size' } });
      matchVariant('@h', (v: string) => `@container (max-height: ${v})`, { values: CQ_HEIGHT });
    }),
  ],
} satisfies Config;
