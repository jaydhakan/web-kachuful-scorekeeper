import type { Config } from 'tailwindcss';
import base from './tailwind.config';

/** The moments lab's utilities (dev builds only), in a sheet of its own so none reach the site's CSS. */
export default {
  ...base,
  content: ['./src/fx/lab/**/*.{ts,tsx}'],
  corePlugins: { ...base.corePlugins, preflight: false },
} satisfies Config;
