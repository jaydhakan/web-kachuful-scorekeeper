import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { THEME_IDS, type ThemeId } from './themes';

// The theme files are the source of truth, so the tokens are read from them rather than restated here: themes.css
// (shared and the default) and each other theme's own sheet.
const styles = path.resolve(import.meta.dirname, '../styles');
const css = [
  readFileSync(path.join(styles, 'themes.css'), 'utf8'),
  ...readdirSync(path.join(styles, 'themes')).map((f) =>
    readFileSync(path.join(styles, 'themes', f), 'utf8'),
  ),
].join('\n');

/** One theme's colour tokens: its own block over Sunset Glass (which is also `:root`), with var() references followed. */
function tokens(id: ThemeId): Record<string, string> {
  const block = (sel: string) => {
    const at = css.indexOf(sel);
    // A missing block would quietly test another theme's tokens.
    if (at < 0) throw new Error(`no token block ${sel}`);
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
  if (c === 'transparent') return [0, 0, 0, 0];
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
 * The baseline pairs from DESIGN-SYSTEM.md, Contrast, plus the status colours the app shows on its surfaces. Glass is measured
 * over the plain background (the brightest wallpaper blob is checked by screenshot).
 */
const cases = THEME_IDS.flatMap((id) => {
  const t = tokens(id);
  const bg = parse(t['--bg']);
  const panel = over(t['--panel'], bg);
  const s2 = parse(t['--surface-2']);
  const sheet = over(t['--sheet-bg'], bg);
  const fg = (k: string, on: RGBA) => over(t[k], on);
  const tint = (k: string, on: RGBA): RGBA => {
    const [r, g, b] = parse(t[k]);
    return over(`rgba(${r}, ${g}, ${b}, 0.1)`, on);
  };
  const soon = over(t['--soon-bg'], panel);
  // Word cards' stripes (--word-stripe) over the card, where ink is hardest to read.
  const hatch = (k: string) => over(t['--word-stripe'], parse(t[k]));
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
    // A large glyph, so the 3:1 large-text bar (DESIGN-SYSTEM.md, Contrast lists Yerba Sun's heart at 3.9).
    ['heart on the table', parse(t['--suit-red-felt']), parse(t['--felt']), 3],
    ['card count on the table', fg('--ctr-fg', parse(t['--felt'])), parse(t['--felt']), 4.5],
    // The offline chip is warning text on its own 10% tint, so it needs no status token of its own.
    ['warning on its tint', fg('--warning', tint('--warning', bg)), tint('--warning', bg), 4.5],
    // Game accents may label a landing card, on the page or on the card.
    ...(['kachuful', 'kaali-teeri', 'ishaara'] as const).flatMap(
      (g): [string, RGBA, RGBA, number][] => [
        [`${g} accent on bg`, fg(`--game-${g}`, bg), bg, 4.5],
        [`${g} accent on panel`, fg(`--game-${g}`, panel), panel, 4.5],
      ],
    ),
    ['soon badge', fg('--soon-ink', soon), soon, 4.5],
    ['sun ink on sun', parse(t['--team-sun-ink']), parse(t['--team-sun']), 4.5],
    ['moon ink on moon', parse(t['--team-moon-ink']), parse(t['--team-moon']), 4.5],
    ['word ink on word card', parse(t['--word-card-ink']), parse(t['--word-card']), 4.5],
    ['blank ink on its hatch', parse(t['--word-blank-ink']), hatch('--word-blank'), 4.5],
    ['trap ink on its hatch', parse(t['--word-trap-ink']), hatch('--word-trap'), 4.5],
    ['bid ink on the bidding team', parse(t['--kt-bid-ink']), parse(t['--kt-bid']), 4.5],
  ];
  return pairs.map(([name, a, b, min]) => [`${id}: ${name}`, a, b, min] as const);
});

describe('every theme meets WCAG AA for its text pairs', () => {
  it.each(cases)('%s', (_name, fg, bg, min) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});

// Ishaara's clue phone has one look for every theme: its own `:root, [data-theme]` block in themes.css.
describe('the clue phone meets WCAG AA', () => {
  const at = css.indexOf('--key-bg:');
  const body = css.slice(at, css.indexOf('\n}', at));
  const k = Object.fromEntries(
    [...body.matchAll(/--key-([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
  );
  const c = (n: string) => parse(k[n]);
  const blankHatch = over(k['blank-stripe'], c('blank'));
  const pairs: [string, RGBA, RGBA, number][] = [
    ['text on bg', c('text'), c('bg'), 4.5],
    ['text on surface', c('text'), c('surface'), 4.5],
    ['text-2 on bg', c('text-2'), c('bg'), 4.5],
    ['text-2 on surface', c('text-2'), c('surface'), 4.5],
    ['cta ink on cta', c('cta-ink'), c('cta'), 4.5],
    ['sun ink on sun', c('sun-ink'), c('sun'), 4.5],
    ['moon ink on moon', c('moon-ink'), c('moon'), 4.5],
    ['blank ink on its hatch', c('blank-ink'), blankHatch, 4.5],
    ['trap ink on trap', c('trap-ink'), c('trap'), 4.5],
    ['alert on surface', c('alert'), c('surface'), 4.5],
    ['ok on surface', c('ok'), c('surface'), 4.5],
    // Control outlines are non-text: 3:1.
    ['edge on surface', c('edge'), c('surface'), 3],
    ['edge on bg', c('edge'), c('bg'), 3],
  ];
  it.each(pairs)('%s', (_name, fg, bg, min) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});
