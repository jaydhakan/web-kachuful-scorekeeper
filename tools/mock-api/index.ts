import type { Plugin } from 'vite';
import { mockApi } from './server';

/** Serves the in-memory API under /api (and the /r, /l preview pages) from Vite's dev and preview servers. */
export const mockApiPlugin = (): Plugin => ({
  name: 'kachuful-mock-api',
  configureServer: (s) => void s.middlewares.use(mockApi),
  configurePreviewServer: (s) => void s.middlewares.use(mockApi),
});
