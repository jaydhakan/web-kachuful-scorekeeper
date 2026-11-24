import type { ReactNode } from 'react';
import type { LookItem } from '../types';

/** A cloth token, `--cloth-1`…`--cloth-8` (themes.css): saffron, maroon, indigo, leaf, cream, charcoal, peacock, rose. */
export type Cloth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** One variant's colours, as CSS values that follow the theme. */
export interface Tone {
  main: string;
  trim: string;
  /** `main` darkened toward the theme's shade: folds and the far side of a drape. */
  shade: string;
}

/**
 * How one item is drawn. `draw` returns SVG children in the bust's 100×100 box (the face disc is `FACE`), coloured
 * only with CSS variables. Adding an item is one entry in its slot's module (`art/<slot>.tsx`).
 */
export interface ItemArt {
  /** Each variant's [main, trim] cloth; an item drawn in fixed tokens (gold, the honours) leaves it out. */
  tones?: readonly (readonly [Cloth, Cloth])[];
  draw: (tone: Tone, item: LookItem) => ReactNode;
}

/** The face disc in the bust's box: everything is drawn around it. */
export const FACE = { cx: 50, cy: 42, r: 22 } as const;

export const cloth = (n: Cloth) => `var(--cloth-${n})`;
const shadeOf = (c: string) => `color-mix(in srgb, ${c} 72%, var(--shade))`;

/** A variant's tone; a variant past the list wraps, and fixed-colour art gets cream and saffron. */
export function toneOf(art: ItemArt, v: number): Tone {
  const t = art.tones?.length ? art.tones[Math.abs(v) % art.tones.length] : ([5, 1] as const);
  const main = cloth(t[0]);
  return { main, trim: cloth(t[1]), shade: shadeOf(main) };
}

/** The theme's outline, for paths that are cloth (frames and metal set their own). */
export const LINE = {
  stroke: 'var(--cloth-line)',
  strokeWidth: 'var(--cloth-line-w)',
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
} as const;
export const NO_LINE = { stroke: 'none' } as const;
