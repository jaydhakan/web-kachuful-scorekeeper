import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

// Tailwind's default screens are replaced by src/theme/breakpoints.ts, so `sm:`, `lg:` and `xl:` generate no CSS and
// a layout written with them silently never applies.
const root = path.resolve(import.meta.dirname, '..');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

it('uses only the repo’s breakpoint names, never sm:, lg: or xl:', () => {
  const hits = walk(root)
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
    .flatMap((f) =>
      [...readFileSync(f, 'utf8').matchAll(/["'` ](sm|lg|xl|2xl):[a-z![-]/g)].map(
        (m) => `${path.relative(root, f)}: ${m[0].trim()}`,
      ),
    );
  expect(hits).toEqual([]);
});
