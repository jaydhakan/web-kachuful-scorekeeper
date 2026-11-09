// Renders the icon PNGs and favicon.ico in public/ from their SVG sources. Run after changing an SVG; the output is
// committed. The OG images have no SVG source in the kit, so they are copied as PNGs and not rendered here.
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const pub = path.join(root, 'public');
const brand = path.join(root, 'design/brand');
const GAMES = ['kachuful', 'kaali-teeri', 'ishaara'];

/** [source SVG, output PNG, size], paths from the repo root. */
const jobs = [
  // Kachuful's icons before the platform; kept one release for installed apps (docs/PLATFORM-PLAN.md §5.4).
  ['public/icon.svg', 'public/pwa-192.png', 192],
  ['public/icon.svg', 'public/pwa-512.png', 512],
  ['public/icon-maskable.svg', 'public/pwa-maskable-512.png', 512],
  // The platform (design/brand/README.md). The 16px favicon has its own pixel-tuned drawing.
  ['design/brand/platform/favicon-16.svg', 'public/favicon-16.png', 16],
  ['design/brand/platform/favicon-32.svg', 'public/favicon-32.png', 32],
  ['design/brand/platform/apple-touch-icon.svg', 'public/apple-touch-icon.png', 180],
  ['design/brand/platform/icon.svg', 'public/icon-192.png', 192],
  ['design/brand/platform/icon.svg', 'public/icon-512.png', 512],
  ['design/brand/platform/icon-maskable.svg', 'public/icon-maskable-512.png', 512],
  // Each game: the rounded tile, the full-bleed versions, and 96px for the manifest's shortcuts.
  ...GAMES.flatMap((g) => [
    [`design/brand/games/${g}/icon.svg`, `public/games/${g}/icon-512.png`, 512],
    [`design/brand/games/${g}/icon.svg`, `public/games/${g}/icon-96.png`, 96],
    [`design/brand/games/${g}/icon-maskable.svg`, `public/games/${g}/icon-maskable-512.png`, 512],
    [`design/brand/games/${g}/icon-maskable.svg`, `public/games/${g}/apple-touch-icon.png`, 180],
  ]),
];

const browser = await chromium.launch({ channel: 'chrome' });
for (const [src, out, size] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const svg = readFileSync(path.join(root, src), 'utf8');
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  // Transparent outside a rounded tile; the full-bleed sources paint every pixel anyway.
  await page.screenshot({ path: path.join(root, out), omitBackground: true });
  await page.close();
}
await browser.close();

/** An .ico holding PNG images as they are (supported by every browser that asks for /favicon.ico). */
function ico(pngs) {
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(pngs.length, 4);
  let offset = head.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size, e);
    head.writeUInt8(size, e + 1);
    head.writeUInt16LE(1, e + 4);
    head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(data.length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...pngs.map((p) => p.data)]);
}
writeFileSync(
  path.join(pub, 'favicon.ico'),
  ico(
    [16, 32].map((size) => ({ size, data: readFileSync(path.join(pub, `favicon-${size}.png`)) })),
  ),
);
console.log(`${jobs.length} icons and favicon.ico written from ${path.relative(root, brand)}`);
