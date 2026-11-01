// Usage: npm run build && node tools/lighthouse.mjs [--check]  → reports/lighthouse/summary.md
// A Lighthouse user flow, mobile preset (Slow 4G, 4x CPU), run RUNS times (default 3) and reported as medians:
// first visit, a returning visit mid-game (saved game, no HTTP cache), a played round as a timespan (INP), and the tablet UI.
// With --check it exits 1 when a step misses the targets in tools/budget.json.
/* global document -- the evaluated callbacks run in the page */
import lighthouse, { startFlow } from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { preview } from 'vite';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'reports/lighthouse');
mkdirSync(out, { recursive: true });
const budget = JSON.parse(readFileSync(path.join(import.meta.dirname, 'budget.json'), 'utf8'));
const RUNS = Number(process.env.RUNS ?? 3);
const URL = 'http://127.0.0.1:4310/';
// THROTTLE=devtools applies the same Slow 4G + 4x CPU for real to every step instead of simulating navigations.
const APPLIED = process.env.THROTTLE === 'devtools';

const phone = { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false };
const tablet = { mobile: true, width: 820, height: 1180, deviceScaleFactor: 2, disabled: false };
// Timespans cannot be simulated, so the interaction step applies DevTools' Slow 4G and 4x CPU for real.
const applied = {
  throttlingMethod: 'devtools',
  throttling: {
    cpuSlowdownMultiplier: 4,
    requestLatencyMs: 562.5,
    downloadThroughputKbps: 1474.56,
    uploadThroughputKbps: 675,
  },
};

