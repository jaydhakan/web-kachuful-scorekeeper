export type Direction = 'cw' | 'ccw';

export interface Player {
  id: string;
  name: string;
  emoji: string;
  color: string;
  /** The registry player this seat is (schema 3); absent until the player is first archived or uploaded. */
  playerId?: string;
}
