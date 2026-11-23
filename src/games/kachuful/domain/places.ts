/** Kachuful's ended games with their places (REWARDS-PLAN §6.5): every ended game, seats in seat order. */
import type { PlacedGame } from '../../../progression/places';
import type { Facts } from './timeline';

export function placedGames(f: Facts): PlacedGame[] {
  const by = new Map<string, PlacedGame>();
  for (const p of f.players) {
    if (p.endedAt == null || p.place == null) continue;
    const g = by.get(p.gameId) ?? { gameId: p.gameId, endedAt: p.endedAt, seats: [] };
    g.seats.push({ playerId: p.playerId, place: p.place, seat: p.seat });
    by.set(p.gameId, g);
  }
  for (const g of by.values()) g.seats.sort((a, b) => a.seat - b.seat);
  return [...by.values()];
}
