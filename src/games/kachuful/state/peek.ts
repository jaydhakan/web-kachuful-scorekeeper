import { KEYS, storage } from '@/state/persistence';
import { platform } from '@/strings/platform';

/** The landing card's resume line for a game in progress. */
export interface KfPeek {
  line: string;
  updatedAt: number;
}

type Raw = Record<string, unknown>;
const obj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * "Round 8 · 5 cards · Meera deals", read straight from `kachuful.v1` without the game's chunk: no domain, no
 * migrations, so any shape it doesn't expect (the prototype's included) is simply no line.
 */
export function peek(): KfPeek | null {
  try {
    const g = storage.get<unknown>(KEYS.game, null);
    // The demo a first visit seeds isn't anyone's game to resume.
    if (!obj(g) || g.id === 'demo' || g.status !== 'active' || typeof g.updatedAt !== 'number')
      return null;
    const players: unknown = g.players,
      rounds: unknown = g.rounds;
    if (!Array.isArray(players) || !Array.isArray(rounds)) return null;
    const r: unknown = rounds.at(-1);
    if (!obj(r) || typeof r.index !== 'number' || typeof r.cards !== 'number') return null;
    const p = platform.kachufulPeek;
    const dealer: unknown = typeof r.dealerIndex === 'number' ? players[r.dealerIndex] : null;
    const round = p.round(r.index + 1, r.cards);
    const line =
      obj(dealer) && typeof dealer.name === 'string' ? `${round} · ${p.deals(dealer.name)}` : round;
    return { line, updatedAt: g.updatedAt };
  } catch {
    return null;
  }
}
