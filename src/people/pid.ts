import { nameKey } from './names';
import type { Player } from './types';

/** Who a seat is across games: the registry id, or the name for a game from before the registry. */
export const pidOf = (p: Pick<Player, 'playerId' | 'name'>): string =>
  p.playerId ?? `name:${nameKey(p.name)}`;
