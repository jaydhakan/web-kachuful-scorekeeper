import { describe, expect, it } from 'vitest';
import type { SpTableSummary } from '@/games/spades/online/sync/types';
import { fromOnlineTable } from './source';

const seat = (name: string) => ({ playerId: `p-${name}`, name, emoji: '🙂', color: '#000' });
const base: SpTableSummary = {
  id: 't1',
  kind: 'spades-online',
  code: 'KQ7M',
  name: 'Friday',
  status: 'finished',
  phase: 'handEnd',
  paused: null,
  rules: {} as SpTableSummary['rules'],
  host: 0,
  seats: [seat('Asha'), seat('Bo'), seat('Cy'), seat('Di')],
  scores: { a: 212, b: 140 },
  hands: 9,
  result: { winner: 'a', endedBy: 'target' },
  createdAt: 1,
  updatedAt: 5,
  finishedAt: 4,
  mySeat: 0,
  isHost: true,
};

describe('an online table in History', () => {
  it('reads as a won game, dated when it finished', () => {
    const it = fromOnlineTable(base);
    expect(it).toMatchObject({ kind: 'online', at: 4, status: 'finished', hands: 9, winner: 'a' });
    expect(it.line).toBe('Asha & Cy won 212–140');
    expect(it.players.map((p) => p.name)).toEqual(['Asha', 'Bo', 'Cy', 'Di']);
  });

  it('says cancelled, a draw, or no hand scored', () => {
    expect(fromOnlineTable({ ...base, status: 'cancelled', result: null }).line).toBe(
      'Cancelled at 212–140',
    );
    expect(fromOnlineTable({ ...base, result: { winner: 'draw', endedBy: 'draw' } }).line).toBe(
      'Draw 212–140',
    );
    expect(fromOnlineTable({ ...base, hands: 0 }).line).toBe('No hand scored');
  });
});
