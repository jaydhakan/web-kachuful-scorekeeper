import { gradients, palette } from './palette';

type RGB = [number, number, number];
const rgb = (hex: string): RGB => {
  const n = parseInt(hex.slice(1, 7), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
const hex = (c: RGB) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
/** `top` at `alpha` over `bottom`, as the browser composites it. */
const over = (top: string, alpha: number, bottom: string) =>
  hex(rgb(top).map((v, i) => v * alpha + rgb(bottom)[i] * (1 - alpha)) as RGB);
const luminance = (h: string) =>
  rgb(h)
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// Surfaces as composited on screen; glass is measured over the brighter top of the felt.
const BG = {
  felt: palette['felt-950'],
  glass: over('#ffffff', 0.055, palette['felt-800']),
  input: over('#ffffff', 0.07, palette['felt-950']),
  disabled: over('#ffffff', 0.06, palette['felt-950']),
  sheet: palette.sheet,
};
/** Label centre of the 135° accent button gradient (accent → `end`% accent mixed with black). */
const accentLabel = (accent: string, end: number) => over(accent, (100 + end) / 200, '#000000');

const gradientEnd = Number(/(\d+)%, black/.exec(gradients['accent-gradient'])![1]);

const pairs: [string, string, string][] = [
  ['primary text on felt', palette['text-primary'], BG.felt],
  ['primary text on glass', palette['text-primary'], BG.glass],
  ['secondary text on glass', palette['text-secondary'], BG.glass],
  ['secondary text on sheet', palette['text-secondary'], BG.sheet],
  ['warning text on glass', palette.warning, BG.glass],
  ['positive text on glass', palette.positive, BG.glass],
  ['gold text on glass', palette.gold, BG.glass],
  ['negative text on sheet', palette.negative, BG.sheet],
  ['ink on positive (✓ Made)', palette['ink-on-accent'], palette.positive],
  ['ink on negative (✗ Missed)', palette['ink-negative'], palette.negative],
  ['placeholder on input', palette['text-placeholder'], BG.input],
  ['status text in a disabled button', palette['text-secondary'], BG.disabled],
  ['small negative text on glass', palette['negative-text'], BG.glass],
  [
    'negative text on its red tint',
    palette['negative-text'],
    over(palette.negative, 0.16, BG.glass),
  ],
  ...(['spades', 'diamonds', 'clubs', 'hearts'] as const).map((s): [string, string, string] => [
    `button label on ${s} accent`,
    palette['ink-on-accent'],
    accentLabel(palette[`accent-${s}`], gradientEnd),
  ]),
];

describe('text contrast meets WCAG AA (4.5:1)', () => {
  it.each(pairs)('%s', (_name, fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
