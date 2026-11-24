import type { Slot } from '../types';
import { AURA } from './aura';
import { BADGE } from './badge';
import { FRAME } from './frame';
import { HEADWEAR } from './headwear';
import { NECKWEAR } from './neckwear';
import { OUTFIT } from './outfit';
import type { ItemArt } from './types';

export { toneOf, FACE, type ItemArt, type Tone, type Cloth } from './types';

/** Every drawn item by slot; titles are words, not art. An item without an entry draws nothing. */
export const ART: Record<Exclude<Slot, 'title'>, Record<string, ItemArt>> = {
  outfit: OUTFIT,
  headwear: HEADWEAR,
  neckwear: NECKWEAR,
  frame: FRAME,
  aura: AURA,
  badge: BADGE,
};

export const artOf = (slot: Slot, id: string): ItemArt | undefined =>
  slot === 'title' ? undefined : ART[slot][id];
