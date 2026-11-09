// Usage: node tools/bundle.mjs [--check]  → reports/lighthouse/bundle.md
// Builds once and lists the biggest modules (minified, pre-gzip share of their chunk) and what the first load costs
// on a phone and on a large screen. With --check it exits 1 when either first load or any lazy chunk is over the budget
// in tools/budget.json.
import { build } from 'vite';
import { gzipSync } from 'node:zlib';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'reports/lighthouse');
mkdirSync(out, { recursive: true });
const budget = JSON.parse(readFileSync(path.join(import.meta.dirname, 'budget.json'), 'utf8'));

/** @type {Map<string, { size: number, chunk: string }>} */
const modules = new Map();
/** @type {{ name: string, file: string, gz: number, entry: boolean, src: string, imports: string[] }[]} */
const chunks = [];

const collect = {
  name: 'collect-module-sizes',
  /** @param {any} _opts @param {Record<string, any>} bundle */
  generateBundle(_opts, bundle) {
    for (const c of Object.values(bundle)) {
      if (c.type !== 'chunk') continue;
      chunks.push({
        name: c.name,
        file: c.fileName,
        gz: gzipSync(c.code).length,
        entry: c.isEntry,
        src: c.facadeModuleId ?? '',
        imports: c.imports,
      });
      for (const [id, m] of Object.entries(c.modules)) {
        const key = id
          .replace(/^\0/, '')
          .replace(/.*node_modules\//, '')
          .replace(root + '/', '');
        const prev = modules.get(key);
        modules.set(key, { size: (prev?.size ?? 0) + m.renderedLength, chunk: c.fileName });
      }
    }
  },
};

// Its own output folder, so a preview or e2e run serving dist/ is never pulled out from under.
const dist = mkdtempSync(path.join(tmpdir(), 'kachuful-bundle-'));
await build({
  root,
  logLevel: 'warn',
  plugins: [collect],
  build: { outDir: dist, emptyOutDir: true },
});

const byFile = new Map(chunks.map((c) => [c.file, c]));
// A first load is the entry and its static imports plus the shell for the screen, which index.html modulepreloads
// (preloadShell in vite.config.ts).
const closure = (from, seen = new Set()) => {
  for (const f of from)
    if (!seen.has(f)) {
      seen.add(f);
      closure(byFile.get(f)?.imports ?? [], seen);
    }
  return seen;
};
const shell = (src) => chunks.find((c) => c.src.endsWith(src)).file;
const base = closure(chunks.filter((c) => c.entry).map((c) => c.file));
const loads = {
  phone: closure([shell('/src/games/kachuful/components/PhoneShell.tsx')], new Set(base)),
  'large screen': closure([shell('/src/games/kachuful/screens/desk/DeskShell.tsx')], new Set(base)),
};
const jsBudget = { phone: budget.initialJsKb, 'large screen': budget.largeScreenJsKb };
const eager = new Set(Object.values(loads).flatMap((l) => [...l]));
const css = readFileSync(path.join(dist, 'index.html'), 'utf8').match(
  /href="\/(assets\/[^"]+\.css)"/,
)[1];
const cssGz = gzipSync(readFileSync(path.join(dist, css))).length;
rmSync(dist, { recursive: true, force: true });
const gzOf = (files) => [...files].reduce((n, f) => n + byFile.get(f).gz, 0);
const allGz = chunks.reduce((n, c) => n + c.gz, 0);
const kb = (n) => (n / 1024).toFixed(1);
const loadsOf = (f) =>
  base.has(f)
    ? 'both'
    : Object.keys(loads)
        .filter((k) => loads[k].has(f))
        .join(', ');

const top = [...modules].sort((a, b) => b[1].size - a[1].size).slice(0, 15);
const lazy = chunks.filter((c) => !eager.has(c.file)).sort((a, b) => b.gz - a.gz);
const md = [
  '# Bundle',
  '',
  `First load (gzip): ${Object.entries(loads)
    .map(([k, l]) => `${k} JS ${kb(gzOf(l))} KB in ${l.size} files (budget ${jsBudget[k]})`)
    .join(' · ')} · CSS ${kb(cssGz)} KB (budget ${budget.cssKb}).`,
  `All JS incl. lazy chunks: ${kb(allGz)} KB.`,
  '',
  '## Biggest modules (minified, before gzip)',
  '',
  '| Module | KB | Chunk | First load |',
  '| --- | ---: | --- | :---: |',
  ...top.map(
    ([id, m]) =>
      `| ${id} | ${kb(m.size)} | ${m.chunk.replace('assets/', '')} | ${loadsOf(m.chunk)} |`,
  ),
  '',
  '## Chunks (gzip)',
  '',
  '| Chunk | KB | First load |',
  '| --- | ---: | :---: |',
  ...[...eager].map(
    (f) => `| ${f.replace('assets/', '')} | ${kb(byFile.get(f).gz)} | ${loadsOf(f)} |`,
  ),
  ...lazy.map((c) => `| ${c.file.replace('assets/', '')} | ${kb(c.gz)} | |`),
].join('\n');
writeFileSync(path.join(out, 'bundle.md'), md + '\n');
console.log(md);

if (process.argv.includes('--check')) {
  const fails = [];
  for (const [k, l] of Object.entries(loads))
    if (gzOf(l) / 1024 > jsBudget[k])
      fails.push(`${k} first-load JS ${kb(gzOf(l))} KB > ${jsBudget[k]} KB`);
  if (cssGz / 1024 > budget.cssKb) fails.push(`CSS ${kb(cssGz)} KB > ${budget.cssKb} KB`);
  for (const c of lazy)
    if (c.gz / 1024 > budget.lazyChunkKb)
      fails.push(`${c.file} ${kb(c.gz)} KB > ${budget.lazyChunkKb} KB`);
  if (fails.length) {
    console.error('\nOver budget:\n  ' + fails.join('\n  '));
    process.exit(1);
  }
  console.log('\nWithin budget.');
}
