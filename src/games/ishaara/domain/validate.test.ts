import { describe, expect, it } from 'vitest';
import { validateNew } from './validate';
import { PLAYERS, RULES, WORDS } from './__fixtures__/kit';

describe('validateNew', () => {
  it('accepts four players, two teams, one clue-giver each and 25 words', () => {
    expect(validateNew(PLAYERS, WORDS, RULES)).toBeNull();
  });
  it('needs two per team and exactly one clue-giver per team', () => {
    expect(validateNew(PLAYERS.slice(0, 3), WORDS, RULES)).toBe('players');
    expect(
      validateNew(
        PLAYERS.map((p) => ({ ...p, team: 'sun' as const })),
        WORDS,
        RULES,
      ),
    ).toBe('teams');
    expect(
      validateNew(
        PLAYERS.map((p) => ({ ...p, role: 'guesser' as const })),
        WORDS,
        RULES,
      ),
    ).toBe('clue-givers');
  });
  it('needs 25 distinct words', () => {
    expect(validateNew(PLAYERS, WORDS.slice(1), RULES)).toBe('words');
    expect(validateNew(PLAYERS, [...WORDS.slice(1), 'KITE'], RULES)).toBe('duplicate-words');
    expect(validateNew(PLAYERS, [...WORDS.slice(1), 'ice cream'], RULES)).toBeNull();
    expect(validateNew(PLAYERS, [...WORDS.slice(1), 'r2'], RULES)).toBe('words');
  });
  it('checks the rules', () => {
    expect(validateNew(PLAYERS, WORDS, { ...RULES, timerSec: 90 as 60 })).toBe('rules');
    expect(validateNew(PLAYERS, WORDS, { ...RULES, bestOf: 2 as 1 })).toBe('rules');
  });
});
