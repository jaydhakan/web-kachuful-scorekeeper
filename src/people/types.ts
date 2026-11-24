export type Direction = 'cw' | 'ccw';

export interface Player {
  id: string;
  name: string;
  emoji: string;
  color: string;
  /** The registry player this seat is (schema 3); absent until the player is first archived or uploaded. */
  playerId?: string;
}

/** A seat being filled at setup, in any game: who sits there and how they look. */
export interface Seat {
  name: string;
  emoji: string;
  color: string;
  /** The registry player picked for this seat, when picked from the list. */
  playerId?: string;
  /** A new player's email (signed in), which says who they are. */
  email?: string;
  firstName?: string;
  lastName?: string;
}

/** A wardrobe slot (backend-requests §3); every slot of a look is optional. */
export type LookSlot = 'outfit' | 'headwear' | 'neckwear' | 'frame' | 'aura' | 'badge' | 'title';

/** One worn item: its catalogue id and colour variant (0 for a one-variant item); `number` only on the jersey. */
export interface LookItem {
  id: string;
  v: number;
  number?: number;
}

/** What a player wears, as the server stores it and every player embed carries it. */
export type Look = Partial<Record<LookSlot, LookItem>>;
