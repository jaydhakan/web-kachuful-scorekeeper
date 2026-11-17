/** The table's choreography: the shared Web Animations helpers (`src/fx/waapi.ts`) plus the table's own geometry. */
export { anim, EASE, OUT, POP, REDUCED_MS, reducedMotion, wait, type AnimOpts } from '@/fx/waapi';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
export const boxOf = (el: Element): Box => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};
export const mid = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** Deterministic noise for decoration (crack arms, shards), so a test or a re-render draws the same thing. */
export function rng(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
