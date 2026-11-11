import { describe, expect, it } from 'vitest';
import { dealKey, seeded } from './deal';
import { applyAction, wordsLeft } from './rules';
import { giver, started, TABLE } from './__fixtures__/kit';
import type { Action, Actor, ClueNumber, Identity, IshaaraPublic, Team } from './types';

// Seeded random play (no property-testing library): each seed is one game, replayable from its number.
const RUNS = 300;

function randomMove(s: IshaaraPublic, rnd: () => number): { actor: Actor; action: Action } {
  const card = Math.floor(rnd() * 26);
  const team: Team = rnd() < 0.5 ? 'sun' : 'moon';
  const numbers: ClueNumber[] = [0, 1, 2, 3, 9, 'inf'];
  const moves: Array<{ actor: Actor; action: Action }> = [
    {
      actor: giver(s.turn),
      action: {
        type: 'clue',
        word: `zq${Math.floor(rnd() * 1e6)}`.replace(/\d/g, 'x'),
        number: numbers[Math.floor(rnd() * numbers.length)],
      },
    },
    { actor: TABLE, action: { type: 'guess', card } },
    { actor: TABLE, action: { type: 'guess', card } },
    { actor: TABLE, action: { type: 'guess', card } },
    { actor: TABLE, action: { type: 'endTurn' } },
    { actor: TABLE, action: { type: 'timeout' } },
    { actor: TABLE, action: { type: 'undoLast' } },
    { actor: TABLE, action: { type: 'skip' } },
    { actor: giver(team), action: { type: 'notAllowed' } },
    { actor: giver(team), action: { type: 'penaltyReveal', card } },
    { actor: rnd() < 0.5 ? TABLE : giver(team), action: { type: 'guess', card } },
  ];
  if (rnd() < 0.01) moves.push({ actor: TABLE, action: { type: 'resign', team } });
  return moves[Math.floor(rnd() * moves.length)];
}

/** No unrevealed identity anywhere in the public state, unless the game is over. */
function leaks(s: IshaaraPublic, key: Identity[]): string | null {
  if (s.status !== 'finished' && s.solution !== null) return 'solution before the end';
  for (let i = 0; i < 25; i++) {
    if (s.revealed[i] !== null && s.revealed[i] !== key[i])
      return `card ${i} shows the wrong identity`;
    if (s.revealed[i] !== null) continue;
    if (s.log.some((e) => e.card === i && e.identity !== undefined))
      return `log names face-down card ${i}`;
  }
  return null;
}

describe('random games', () => {
  it('keep every invariant', () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const rnd = seeded(seed * 7919);
      let k = started({ seed, rules: { timerSec: seed % 3 === 0 ? 60 : null } });
      for (let n = 0; n < 400 && k.state.status !== 'finished'; n++) {
        const before = k.state;
        const { actor, action } = randomMove(before, rnd);
        const now = k.now + Math.floor(rnd() * 20_000);
        const r = applyAction(before, k.key, action, actor, now);
        const s = r.state;
        const ctx = `seed ${seed} move ${n} ${action.type}`;
        expect(leaks(s, k.key), ctx).toBeNull();
        // A face-up card goes face down only by undo.
        for (let i = 0; i < 25; i++) {
          if (before.revealed[i] !== null && s.revealed[i] === null)
            expect(action.type, ctx).toBe('undoLast');
        }
        if (s.guessesLeft !== 'inf') expect(s.guessesLeft, ctx).toBeGreaterThanOrEqual(0);
        const c = s.clue;
        if (c && typeof c.number === 'number' && c.number > 0)
          expect(s.guessedThisTurn, ctx).toBeLessThanOrEqual(c.number + 1);
        if (action.type === 'endTurn' && before.guessedThisTurn === 0 && before.deadline === null)
          expect(r.ok, ctx).toBe(false);
        if (!r.ok) expect(s.rev, ctx).toBeLessThanOrEqual(before.rev + 1);
        // Over exactly when the trap is up, a team has every word, or someone resigned.
        const trap = s.revealed.includes('trap');
        const allFound = wordsLeft(s, 'sun') === 0 || wordsLeft(s, 'moon') === 0;
        const resigned = r.ok && action.type === 'resign';
        expect(s.status === 'finished', ctx).toBe(trap || allFound || resigned);
        k = { ...k, state: s, now };
      }
    }
  });
});

describe('dealKey', () => {
  it('always deals 9 / 8 / 7 / 1 with the 9 to the starting team', () => {
    const starts = { sun: 0, moon: 0 };
    for (let seed = 0; seed < 500; seed++) {
      const { key, starting } = dealKey(seed);
      const count = (id: Identity) => key.filter((x) => x === id).length;
      expect(key).toHaveLength(25);
      expect(count(starting)).toBe(9);
      expect(count(starting === 'sun' ? 'moon' : 'sun')).toBe(8);
      expect(count('blank')).toBe(7);
      expect(count('trap')).toBe(1);
      starts[starting]++;
    }
    expect(starts.sun).toBeGreaterThan(200);
    expect(starts.moon).toBeGreaterThan(200);
  });

  it('is the same for the same seed', () => {
    expect(dealKey(42)).toEqual(dealKey(42));
  });
});
