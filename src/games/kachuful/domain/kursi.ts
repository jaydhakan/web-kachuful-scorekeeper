/** Kachuful's games as the Kursi sees them (REWARDS-PLAN §6.3): every ended game with its places. */
import type { KursiGame } from '../../../progression/kursi';
import type { Facts } from './timeline';

export function kursiGames(f: Facts): KursiGame[] {
  const by = new Map<string, KursiGame>();
  for (const p of f.players) {
    if (p.endedAt == null || p.place == null) continue;
    const g = by.get(p.gameId) ?? { gameId: p.gameId, endedAt: p.endedAt, seats: [] };
    g.seats.push({ playerId: p.playerId, place: p.place, seat: p.seat });
    by.set(p.gameId, g);
  }
  for (const g of by.values()) g.seats.sort((a, b) => a.seat - b.seat);
  return [...by.values()];
}
