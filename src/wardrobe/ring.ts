import type { Look } from './types';

// Loads with every game (the seat token's ring), so it is a few names, never the catalogue or the art.
const RING: Record<string, number | string> = {
  marigold_frame: 1,
  stumps_frame: 5,
  raindrop_frame: 3,
  grid_frame: 4,
  frost_frame: 7,
  gold_ring: 'var(--medal-gold)',
};
const NEON = [7, 8, 4];

/** The frame's main colour, drawn as the ring of a dot or seat token (REWARDS-PLAN §4.3); null without a frame. */
export function ringOf(look: Look | null | undefined): string | null {
  const f = look?.frame;
  if (!f) return null;
  const c = f.id === 'neon_ring' ? NEON[f.v % NEON.length] : RING[f.id];
  return c == null ? null : typeof c === 'number' ? `var(--cloth-${c})` : c;
}

/** Whether a look puts anything on the bust (a title alone is words, not art). */
export const dressed = (look: Look | null | undefined): look is Look =>
  !!look && Object.keys(look).some((s) => s !== 'title' && look[s as keyof Look]);
