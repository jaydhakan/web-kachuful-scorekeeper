import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const COMPOSITED = /^(transform|opacity)$/;
const BAD_KEYS = /\b(width|height|backgroundColor|boxShadow|color|top|left)\s*:/;
const BAD_KEYFRAME = /\b(box-shadow|text-shadow|width|height|background(-color)?)\s*:/;

/** Animations that leave the compositor: each finding is `file: what`. */
function offenders(): string[] {
  const out: string[] = [];
  const rel = (f: string) => path.relative(root, f).split(path.sep).join('/');
  for (const f of walk(root).filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx'))) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/transition-(colors|shadow|all)\b/g))
      out.push(`${rel(f)}: ${m[0]}`);
    for (const m of src.matchAll(/transition-\[([^\]]+)\]/g))
      if (!m[1].split(',').every((p) => COMPOSITED.test(p.trim()))) out.push(`${rel(f)}: ${m[0]}`);
    for (const m of src.matchAll(/\b(animate|whileTap|whileHover|initial|exit)=\{\{([^}]*)\}/g)) {
      const k = BAD_KEYS.exec(m[2]);
      if (k) out.push(`${rel(f)}: ${m[1]} ${k[1]}`);
    }
  }
  for (const f of walk(root).filter((f) => f.endsWith('.css'))) {
    const css = readFileSync(f, 'utf8');
    for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\n\}/g)) {
      const k = BAD_KEYFRAME.exec(m[2]);
      if (k) out.push(`${rel(f)}: @keyframes ${m[1]} ${k[1]}`);
    }
    for (const m of css.matchAll(/transition:([^;]*);/g))
      for (const item of m[1].split(/,(?![^(]*\))/)) {
        const prop = item.trim().split(/\s+/)[0];
        if (prop.startsWith('--')) out.push(`${rel(f)}: transition ${prop}`);
      }
  }
  return out;
}

// Inherited from the prototype; Phase 2 Tier C removes each one. Must end empty.
const ALLOWED = new Set<string>([
  'components/ui/IconButton.tsx: whileHover backgroundColor',
  'components/ui/PrimaryButton.tsx: transition-[background,color,box-shadow]',
  'screens/round/Results.tsx: transition-colors',
  'screens/setup/Step2.tsx: transition-shadow',
  'sheets/MenuBody.tsx: whileTap backgroundColor',
  'styles/index.css: @keyframes ringp box-shadow',
  'styles/index.css: @keyframes warnp box-shadow',
  'styles/index.css: @keyframes sg text-shadow',
  'styles/index.css: transition --accent',
  'styles/index.css: transition --glow',
]);

describe('animations stay on transform and opacity', () => {
  const found = offenders();

  it('adds no new non-composited animation', () => {
    expect(found.filter((o) => !ALLOWED.has(o))).toEqual([]);
  });

  it('keeps the allowlist honest (remove entries once fixed)', () => {
    expect([...ALLOWED].filter((a) => !found.includes(a))).toEqual([]);
  });
});
