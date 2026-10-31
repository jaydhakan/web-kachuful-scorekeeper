// Renders public/icon*.png from the SVG sources. Run once; the PNGs are committed.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pub = path.resolve(import.meta.dirname, '../public');
const jobs = [
  ['icon.svg', 'pwa-192.png', 192],
  ['icon.svg', 'pwa-512.png', 512],
  ['icon.svg', 'apple-touch-icon.png', 180],
  ['icon-maskable.svg', 'pwa-maskable-512.png', 512],
];

const browser = await chromium.launch({ channel: 'chrome' });
for (const [src, out, size] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const svg = readFileSync(path.join(pub, src), 'utf8');
  await page.setContent(
    `<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  await page.screenshot({ path: path.join(pub, out), omitBackground: false });
  await page.close();
}
await browser.close();
console.log('icons written');
