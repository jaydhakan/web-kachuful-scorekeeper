import { COLOR_VARS, GRADIENTS, type ColorName } from './colors';
import { COLORS } from '@/domain/avatars';

/** Every colour by name, as a CSS value that follows the active theme. For DOM styles; a canvas needs `cssColor`. */
export const palette = Object.fromEntries(
  Object.entries(COLOR_VARS).map(([k, v]) => [k, `var(--${v})`]),
) as Record<ColorName, string>;

export const gradients = GRADIENTS;

/** A theme colour resolved to a concrete value, for canvas drawing, which cannot read CSS variables. */
export function cssColor(name: ColorName, el: Element = document.documentElement): string {
  return getComputedStyle(el).getPropertyValue(`--${COLOR_VARS[name]}`).trim();
}

const seatOf = new Map(COLORS.map((c, i) => [c.toLowerCase(), i + 1]));

/**
 * A saved player colour (stored as hex, CLAUDE.md "Data quirks") drawn in the active theme's avatar palette. The
 * stored value never changes; a colour the palette doesn't know is shown as saved.
 */
export function seatColor(hex: string): string {
  const k = seatOf.get(hex.toLowerCase());
  return k ? `var(--seat-${k}, ${hex})` : hex;
}

/** `seatColor` resolved to a concrete value, for canvas drawing (confetti, share image). */
export function seatColorValue(hex: string, el: Element = document.documentElement): string {
  const k = seatOf.get(hex.toLowerCase());
  return (k && getComputedStyle(el).getPropertyValue(`--seat-${k}`).trim()) || hex;
}

/** A theme's own confetti colours (--confetti-1…4), or null so the caller uses the players' colours. */
export function themeConfetti(el: Element = document.documentElement): string[] | null {
  if (!getComputedStyle(el).getPropertyValue('--confetti-1').trim()) return null;
  return [1, 2, 3, 4].map((i) => `var(--confetti-${i})`);
}

/** Any colour the app passes around (a saved hex or a `var(--…)` from `palette`) as a concrete value, for canvas. */
export function colorValue(c: string, el: Element = document.documentElement): string {
  const v = /^var\((--[\w-]+)/.exec(c);
  if (v) return getComputedStyle(el).getPropertyValue(v[1]).trim() || c;
  return seatColorValue(c, el);
}
