/** One ended game's places, game-agnostic: what the table intel line, nights and Sikke read from a game. */
export interface PlacedGame {
  gameId: string;
  endedAt: number;
  /** Every seat's finishing place (1, 1, 3) and seat order; a team game gives the whole side the same place. */
  seats: { playerId: string; place: number; seat: number }[];
}
