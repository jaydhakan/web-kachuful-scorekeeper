// Usage: npm run build && node tools/lighthouse.mjs → reports/lighthouse/summary.md (mobile preset, simulated throttling).
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { preview } from 'vite';
import { gzipSync } from 'node:zlib';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'reports/lighthouse');
mkdirSync(out, { recursive: true });

const server = await preview({
  configFile: false,
  root,
  build: { outDir: path.join(root, 'dist') },
  preview: { port: 4310, strictPort: true, host: '127.0.0.1' },
});
const chrome = await chromeLauncher.launch({
  chromePath: '/usr/bin/google-chrome',
  chromeFlags: ['--headless=new', '--no-sandbox'],
});
try {
  const { lhr } = await lighthouse('http://127.0.0.1:4310/', {
    port: chrome.port,
    output: 'json',
    logLevel: 'error',
    formFactor: 'mobile',
    screenEmulation: {
      mobile: true,
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      disabled: false,
    },
  });
  writeFileSync(path.join(out, 'lighthouse.json'), JSON.stringify(lhr));
  const cat = (k) => Math.round((lhr.categories[k]?.score ?? 0) * 100);
  const a = (id) => lhr.audits[id]?.displayValue ?? 'n/a';

  // Initial JS = what index.html loads eagerly (not the lazy Winner/Share/Confetti chunks).
  const dist = path.join(root, 'dist');
  const html = readFileSync(path.join(dist, 'index.html'), 'utf8');
  const eager = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map((m) => m[1]);
  const gz = (f) => gzipSync(readFileSync(path.join(dist, f))).length;
  const initial = eager.reduce((n, f) => n + gz(f), 0);
  const all = readdirSync(path.join(dist, 'assets')).filter((f) => f.endsWith('.js'));
  const total = all.reduce((n, f) => n + gz('assets/' + f), 0);

  const md = [
    '# Lighthouse (mobile)',
    '',
    '| Category | Score |',
    '| --- | ---: |',
    `| Performance | ${cat('performance')} |`,
    `| Accessibility | ${cat('accessibility')} |`,
    `| Best practices | ${cat('best-practices')} |`,
    `| SEO | ${cat('seo')} |`,
    '',
    `FCP ${a('first-contentful-paint')} · LCP ${a('largest-contentful-paint')} · TBT ${a('total-blocking-time')} · CLS ${a('cumulative-layout-shift')} · TTI ${a('interactive')}`,
    '',
    `Initial JS (gzip): ${(initial / 1024).toFixed(1)} KB across ${eager.length} files (budget 150 KB). All JS incl. lazy chunks: ${(total / 1024).toFixed(1)} KB.`,
  ].join('\n');
  writeFileSync(path.join(out, 'summary.md'), md + '\n');
  console.log(md);
} finally {
  await chrome.kill();
  await server.close();
}
