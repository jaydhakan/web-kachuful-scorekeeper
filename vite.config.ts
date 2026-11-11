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
import { metaTags, PAGES } from './src/platform/meta';
import { GAME_IDS } from './src/platform/route';
import { platform } from './src/strings/platform';
import { mockApiPlugin } from './tools/mock-api';
import { ownCss } from './tools/ownCss';

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
 * Links the shown theme's own stylesheet (src/theme/themeCss.ts) right after the main one, so its rules keep their
 * place in the cascade. Written by the parser, it blocks the first paint like the main stylesheet: no flash of another
 * theme. The default theme has none. The dev server injects its CSS by script, so main.tsx links it there.
 */
const themeCssBoot = (): Plugin => ({
  name: 'theme-css-boot',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler: (html, ctx) => {
      const hrefs: Record<string, string> = {};
      for (const a of Object.values(ctx.bundle ?? {}))
        if (a.type === 'asset')
          for (const src of a.originalFileNames) {
            const m = /src\/styles\/themes\/([a-z-]+)\.css$/.exec(src);
            if (m) hrefs[m[1]] = '/' + a.fileName;
          }
      const main = /<link rel="stylesheet"[^>]*href="\/assets\/index-[^"]+\.css"[^>]*>/.exec(html);
      if (!main || Object.keys(hrefs).length !== Object.keys(THEMES).length - 1)
        throw new Error('theme-css-boot: main stylesheet or a theme stylesheet is missing');
      const script = `<script>(function(){var h=${JSON.stringify(hrefs)},t=document.documentElement.getAttribute('data-theme');if(Object.prototype.hasOwnProperty.call(h,t))document.write('<link rel="stylesheet" data-theme-css="'+t+'" href="'+h[t]+'">')})()</script>`;
      return html.replace(main[0], main[0] + script);
    },
  },
});

const META_START = '<!-- meta:start -->',
  META_END = '<!-- meta:end -->';
/**
 * One HTML file per page, each with its own title, description and link-preview tags (src/platform/meta.ts): preview
 * bots don't run scripts, so `/kaali-teeri` must arrive with Kaali Teeri's tags. Every page loads the same app.
 */
const pageMeta = (): Plugin => ({
  name: 'page-meta',
  enforce: 'post',
  transformIndexHtml: (html) =>
    html.replace('<!-- page-meta -->', `${META_START}\n    ${metaTags(PAGES[0])}\n    ${META_END}`),
  generateBundle(_o, bundle) {
    const root = bundle['index.html'];
    if (root?.type !== 'asset') throw new Error('page-meta: index.html is missing');
    const html = String(root.source);
    const at = html.indexOf(META_START),
      end = html.indexOf(META_END) + META_END.length;
    if (at < 0 || end < at) throw new Error('page-meta: the meta markers are missing');
    const page = (i: number) => html.slice(0, at) + metaTags(PAGES[i]) + html.slice(end);
    root.source = page(0);
    for (let i = 1; i < PAGES.length; i++)
      this.emitFile({ type: 'asset', fileName: PAGES[i].file, source: page(i) });
  },
});

/**
 * Starts the chunks of whichever UI fits this screen (phone or large-screen) downloading while the entry is still
 * parsing. Without this they are only requested once the entry has run, a whole extra round trip before first paint.
 */
