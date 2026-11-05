/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { brotliCompress, constants, gzip } from 'node:zlib';
import { MQ } from './src/theme/breakpoints';
import { DEFAULT_THEME, THEMES } from './src/theme/themes';
import { mockApiPlugin } from './tools/mock-api';

const splash = THEMES[DEFAULT_THEME].themeColor;

/**
 * Puts the last theme shown on <html> before any CSS or app code runs, so a cold start never flashes the wrong theme
 * (DESIGN-SYSTEM.md, Switching themes). Generated from the registry so the two can't drift. It reads storage directly because
 * nothing else has loaded yet; everywhere else goes through src/state/persistence.ts.
 */
const themeBoot = (): Plugin => {
  const colours = Object.fromEntries(Object.entries(THEMES).map(([id, t]) => [id, t.themeColor]));
  const dark = Object.keys(THEMES).filter(
    (id) => THEMES[id as keyof typeof THEMES].scheme === 'dark',
  );
  return {
    name: 'theme-boot',
    // At the marker after <meta charset>, ahead of every stylesheet and script.
    transformIndexHtml: (html) =>
      html.replace(
        '<!-- theme-boot -->',
        `<meta name="theme-color" content="${splash}" />\n    <script>(function(){var c=${JSON.stringify(colours)},d=${JSON.stringify(dark)},t;try{t=localStorage.getItem('kf.theme')}catch(e){}if(!Object.prototype.hasOwnProperty.call(c,t))t=${JSON.stringify(DEFAULT_THEME)};var r=document.documentElement;r.setAttribute('data-theme',t);r.style.colorScheme=d.indexOf(t)<0?'light':'dark';var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',c[t])})()</script>`,
      ),
  };
};

/**
 * Starts the chunks of whichever UI fits this screen (phone or large-screen) downloading while the entry is still
 * parsing. Without this they are only requested once the entry has run, a whole extra round trip before first paint.
 */
const preloadShell = (): Plugin => ({
  name: 'preload-shell',
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
      const files = (src: string) => {
        const shell = chunks.find((c) => c.facadeModuleId?.endsWith(src));
        if (!shell) throw new Error(`preload-shell: no chunk for ${src}`);
        return [...closure([shell.fileName])].filter((f) => !entry.has(f)).map((f) => `/${f}`);
      };
      const desk = files('/src/screens/desk/DeskShell.tsx');
      const phone = files('/src/components/PhoneShell.tsx');
      return [
        {
          tag: 'script',
          children: `(matchMedia(${JSON.stringify(MQ.big)}).matches?${JSON.stringify(desk)}:${JSON.stringify(phone)}).forEach(function(h){var l=document.createElement('link');l.rel='modulepreload';l.crossOrigin='';l.href=h;document.head.appendChild(l)})`,
          injectTo: 'head' as const,
        },
      ];
    },
  },
});

/**
 * Writes .br and .gz beside every text file in the build, at the strongest settings, for nginx's brotli_static and
 * gzip_static (reports/perf/hosting.md): ~22% smaller than on-the-fly gzip and no CPU per request. The service
 * worker's precache globs name their extensions, so it never picks these up.
 */
const precompress = (): Plugin => {
  let outDir = 'dist';
  const br = promisify(brotliCompress);
  const gz = promisify(gzip);
  return {
    name: 'precompress',
    apply: 'build',
    configResolved: (c) => void (outDir = path.resolve(c.root, c.build.outDir)),
    // After vite-plugin-pwa's closeBundle, so sw.js and the workbox runtime are compressed too.
    closeBundle: {
      order: 'post',
      sequential: true,
      handler: async () => {
        const files = (await readdir(outDir, { recursive: true }))
          .filter((f) => /\.(js|css|html|svg|webmanifest)$/.test(f))
          .map((f) => path.join(outDir, f));
        await Promise.all(
          files.map(async (f) => {
            const b = await readFile(f);
            if (b.length < 1024) return;
            const q = { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } };
            await writeFile(f + '.br', await br(b, q));
            await writeFile(f + '.gz', await gz(b, { level: 9 }));
          }),
        );
      },
    },
  };
};

const SHELLS = ['/src/components/PhoneShell.tsx', '/src/screens/desk/DeskShell.tsx'];
type Graph = {
  getModuleInfo(id: string): { isEntry: boolean; importers: readonly string[] } | null;
};
/** What loads a module through static imports: the UI shells, and 'entry' if the entry does. */
const loadedBy = (id: string, g: Graph, seen = new Set<string>()): string[] => {
  const shell = SHELLS.find((s) => id.endsWith(s));
  if (shell) return [shell];
  if (seen.has(id)) return [];
  seen.add(id);
  const info = g.getModuleInfo(id);
  return [
    ...(info?.isEntry ? ['entry'] : []),
    ...(info?.importers ?? []).flatMap((i) => loadedBy(i, g, seen)),
  ];
};
/**
 * Code both UIs load and the entry doesn't goes into one chunk, with its dependencies (React included). Left to
 * automatic splitting it came out as a dozen small chunks that compress worse apart: the phone's first load grew 3 KB.
 */
const shellCommon = (id: string, g: Graph) => {
  const by = loadedBy(id, g);
  return !by.includes('entry') && SHELLS.every((s) => by.includes(s)) ? 'shell-common' : null;
};

// The real backend behind the dev and preview servers, so the app and the API share one origin.
const API_TARGET = process.env.KACHUFUL_API ?? 'http://127.0.0.1:8000';
const apiProxy = { '^/(api|r|l)/': { target: API_TARGET } };

export default defineConfig(({ mode }) => ({
  server: mode === 'mock' ? {} : { proxy: apiProxy },
  build: { rolldownOptions: { output: { codeSplitting: { groups: [{ name: shellCommon }] } } } },
  preview: mode === 'mock' ? {} : { proxy: apiProxy },
  plugins: [
    // The in-memory API for building and testing without the backend: `npm run dev:mock`, and the e2e server.
    ...(mode === 'mock' || process.env.MOCK_API ? [mockApiPlugin()] : []),
    react(),
    themeBoot(),
    preloadShell(),
    precompress(),
    VitePWA({
      // A new version installs and takes over by itself; the round is saved on every change, so the reload is safe.
      registerType: 'autoUpdate',
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
        background_color: splash,
        theme_color: splash,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,webmanifest}'],
        // Only the default theme's face is installed up front; other themes' fonts are cached the first time a theme
        // uses them (runtime rule below), so the install stays light (DESIGN-SYSTEM.md, Switching themes).
        globIgnores: ['**/{bricolage,space-mono,dm-mono,instrument-serif,cinzel}-*.woff2'],
        navigateFallback: 'index.html',
        // The API and the link-preview pages are the server's, never the app shell.
        navigateFallbackDenylist: [/^\/api\//, /^\/r\//, /^\/l\//],
        cleanupOutdatedCaches: true,
        // Player photos only: public, versioned and immutable, so a cached copy is never stale and
        // holds nothing private. Every other /api/ answer stays out of the worker: it is private and ETag-checked.
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.endsWith('.woff2'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'kachuful-fonts',
              expiration: { maxEntries: 20, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // A theme's deck art (Emerald Gilt): hashed and immutable, cached on first use so the reveal works offline.
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && url.pathname.startsWith('/assets/') && url.pathname.endsWith('.webp'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'kachuful-art',
              expiration: { maxEntries: 20, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [200] },
            },
          },
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
