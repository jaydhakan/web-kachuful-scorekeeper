// Usage: node tools/bundle.mjs [--check]  → reports/lighthouse/bundle.md
// Builds once and lists the biggest modules (minified, pre-gzip share of their chunk) and what the first load costs.
// With --check it exits 1 when the first load or any lazy chunk is over the budget in tools/budget.json.
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
/** @type {{ name: string, file: string, gz: number, entry: boolean, imports: string[] }[]} */
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
const entry = chunks.find((c) => c.entry);
// The first load is the entry plus everything it statically imports (index.html modulepreloads exactly these).
const eager = new Set();
const walk = (f) => {
  if (eager.has(f)) return;
  eager.add(f);
  byFile.get(f)?.imports.forEach(walk);
};
walk(entry.file);
const css = readFileSync(path.join(dist, 'index.html'), 'utf8').match(
  /href="\/(assets\/[^"]+\.css)"/,
)[1];
const cssGz = gzipSync(readFileSync(path.join(dist, css))).length;
rmSync(dist, { recursive: true, force: true });
const eagerGz = [...eager].reduce((n, f) => n + byFile.get(f).gz, 0);
const allGz = chunks.reduce((n, c) => n + c.gz, 0);
const kb = (n) => (n / 1024).toFixed(1);

const top = [...modules].sort((a, b) => b[1].size - a[1].size).slice(0, 15);
const lazy = chunks.filter((c) => !eager.has(c.file)).sort((a, b) => b.gz - a.gz);
const md = [
  '# Bundle',
  '',
  `First load (gzip): JS ${kb(eagerGz)} KB in ${eager.size} files · CSS ${kb(cssGz)} KB. Budget: JS ${budget.initialJsKb} KB, CSS ${budget.cssKb} KB.`,
  `All JS incl. lazy chunks: ${kb(allGz)} KB.`,
  '',
  '## Biggest modules (minified, before gzip)',
  '',
  '| Module | KB | Chunk | First load |',
  '| --- | ---: | --- | :---: |',
  ...top.map(
    ([id, m]) =>
      `| ${id} | ${kb(m.size)} | ${m.chunk.replace('assets/', '')} | ${eager.has(m.chunk) ? 'yes' : ''} |`,
  ),
  '',
  '## Chunks (gzip)',
  '',
  '| Chunk | KB | First load |',
  '| --- | ---: | :---: |',
  ...[...eager].map((f) => `| ${f.replace('assets/', '')} | ${kb(byFile.get(f).gz)} | yes |`),
  ...lazy.map((c) => `| ${c.file.replace('assets/', '')} | ${kb(c.gz)} | |`),
].join('\n');
writeFileSync(path.join(out, 'bundle.md'), md + '\n');
console.log(md);

if (process.argv.includes('--check')) {
  const fails = [];
  if (eagerGz / 1024 > budget.initialJsKb)
    fails.push(`first-load JS ${kb(eagerGz)} KB > ${budget.initialJsKb} KB`);
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
