// Usage: npm run build && node tools/trace.mjs
// Records a Chrome trace at 4x CPU throttle through the key transitions and reports long tasks (>50 ms) and forced layouts.
import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'reports/lighthouse');
mkdirSync(out, { recursive: true });
const server = await preview({
  configFile: false,
  root,
  build: { outDir: path.join(root, 'dist') },
  preview: { port: 4311, strictPort: true, host: '127.0.0.1' },
});
const browser = await chromium.launch({ channel: 'chrome' });
const traceFile = path.join(out, 'trace.json');

try {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    serviceWorkers: 'block',
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto('http://127.0.0.1:4311/');
  await page.waitForTimeout(1500);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await browser.startTracing(page, {
    path: traceFile,
    categories: [
      'devtools.timeline',
      'disabled-by-default-devtools.timeline',
      'v8.execute',
      'blink.user_timing',
    ],
  });

  const click = async (name, ms = 700) => {
    await page.getByRole('button', { name, exact: true }).first().click();
    await page.waitForTimeout(ms);
  };
  await page.getByText('Resume game').click();
  await page.waitForTimeout(900);
  await click('Bid 1');
  await click('Bid 1');
  await click('Bid 3');
  await click('Menu', 900);
  await click('Close', 700);
  await click('Scoreboard', 900);
  await click('Close', 700);
  await click('Start playing', 900);
  await click('Enter results', 900);
  const made = page.getByText('✓ Made');
  const missed = page.getByText('✗ Missed');
  await made.nth(0).click();
  await missed.nth(1).click();
  await made.nth(2).click();
  await missed.nth(3).click();
  await missed.nth(4).click();
  await page.waitForTimeout(500);
  await click('Confirm round', 4200); // summary count-up, rank reorder
  await click('Next round', 6000); // deal sequence
  await browser.stopTracing();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
} finally {
  await browser.close();
  await server.close();
}

const events = JSON.parse(readFileSync(traceFile, 'utf8')).traceEvents;
const main = events.find((e) => e.name === 'thread_name' && e.args?.name === 'CrRendererMain');
const isMain = (e) => main && e.pid === main.pid && e.tid === main.tid;
const tasks = events.filter((e) => e.name === 'RunTask' && e.ph === 'X' && isMain(e));
const long = tasks.filter((e) => e.dur > 50_000).sort((a, b) => b.dur - a.dur);
// A layout whose begin data carries a JS stack was forced by script (read-after-write).
const layouts = events.filter(
  (e) => e.name === 'Layout' && (e.ph === 'X' || e.ph === 'B') && isMain(e),
);
const forced = layouts.filter((e) => e.args?.beginData?.stackTrace?.length);
const md = [
  '# Trace at 4x CPU throttle',
  '',
  'Flow: resume → 3 bids → menu and scoreboard sheets → play → results → confirm round (summary count-up) → next round (deal sequence).',
  '',
  `Main-thread tasks: ${tasks.length}. Longest: ${tasks.length ? (Math.max(...tasks.map((t) => t.dur)) / 1000).toFixed(1) : 0} ms.`,
  `Long tasks over 50 ms: ${long.length}${
    long.length
      ? ' (' +
        long
          .slice(0, 5)
          .map((t) => (t.dur / 1000).toFixed(0) + ' ms')
          .join(', ') +
        ')'
      : ''
  }.`,
  `Layout passes: ${layouts.length}. Forced (script-triggered) layouts: ${forced.length}.`,
].join('\n');
writeFileSync(path.join(out, 'trace-summary.md'), md + '\n');
console.log(md);
