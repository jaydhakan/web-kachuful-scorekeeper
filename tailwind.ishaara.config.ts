import type { Config } from 'tailwindcss';
import base from './tailwind.config';

/**
 * Ishaara's own utilities, in a sheet that loads with its lazy chunk so the landing page and the other games don't
 * download them. Same theme and plugins as the site; the build drops every rule the main sheet already has.
 */
export default {
  ...base,
  content: ['./src/games/ishaara/**/*.{ts,tsx}'],
  corePlugins: { ...base.corePlugins, preflight: false },
} satisfies Config;
