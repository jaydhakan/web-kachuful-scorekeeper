// Usage: npm run build && node tools/trace.mjs   (CPU=6 for a slower phone; the default throttle is 4x)
// Records a Chrome trace at 4x CPU throttle through the key transitions and reports long tasks (>50 ms), forced
// layouts and, per transition, frames that missed the 60 Hz budget, the slowest interaction (Event Timing, as INP
// measures it) and React commits. Component names need an unminified build:
//   npx vite build --minify false --outDir dist-profile && DIST=dist-profile node tools/trace.mjs
/* global window, requestAnimationFrame -- the evaluated callbacks run in the page */
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
  build: { outDir: path.join(root, process.env.DIST ?? 'dist') },
  preview: { port: 4311, strictPort: true, host: '127.0.0.1' },
});
const browser = await chromium.launch({ channel: 'chrome' });
const traceFile = path.join(out, 'trace.json');
const RATE = Number(process.env.CPU ?? 4);
/** @type {number[]} */
let frames = [];
/** @type {{ name: string, at: number, ev: number, commits: number }[]} */
let phases = [];
/** @type {{ id: number, dur: number }[]} */
let events = [];
/** @type {number[]} */
let commits = [];
/** @type {Record<string, number>} */
let renders = {};

try {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    serviceWorkers: 'block',
  });
  // Every frame's interval, from the page's own clock; phases mark where each transition starts.
  await ctx.addInitScript(() => {
    const w = /** @type {any} */ (window);
    w.__frames = [];
    let last = 0;
    const loop = (t) => {
      if (last) w.__frames.push(t - last);
      last = t;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    // Every input that counts towards INP, with its full latency (input delay + handlers + next paint).
    w.__events = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        if (e.interactionId) w.__events.push({ id: e.interactionId, dur: e.duration });
    }).observe({ type: 'event', durationThreshold: 16, buffered: true });
    // A stand-in for the React DevTools hook: counts the components that rendered in each commit, the way DevTools
    // decides it (PerformedWork flag; a subtree whose child pointer is unchanged bailed out and is skipped).
    w.__commits = [];
    w.__renders = {};
    const nameOf = (f) => {
      const t = f.type;
      return t?.displayName || t?.name || t?.type?.name || t?.render?.name || 'Anonymous';
    };
    const walk = (next, prev, acc) => {
      if ([0, 1, 11, 14, 15].includes(next.tag) && (!prev || next.flags & 1)) {
        acc.n++;
        const k = nameOf(next);
        w.__renders[k] = (w.__renders[k] ?? 0) + 1;
      }
      if (prev && next.child === prev.child) return;
      for (let c = next.child; c; c = c.sibling) walk(c, c.alternate, acc);
    };
    w.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true,
      isDisabled: false,
      renderers: new Map(),
      inject: () => 1,
      checkDCE() {},
      onCommitFiberUnmount() {},
      onPostCommitFiberRoot() {},
      onCommitFiberRoot(_id, root) {
        const acc = { n: 0 };
        walk(root.current, root.current.alternate, acc);
        w.__commits.push(acc.n);
      },
    };
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto('http://127.0.0.1:4311/');
  await page.waitForTimeout(1500);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
  await browser.startTracing(page, {
    path: traceFile,
    categories: [
      'devtools.timeline',
      'disabled-by-default-devtools.timeline',
      'v8.execute',
      'blink.user_timing',
    ],
  });

  const marks = [];
  const at = () =>
    page.evaluate(() => {
      const w = /** @type {any} */ (window);
      return { at: w.__frames.length, ev: w.__events.length, commits: w.__commits.length };
    });
  const phase = async (name) => marks.push({ name, ...(await at()) });
  const click = async (name, ms = 700) => {
    await page.getByRole('button', { name, exact: true }).first().click();
    await page.waitForTimeout(ms);
  };
  await phase('Resume the game');
  await page.getByText(/Resume game|Try the demo/).click();
  await page.waitForTimeout(900);
  await phase('Three bids');
  await click('Bid 1');
  await click('Bid 1');
  await click('Bid 3');
  await phase('Menu sheet open and close');
  await click('Menu', 900);
  await click('Close', 700);
  await phase('Scoreboard sheet open and close');
  await click('Scoreboard', 900);
  await click('Close', 700);
  await phase('Play, then results');
  await click('Start playing', 900);
  await click('Enter results', 900);
  await phase('Marking results');
  const made = page.getByText('✓ Made');
  const missed = page.getByText('✗ Missed');
  await made.nth(0).click();
  await missed.nth(1).click();
  await made.nth(2).click();
  await missed.nth(3).click();
  await missed.nth(4).click();
  await page.waitForTimeout(500);
  await phase('Confirm round: summary count-up and reorder');
  await click('Confirm round', 4200);
  await phase('Next round: the deal sequence');
  await click('Next round', 6000);
  await phase('Quit to Home');
  await click('Menu', 900);
  await click('Quit to home', 1500);
  await phase('History page in and out');
  await page
    .getByRole('button', { name: /History/ })
    .first()
    .click();
  await page.waitForTimeout(1200);
  await page.goBack();
  await page.waitForTimeout(1000);
  await phase('Boards page in and out');
  await page
    .getByRole('button', { name: /Boards/ })
    .first()
    .click();
  await page.waitForTimeout(1200);
  await page.goBack();
  await page.waitForTimeout(1000);
  marks.push({ name: 'end', ...(await at()) });
  ({ frames, events, commits, renders } = await page.evaluate(() => {
    const w = /** @type {any} */ (window);
    return { frames: w.__frames, events: w.__events, commits: w.__commits, renders: w.__renders };
  }));
  phases = marks;
  await browser.stopTracing();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
} finally {
  await browser.close();
  await server.close();
}