const preloadShell = (): Plugin => ({
  name: 'preload-shell',
  // Reads the production bundle; the dev server has none and needs no preloads.
  apply: 'build',
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
      const both = (...src: string[]) => [...new Set(src.flatMap(files))];
      // Per path, [large screen, phone]: each page starts only its own game's chunks.
      const sets: Record<string, [string[], string[]]> = {};
      for (const [path, desk, phone] of PRELOADS) sets[path] = [both(...desk), both(...phone)];
      return [
        {
          tag: 'script',
          children: `(function(){var s=${JSON.stringify(sets)},p=(location.pathname.split('/')[1]||'').toLowerCase(),f=s[p]||s[''];(matchMedia(${JSON.stringify(MQ.big)}).matches?f[0]:f[1]).forEach(function(h){var l=document.createElement('link');l.rel='modulepreload';l.crossOrigin='';l.href=h;document.head.appendChild(l)})})()`,
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

const LANDING = '/src/platform/landing/Landing.tsx';
const KF = '/src/games/kachuful/index.tsx';
const KT = '/src/games/kaali-teeri/index.tsx';
// First path segment → the modules each UI needs first ([large screen], [phone]).
const PRELOADS: [string, string[], string[]][] = [
  ['', [LANDING], [LANDING]],
  [
    'kachuful',
    [KF, '/src/games/kachuful/screens/desk/DeskShell.tsx'],
    [KF, '/src/games/kachuful/components/PhoneShell.tsx'],
  ],
  ['kaali-teeri', [KT, '/src/games/kaali-teeri/screens/desk/KtDeskShell.tsx'], [KT]],
];

const SHELLS = [
  '/src/games/kachuful/components/PhoneShell.tsx',
  '/src/games/kachuful/screens/desk/DeskShell.tsx',
];
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

/**
 * The phone layout's frame and the two viewport hooks every phone shell uses travel together: a game that imports
 * only one of them (Ishaara's shell) otherwise splits them into three chunks, and Kachuful's phone load grows.
 */
const phoneFrame = (id: string, g: Graph) =>
  /src\/(components\/ui\/Scaffold|hooks\/useVisualViewport|hooks\/useBoxHeight)\.tsx?$/.test(id) &&
  !loadedBy(id, g).includes(SHELLS[1])
    ? 'Scaffold'
    : null;

// The real backend behind the dev and preview servers, so the app and the API share one origin.
const API_TARGET = process.env.KACHUFUL_API ?? 'http://127.0.0.1:8000';
const apiProxy = { '^/(api|r|l)/': { target: API_TARGET } };

export default defineConfig(({ mode }) => ({
  server: mode === 'mock' ? {} : { proxy: apiProxy },
  build: {
    // Deck art stays a file even when small: inlined, it would land in the shared JS every theme downloads.
    assetsInlineLimit: (file) => (file.includes('/assets/themes/') ? false : undefined),
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: shellCommon },
            { name: (id: string) => (id.includes('/use-presence.') ? 'use-presence' : null) },
            { name: phoneFrame },
          ],
        },
      },
    },
  },
  preview: mode === 'mock' ? {} : { proxy: apiProxy },
  plugins: [
    ownCss('src/games/ishaara/index.tsx'),
    // The in-memory API for building and testing without the backend: `npm run dev:mock`, and the e2e server.
    ...(mode === 'mock' || process.env.MOCK_API ? [mockApiPlugin()] : []),
    react(),
    themeBoot(),
    themeCssBoot(),
    preloadShell(),
    pageMeta(),
    precompress(),
    VitePWA({
      // A new version waits behind the update gate until the player taps it; every change is saved, so the reload is safe.
      registerType: 'prompt',
      // The install icons are read by the OS once, at install, never by the app offline: no need to precache ~230 KB.
      includeAssets: ['favicon.svg'],
      includeManifestIcons: false,
      manifest: {
        // Pinned to what browsers derived from start_url, so installs keep their identity if start_url ever moves.
        id: '/',
        name: platform.name,
        short_name: platform.name,
        description: platform.description,
        lang: 'en',
        categories: ['games', 'utilities'],
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: splash,
        theme_color: splash,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        // One installed app; each live game is a long-press shortcut into its own path.
        shortcuts: GAME_IDS.map((id) => ({
          name: platform.games[id].name,
          url: `/${id}`,
          icons: [{ src: `games/${id}/icon-96.png`, sizes: '96x96', type: 'image/png' }],
        })),
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
    coverage: {
      provider: 'v8',
      include: ['src/games/*/domain/**', 'src/people/**'],
      reporter: ['text', 'html'],
    },
  },
}));
