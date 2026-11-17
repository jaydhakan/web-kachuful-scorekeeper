import type { IshaaraPublic, LogEntry } from '@/games/ishaara/domain';
import { mvpOf } from './mvp';

const players = [
  { name: 'Riya', team: 'sun', role: 'clue-giver', playerId: 'p-riya' },
  { name: 'Kabir', team: 'moon', role: 'clue-giver', playerId: 'p-kabir' },
] as unknown as IshaaraPublic['players'];
const e = (
  team: 'sun' | 'moon',
  type: LogEntry['type'],
  identity?: LogEntry['identity'],
): LogEntry => ({
  at: 0,
  team,
  type,
  ...(identity && { identity }),
});

describe('the player of the game in Ishaara', () => {
  it('is the clue-giver whose clues found the most words', () => {
    const log = [
      e('sun', 'clue'),
      e('sun', 'guess', 'sun'),
      e('sun', 'guess', 'sun'),
      e('moon', 'clue'),
      e('moon', 'guess', 'moon'),
    ];
    expect(mvpOf({ log, players, winner: 'moon' })).toEqual({
      playerId: 'p-riya',
      found: 2,
      clues: 1,
    });
  });

  it('the winner breaks a tie, and nobody found anything is nobody', () => {
    const log = [
      e('sun', 'clue'),
      e('sun', 'guess', 'sun'),
      e('moon', 'clue'),
      e('moon', 'guess', 'moon'),
    ];
    expect(mvpOf({ log, players, winner: 'moon' })?.playerId).toBe('p-kabir');
    expect(mvpOf({ log: [e('sun', 'clue')], players, winner: null })).toBeNull();
  });
});
