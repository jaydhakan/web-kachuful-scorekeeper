import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';
import tokens from './src/theme/tokens.json';
import extended from './src/theme/extended.json';

const colors: Record<string, string> = {
  ...Object.fromEntries(tokens.color.tokens.map((t) => [t.name, t.value.midnight])),
  ...extended.colors,
};
const sizes = [
  13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 26, 28, 30, 32, 34, 36, 40, 52, 64, 72, 96,
];

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors,
      fontSize: Object.fromEntries(sizes.map((s) => [s, `${s}px`])),
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
