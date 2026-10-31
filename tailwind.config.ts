import type { Config } from 'tailwindcss';
import containerQueries from '@tailwindcss/container-queries';
import plugin from 'tailwindcss/plugin';
import { CQ_HEIGHT, MQ } from './src/theme/breakpoints';
import tokens from './src/theme/tokens.json';
import extended from './src/theme/extended.json';

const colors: Record<string, string> = {
  ...Object.fromEntries(tokens.color.tokens.map((t) => [t.name, t.value.midnight])),
  ...extended.colors,
};
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
      fontFamily: {
        display: [
          '"Bricolage Grotesque Variable"',
          '"DM Sans Variable"',
          'system-ui',
          'sans-serif',
        ],
        sans: ['"DM Sans Variable"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      backgroundImage: extended.backgroundImage,
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
    plugin(({ addBase }) =>
      addBase({
        ':root': {
          '--bg': colors['felt-950'],
          '--felt': colors['felt-900'],
          '--felt-hi': colors['felt-table'],
          '--tx': colors['text-primary'],
          '--tx2': colors['text-secondary'],
          '--dis': colors['text-disabled'],
          '--ph': colors['text-placeholder'],
          '--neg-tx': colors['negative-text'],
          '--gold': colors['gold'],
          '--pos': colors['positive'],
          '--neg': colors['negative'],
          '--warn': colors['warning'],
        },
      }),
    ),
  ],
} satisfies Config;
