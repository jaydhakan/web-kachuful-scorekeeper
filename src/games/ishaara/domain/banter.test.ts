import { describe, expect, it } from 'vitest';
import type { Mark } from '../../../progression/banter';
import { ishBanterLog } from './banter';
import type { Identity, IshaaraPublic, LogEntry, Team } from './types';

const P = [
  { id: 's1', name: 'Riya', team: 'sun', role: 'clue-giver' },
  { id: 's2', name: 'Dev', team: 'sun', role: 'guesser' },
  { id: 'm1', name: 'Asha', team: 'moon', role: 'clue-giver' },
  { id: 'm2', name: 'Kabir', team: 'moon', role: 'guesser' },
];
const clue = (team: Team): LogEntry => ({ at: 0, team, type: 'clue', word: 'x', number: 2 });
const guess = (team: Team, identity: Identity): LogEntry => ({
  at: 0,
  team,
  type: 'guess',
  identity,
});
const kinds = (log: LogEntry[], marks: [string, Mark][]) =>
  ishBanterLog({ players: P, log } as unknown as IshaaraPublic, new Map(marks)).map(
    (b) => b && `${b.kind}:${b.who}`,
  );

describe('Ishaara banter', () => {
  it('teases a Badshah whose team hit the trap, or picked the other team’s word', () => {
    expect(kinds([clue('sun'), guess('sun', 'trap')], [['s2', 'gold']])).toEqual(['trapped:s2']);
    expect(kinds([clue('sun'), guess('sun', 'moon')], [['s2', 'gold']])).toEqual(['wrong:s2']);
  });

  it('praises a clue-giver medallist whose clue found three', () => {
    const big = [clue('sun'), guess('sun', 'sun'), guess('sun', 'sun'), guess('sun', 'sun')];
    expect(kinds(big, [['s1', 'gold']])).toEqual(['bigClue:s1']);
  });

  it('says nothing about the other team’s turn, or to a Legend who slipped', () => {
    expect(kinds([clue('moon'), guess('moon', 'trap')], [['s2', 'gold']])).toEqual([null]);
    expect(kinds([clue('sun'), guess('sun', 'trap')], [['s2', 'legend']])).toEqual([null]);
  });
});
