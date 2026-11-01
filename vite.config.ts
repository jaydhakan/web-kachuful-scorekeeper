/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import tokens from './src/theme/tokens.json' with { type: 'json' };
import { MQ } from './src/theme/breakpoints';
import { mockApiPlugin } from './tools/mock-api';

const felt = tokens.color.tokens.find((t) => t.name === 'felt-950')!.value.midnight;

/**
 * On a tablet or desktop, starts the large-screen chunks downloading while the entry is still parsing. Without
 * this they are only requested once the entry has run, a whole extra round trip before the first paint.
 */
const preloadDesk = (): Plugin => ({
  name: 'preload-desk',
  transformIndexHtml: {
    order: 'post',
    handler: (_html, ctx) => {
      const chunks = Object.values(ctx.bundle ?? {}).filter((c) => c.type === 'chunk');
      const byFile = new Map(chunks.map((c) => [c.fileName, c]));
      const closure = (from: string[], seen = new Set<string>()) => {
        for (const f of from)
          if (!seen.has(f)) {
            seen.add(f);
            closure(byFile.get(f)?.imports ?? [], seen);
          }
        return seen;
      };
      const entry = closure(chunks.filter((c) => c.isEntry).map((c) => c.fileName));
      const desk = chunks.find((c) =>
        c.facadeModuleId?.endsWith('/src/screens/desk/DeskShell.tsx'),
      );
      if (!desk) return [];
      const files = [...closure([desk.fileName])].filter((f) => !entry.has(f)).map((f) => `/${f}`);
      return [
        {
          tag: 'script',
          children: `matchMedia(${JSON.stringify(MQ.big)}).matches&&${JSON.stringify(files)}.forEach(function(h){var l=document.createElement('link');l.rel='modulepreload';l.crossOrigin='';l.href=h;document.head.appendChild(l)})`,
          injectTo: 'head' as const,
        },
      ];
    },
  },
});

// The real backend (HANDOFF §2) behind the dev and preview servers, so the app and the API share one origin.
const API_TARGET = process.env.KACHUFUL_API ?? 'http://127.0.0.1:8000';
const apiProxy = { '^/(api|r|l)/': { target: API_TARGET } };

export default defineConfig(({ mode }) => ({
  server: mode === 'mock' ? {} : { proxy: apiProxy },
  preview: mode === 'mock' ? {} : { proxy: apiProxy },
  plugins: [
    // The in-memory API for building and testing without the backend: `npm run dev:mock`, and the e2e server.
    ...(mode === 'mock' || process.env.MOCK_API ? [mockApiPlugin()] : []),
    react(),
    preloadDesk(),
    VitePWA({
      // A waiting update is applied only when the player taps "Reload", never mid-round.
      registerType: 'prompt',
      // The install icons are read by the OS once, at install, never by the app offline: no need to precache ~230 KB.
      includeAssets: ['icon.svg'],
      includeManifestIcons: false,
      manifest: {
        // Pinned to what browsers derived from start_url, so installs keep their identity if start_url ever moves.
        id: '/',
        name: 'Kachuful',
        short_name: 'Kachuful',
        description: 'Scorekeeper for the Judgement / Kachuful card game.',
        lang: 'en',
        categories: ['games', 'utilities'],
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: felt,
        theme_color: felt,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,webmanifest}'],
        navigateFallback: 'index.html',
        // The API and the link-preview pages are the server's, never the app shell.
        navigateFallbackDenylist: [/^\/api\//, /^\/r\//, /^\/l\//],
        cleanupOutdatedCaches: true,
        // Player photos only (HANDOFF §5.7): public, versioned and immutable, so a cached copy is never stale and
        // holds nothing private. Every other /api/ answer stays out of the worker: it is private and ETag-checked.
        runtimeCaching: [
          {
            urlPattern: ({ url, request, sameOrigin }) =>
              sameOrigin &&
              request.method === 'GET' &&
              /^\/api\/players\/[^/]+\/photo$/.test(url.pathname) &&
              url.searchParams.has('v'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'kachuful-photos',
              // ~60 KB each (§5.7): at most ~12 MB, and a photo unseen for 30 days goes.
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 3600,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{js,ts,tsx}'],
    coverage: { provider: 'v8', include: ['src/domain/**'], reporter: ['text', 'html'] },
  },
}));
