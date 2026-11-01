import { readFileSync } from 'node:fs';
import path from 'node:path';
import { THEME_IDS, type ThemeId } from './themes';

// The theme file is the source of truth, so the tokens are read from it rather than restated here.
const css = readFileSync(path.resolve(import.meta.dirname, '../styles/themes.css'), 'utf8');

/** One theme's colour tokens: its own block over Sunset Glass (which is also `:root`), with var() references followed. */
function tokens(id: ThemeId): Record<string, string> {
  const block = (sel: string) => {
    const at = css.indexOf(sel);
    const body = css.slice(css.indexOf('{', at) + 1, css.indexOf('\n}', at));
    return Object.fromEntries(
      [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
    );
  };
  const t = {
    ...block(":root,\n[data-theme='sunset-glass']"),
    ...block(`[data-theme='${id}'] {`),
  };
  const get = (k: string, depth = 0): string => {
    const v = t[k];
    const ref = /^var\((--[\w-]+)\)$/.exec(v ?? '');
    return ref && depth < 5 ? get(ref[1], depth + 1) : v;
  };
  return Object.fromEntries(Object.keys(t).map((k) => [k, get(k)]));
}

type RGBA = [number, number, number, number];
const parse = (c: string): RGBA => {
  const h = /^#([0-9a-f]{3,8})$/i.exec(c);
  if (h) {
    const s = h[1].length === 3 ? [...h[1]].map((x) => x + x).join('') : h[1];
    return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)).concat(1) as RGBA;
  }
  const r = /^rgba?\(([^)]+)\)$/.exec(c);
  if (r) {
    const [a, b, d, e = '1'] = r[1].split(',').map((x) => x.trim());
    return [+a, +b, +d, +e];
  }
  throw new Error('unparsed colour ' + c);
};
/** `top` composited over an opaque `bottom`, as the browser draws it. */
const over = (top: string, bottom: RGBA): RGBA => {
  const [r, g, b, a] = parse(top);
  return [r * a + bottom[0] * (1 - a), g * a + bottom[1] * (1 - a), b * a + bottom[2] * (1 - a), 1];
};
const lum = (c: RGBA) =>
  c
    .slice(0, 3)
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a: RGBA, b: RGBA) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/**
 * The baseline pairs from THEMES_SPEC.md §7, plus the status colours the app shows on its surfaces. Glass is measured
 * over the plain background (the brightest wallpaper blob is checked by screenshot, see DEVIATIONS.md).
 */
const cases = THEME_IDS.flatMap((id) => {
  const t = tokens(id);
  const bg = parse(t['--bg']);
  const panel = over(t['--panel'], bg);
  const s2 = parse(t['--surface-2']);
  const sheet = over(t['--sheet-bg'], bg);
  const fg = (k: string, on: RGBA) => over(t[k], on);
  const pairs: [string, RGBA, RGBA, number][] = [
    ['text-1 on bg', fg('--text-1', bg), bg, 4.5],
    ['text-2 on bg', fg('--text-2', bg), bg, 4.5],
    ['text-2 on panel', fg('--text-2', panel), panel, 4.5],
    ['text-2 on sheet', fg('--text-2', sheet), sheet, 4.5],
    ['text-3 on bg', fg('--text-3', bg), bg, 4.5],
    ['text-3 on surface-2', fg('--text-3', s2), s2, 4.5],
    ['on-brand on brand', parse(t['--on-brand']), parse(t['--brand']), 4.5],
    ['success on panel', fg('--success', panel), panel, 4.5],
    ['danger on panel', fg('--danger', panel), panel, 4.5],
    ['warning on bg', fg('--warning', bg), bg, 4.5],
    ['on-success on success', parse(t['--on-success']), parse(t['--success']), 4.5],
    ['on-danger on danger', parse(t['--on-danger']), parse(t['--danger']), 4.5],
    [
      'toast text on toast',
      fg('--toast-fg', over(t['--toast-bg'], bg)),
      over(t['--toast-bg'], bg),
      4.5,
    ],
    ['on-gold on gold', parse(t['--on-gold']), parse(t['--medal-gold']), 4.5],
    ['card ink on card', parse(t['--card-fg']), parse(t['--card-bg']), 4.5],
    ['card red on card', parse(t['--card-red']), parse(t['--card-bg']), 4.5],
    // A large glyph, so the 3:1 large-text bar (THEMES_SPEC.md §7 lists Yerba Sun's heart at 3.9).
    ['heart on the table', parse(t['--suit-red-felt']), parse(t['--felt']), 3],
  ];
  return pairs.map(([name, a, b, min]) => [`${id}: ${name}`, a, b, min] as const);
});

describe('every theme meets WCAG AA for its text pairs', () => {
  it.each(cases)('%s', (_name, fg, bg, min) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});