const trace = JSON.parse(readFileSync(traceFile, 'utf8')).traceEvents;
const main = trace.find((e) => e.name === 'thread_name' && e.args?.name === 'CrRendererMain');
const isMain = (e) => main && e.pid === main.pid && e.tid === main.tid;
const tasks = trace.filter((e) => e.name === 'RunTask' && e.ph === 'X' && isMain(e));
const long = tasks.filter((e) => e.dur > 50_000).sort((a, b) => b.dur - a.dur);
// A layout whose begin data carries a JS stack was forced by script (read-after-write).
const layouts = trace.filter(
  (e) => e.name === 'Layout' && (e.ph === 'X' || e.ph === 'B') && isMain(e),
);
const forced = layouts.filter((e) => e.args?.beginData?.stackTrace?.length);
const md = [
  `# Trace at ${RATE}x CPU throttle`,
  '',
  'Flow: resume → 3 bids → menu and scoreboard sheets → play → results → confirm round (summary count-up) → next round (deal sequence) → Home → History and Boards pages.',
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
  '',
  `Slowest interaction (INP for this flow): ${Math.max(0, ...events.map((e) => e.dur))} ms over ${new Set(events.map((e) => e.id)).size} interactions. React commits: ${commits.length}, components rendered: ${commits.reduce((a, b) => a + b, 0)}.`,
  '',
  '## Per transition',
  '',
  'A frame over 25 ms missed at least one 60 Hz refresh (a visible hitch). Interaction = worst Event Timing duration.',
  '',
  '| Transition | Frames | Over 25 ms | Worst frame | Worst interaction | Commits | Components rendered |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...phases.slice(0, -1).map((p, i) => {
    const n = phases[i + 1];
    const f = frames.slice(p.at, n.at);
    const late = f.filter((d) => d > 25).length;
    const ev = events.slice(p.ev, n.ev);
    const c = commits.slice(p.commits, n.commits);
    return `| ${p.name} | ${f.length} | ${late} (${f.length ? ((late / f.length) * 100).toFixed(1) : 0}%) | ${f.length ? Math.max(...f).toFixed(0) : 0} ms | ${ev.length ? Math.max(...ev.map((e) => e.dur)) + ' ms' : '–'} | ${c.length} | ${c.reduce((a, b) => a + b, 0)} |`;
  }),
  '',
  '## Most rendered components',
  '',
  '| Component | Renders |',
  '| --- | ---: |',
  ...Object.entries(renders)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([k, v]) => `| ${k} | ${v} |`),
].join('\n');
writeFileSync(
  path.join(out, process.env.DIST ? 'trace-profile.md' : 'trace-summary.md'),
  md + '\n',
);
console.log(md);
