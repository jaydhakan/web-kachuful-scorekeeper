import type { IshaaraPublic, LogEntry } from '@/games/ishaara/domain';
import { mindMeld, photoFinish } from './beats';

const clue = (team: 'sun' | 'moon', number: number | 'inf'): LogEntry => ({
  at: 0,
  team,
  type: 'clue',
  number,
});
const guess = (team: 'sun' | 'moon', card: number, identity: LogEntry['identity']): LogEntry => ({
  at: 0,
  team,
  type: 'guess',
  card,
  identity,
});

describe('mind meld', () => {
  it('is the cards a clue for 3 found, in order, once all three are found', () => {
    const log = [clue('sun', 3), guess('sun', 4, 'sun'), guess('sun', 9, 'sun')];
    expect(mindMeld({ log })).toBeNull();
    expect(mindMeld({ log: [...log, guess('sun', 2, 'sun')] })).toEqual([4, 9, 2]);
  });

  it('not for a clue under 3, an unlimited one, or a miss among them', () => {
    expect(
      mindMeld({ log: [clue('sun', 2), guess('sun', 1, 'sun'), guess('sun', 2, 'sun')] }),
    ).toBeNull();
    expect(mindMeld({ log: [clue('sun', 'inf'), guess('sun', 1, 'sun')] })).toBeNull();
    const missed = [clue('moon', 3), guess('moon', 1, 'moon'), guess('moon', 2, 'blank')];
    expect(mindMeld({ log: missed })).toBeNull();
    // A new clue starts again: the last turn's cards don't count.
    const next = [
      clue('sun', 3),
      guess('sun', 1, 'sun'),
      guess('sun', 2, 'sun'),
      guess('sun', 3, 'sun'),
      clue('moon', 3),
    ];
    expect(mindMeld({ log: next })).toBeNull();
  });
});

describe('photo finish', () => {
  const board = (
    sun: number,
    moon: number,
  ): Pick<IshaaraPublic, 'starting' | 'revealed' | 'status'> => {
    // Sun starts: 9 sun, 8 moon. Turn all but `sun` and `moon` of each.
    const revealed: IshaaraPublic['revealed'] = Array(25).fill(null);
    for (let i = 0; i < 9 - sun; i++) revealed[i] = 'sun';
    for (let i = 0; i < 8 - moon; i++) revealed[10 + i] = 'moon';
    return { starting: 'sun', revealed, status: 'active' };
  };
  it('when both teams need exactly one card', () => {
    expect(photoFinish(board(1, 1))).toBe(true);
    expect(photoFinish(board(1, 2))).toBe(false);
    expect(photoFinish({ ...board(1, 1), status: 'finished' })).toBe(false);
  });
});
