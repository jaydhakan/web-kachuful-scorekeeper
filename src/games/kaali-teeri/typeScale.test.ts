import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import config from '../../../tailwind.config';

// A `text-<n>` the type scale doesn't define generates no CSS, so the text silently inherits its parent's size
// (Kaali Teeri's mono labels drew at 16px instead of 12). Every size used here must be on the scale.
const scale = new Set(Object.keys(config.theme.extend.fontSize));

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) ? [p] : [];
  });
}

it('every text size in Kaali Teeri is on the type scale', () => {
  const off: string[] = [];
  for (const file of sources(import.meta.dirname))
    for (const m of readFileSync(file, 'utf8').matchAll(/(?<![\w-])text-(\d+)(?![\w-])/g))
      if (!scale.has(m[1])) off.push(`${path.relative(import.meta.dirname, file)}: text-${m[1]}`);
  expect(off).toEqual([]);
});
