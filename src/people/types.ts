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