/** One flow; returns { step name: { score, fcp, lcp, tbt, cls, si, inp, bytes } }. */
async function run(port) {
  const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${port}` });
  const page = await browser.newPage();
  const flow = await startFlow(page, {
    config: lighthouse.defaultConfig,
    flags: { screenEmulation: phone, ...(APPLIED ? applied : {}) },
  });
  // Real pointer input at the button's centre: Event Timing (and so INP) ignores script-dispatched clicks.
  const click = async (text, ms = 700, nth = 0) => {
    let at = null;
    for (let tries = 0; !at && tries < 25; tries++) {
      if (tries) await new Promise((r) => setTimeout(r, 200));
      at = await page.evaluate(
        (text, nth) => {
          const all = [...document.querySelectorAll('button, [role="button"]')].filter((b) =>
            b.checkVisibility(),
          );
          const exact = all.filter(
            (b) => b.getAttribute('aria-label') === text || b.textContent?.trim() === text,
          );
          const b = (exact.length ? exact : all.filter((b) => b.textContent?.includes(text)))[nth];
          if (!b) return null;
          const r = b.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        },
        text,
        nth,
      );
    }
    if (!at) {
      const seen = await page.evaluate(() =>
        [...document.querySelectorAll('button')].map(
          (b) => b.getAttribute('aria-label') ?? b.textContent?.trim(),
        ),
      );
      throw new Error(`No button "${text}" among: ${seen.join(' | ')}`);
    }
    await page.mouse.click(at.x, at.y);
    await new Promise((r) => setTimeout(r, ms));
  };

  // Lighthouse's own reset keeps localStorage, so every run starts from a truly new device.
  const cdp = await page.createCDPSession();
  await cdp.send('Storage.clearDataForOrigin', { origin: URL.slice(0, -1), storageTypes: 'all' });
  await flow.navigate(URL, { name: 'Home, first visit' });
  await click('Try the demo', 1500);
  // A returning player reopens mid-game: the saved game is on the device, the HTTP and service-worker caches are not.
  await cdp.send('Storage.clearDataForOrigin', {
    origin: URL.slice(0, -1),
    storageTypes: 'cache_storage,service_workers',
  });
  await cdp.send('Network.clearBrowserCache');
  await flow.navigate(URL, { name: 'Game, returning', disableStorageReset: true });

  await flow.startTimespan({ name: 'Play a round', ...applied });
  for (const b of ['Bid 1', 'Bid 1', 'Bid 3']) await click(b, 600);
  await click('Scoreboard', 800);
  await click('Close', 600);
  await click('Start playing', 800);
  await click('Enter results', 800);
  for (const [mark, nth] of [
    ['Made', 0],
    ['Missed', 1],
    ['Made', 2],
    ['Missed', 3],
    ['Missed', 4],
  ])
    await click(mark, 400, nth);
  await click('Confirm round', 4000);
  await flow.endTimespan();

  await cdp.send('Storage.clearDataForOrigin', { origin: URL.slice(0, -1), storageTypes: 'all' });
  await cdp.send('Network.clearBrowserCache');
  await flow.navigate(URL, { name: 'Tablet UI, first visit', screenEmulation: tablet });

  const result = await flow.createFlowResult();
  writeFileSync(path.join(out, 'flow.json'), JSON.stringify(result));
  writeFileSync(path.join(out, 'flow.html'), await flow.generateReport());
  await page.close();
  await browser.disconnect();
  return Object.fromEntries(
    result.steps.map(({ name, lhr }) => {
      const n = (id) => lhr.audits[id]?.numericValue;
      return [
        name,
        {
          score:
            lhr.categories.performance?.score == null
              ? undefined
              : lhr.categories.performance.score * 100,
          fcp: n('first-contentful-paint'),
          lcp: n('largest-contentful-paint'),
          tbt: n('total-blocking-time'),
          cls: n('cumulative-layout-shift'),
          si: n('speed-index'),
          inp: n('interaction-to-next-paint'),
          bytes: n('total-byte-weight'),
        },
      ];
    }),
  );
}

const server = await preview({
  configFile: false,
  root,
  build: { outDir: path.join(root, 'dist') },
  preview: { port: 4310, strictPort: true, host: '127.0.0.1' },
});
const chrome = await chromeLauncher.launch({
  chromePath: process.env.CHROME_PATH,
  chromeFlags: ['--headless=new', '--no-sandbox'],
});
const runs = [];
try {
  for (let i = 0; i < RUNS; i++) runs.push(await run(chrome.port));
} finally {
  await chrome.kill();
  await server.close();
}

const mode = APPLIED ? 'applied' : 'simulated';
const median = (xs) => {
  const s = xs.filter((x) => x != null).sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : undefined;
};
const steps = Object.keys(runs[0]);
const med = Object.fromEntries(
  steps.map((s) => [
    s,
    Object.fromEntries(Object.keys(runs[0][s]).map((k) => [k, median(runs.map((r) => r[s][k]))])),
  ]),
);
const ms = (v) =>
  v == null ? '–' : v >= 1000 ? (v / 1000).toFixed(2) + ' s' : Math.round(v) + ' ms';
const md = [
  `# Lighthouse user flow (mobile, Slow 4G, 4x CPU, ${mode} throttling), median of ${RUNS}`,
  '',
  APPLIED
    ? 'Every step runs under DevTools throttling applied for real.'
    : 'Navigations use Lighthouse\'s simulated throttling; "Play a round" is a timespan with DevTools throttling applied (INP comes only from timespans).',
  '',
  '| Step | Perf | FCP | LCP | TBT | CLS | Speed Index | INP | Transfer |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...steps.map((s) => {
    const m = med[s];
    return `| ${s} | ${m.score == null ? '–' : Math.round(m.score)} | ${ms(m.fcp)} | ${ms(m.lcp)} | ${ms(m.tbt)} | ${m.cls == null ? '–' : m.cls.toFixed(3)} | ${ms(m.si)} | ${ms(m.inp)} | ${m.bytes == null ? '–' : (m.bytes / 1024).toFixed(0) + ' KB'} |`;
  }),
].join('\n');
writeFileSync(path.join(out, APPLIED ? 'summary-applied.md' : 'summary.md'), md + '\n');
writeFileSync(path.join(out, 'flow-runs.json'), JSON.stringify(runs, null, 1));
console.log(md);

if (process.argv.includes('--check')) {
  const fails = [];
  for (const [s, m] of Object.entries(med)) {
    if (m.score != null && m.score < budget.performance)
      fails.push(`${s}: Performance ${Math.round(m.score)} < ${budget.performance}`);
    if (m.lcp != null && m.lcp > budget.lcpMs)
      fails.push(`${s}: LCP ${ms(m.lcp)} > ${budget.lcpMs} ms`);
    if (m.tbt != null && m.tbt > budget.tbtMs)
      fails.push(`${s}: TBT ${ms(m.tbt)} > ${budget.tbtMs} ms`);
    if (m.cls != null && m.cls > budget.cls)
      fails.push(`${s}: CLS ${m.cls.toFixed(3)} > ${budget.cls}`);
    if (m.inp != null && m.inp > budget.inpMs)
      fails.push(`${s}: INP ${ms(m.inp)} > ${budget.inpMs} ms`);
  }
  if (fails.length) {
    console.error('\nMissed targets:\n  ' + fails.join('\n  '));
    process.exit(1);
  }
  console.log('\nAll targets met.');
}
