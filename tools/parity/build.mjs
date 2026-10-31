// Builds the prototype (read-only, from prototype/source) and the port into reports/parity/.
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const abs = (p) => path.join(root, p);

export async function buildBoth() {
  await build({
    root: abs('tools/parity/proto'),
    configFile: false,
    logLevel: 'warn',
    plugins: [react()],
    css: {
      postcss: {
        plugins: [
          tailwindcss({
            content: [abs('prototype/source/src/**/*.{jsx,js}')],
            theme: {
              extend: {
                transitionTimingFunction: { apple: 'cubic-bezier(0.32,0.72,0,1)' },
                colors: { acc: 'var(--accent)' },
              },
            },
            corePlugins: { preflight: true },
          }),
          autoprefixer(),
        ],
      },
    },
    build: { outDir: abs('reports/parity/proto-dist'), emptyOutDir: true },
  });
  await build({
    root,
    configFile: abs('vite.config.ts'),
    logLevel: 'warn',
    build: { outDir: abs('reports/parity/app-dist'), emptyOutDir: true },
  });
}
