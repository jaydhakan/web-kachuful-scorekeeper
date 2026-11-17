import type { Config } from 'tailwindcss';
import base from './tailwind.config';

/**
 * The moments' utilities, in a sheet that loads with their lazy chunks (src/fx/ui), so no first load carries them.
 * Same theme and plugins as the site; the build drops every rule the main sheet already has.
 */
export default {
  ...base,
  content: ['./src/fx/ui/**/*.{ts,tsx}'],
  corePlugins: { ...base.corePlugins, preflight: false },
} satisfies Config;
