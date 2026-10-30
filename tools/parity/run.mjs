// Usage: node tools/parity/run.mjs   → reports/parity/{proto,app,diff}/*.png and report.md
import { chromium } from '@playwright/test';
import { preview } from 'vite';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { buildBoth } from './build.mjs';
import { FIXED_TIME } from './fixture.mjs';
import { scenarios, seeds } from './scenarios.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const out = path.join(root, 'reports/parity');
const apps = [
  { id: 'proto', dir: 'proto-dist', port: 4301 },
  { id: 'app', dir: 'app-dist', port: 4302 },
];

if (!process.env.SKIP_BUILD) await buildBoth();
for (const d of ['proto', 'app', 'diff']) {
  rmSync(path.join(out, d), { recursive: true, force: true });
  mkdirSync(path.join(out, d), { recursive: true });
}

const servers = await Promise.all(
  apps.map((a) =>
    preview({
      configFile: false,
      root,
      build: { outDir: path.join(out, a.dir) },
      preview: { port: a.port, strictPort: true, host: '127.0.0.1' },
    }),
  ),
);
const browser = await chromium.launch({ channel: 'chrome' });
const names = new Set();

try {
  for (const app of apps) {
    for (const sc of scenarios) {
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
        serviceWorkers: 'block',
        timezoneId: 'UTC',
        locale: 'en-US',
      });
      const page = await ctx.newPage();
      await page.clock.setFixedTime(FIXED_TIME);
      await page.addInitScript((seed) => {
        if (localStorage.getItem('__seeded')) return;
        localStorage.setItem('__seeded', '1');
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, JSON.stringify(v));
      }, seeds[sc.seed]);
      await page.goto(`http://127.0.0.1:${app.port}/`);
      await page.waitForTimeout(1500);
      const shot = async (name) => {
        await page.waitForTimeout(500);
        names.add(name);
        await page.screenshot({
          path: path.join(out, app.id, name + '.png'),
          animations: 'disabled',
          caret: 'hide',
        });
      };
      await sc.run({ page, shot });
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  await Promise.all(servers.map((s) => s.close()));
}

const rows = [];
for (const name of [...names]) {
  const a = PNG.sync.read(readFileSync(path.join(out, 'proto', name + '.png')));
  const b = PNG.sync.read(readFileSync(path.join(out, 'app', name + '.png')));
  const diff = new PNG({ width: a.width, height: a.height });
  const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
  const pct = (n / (a.width * a.height)) * 100;
  writeFileSync(path.join(out, 'diff', name + '.png'), PNG.sync.write(diff));
  rows.push({ name, pct });
}
rows.sort((x, y) => y.pct - x.pct);
const md = [
  '# Visual parity: prototype vs port (390×844)',
  '',
  'Both apps seeded with the same demo fixture, clock fixed to 2026-01-01T12:00Z, `prefers-reduced-motion: reduce` so infinite animations are static, same self-hosted fonts.',
  '',
  '| Screen | Diff % |',
  '| --- | ---: |',
  ...rows.map((r) => `| ${r.name} | ${r.pct.toFixed(3)}${r.pct > 1 ? ' ⚠' : ''} |`),
  '',
  `Screens: ${rows.length}. Above 1%: ${rows.filter((r) => r.pct > 1).length}. Worst: ${rows[0]?.name} (${rows[0]?.pct.toFixed(3)}%).`,
].join('\n');
writeFileSync(path.join(out, 'report.md'), md + '\n');
console.log(md);
