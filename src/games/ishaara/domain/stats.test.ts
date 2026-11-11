import { describe, expect, it } from 'vitest';
import { playerRows, revealedCount } from './stats';
import { act, clue, giver, pick, started, TABLE } from './__fixtures__/kit';

describe('playerRows', () => {
  it('gives each seat its team’s picks and the clue-giver its clues and penalties', () => {
    let k = clue(started(), 'spice', 2);
    k = pick(pick(k, 0), 17); // Sun: one found, one blank
    k = act(clue(k, 'river', 3), giver('sun'), { type: 'notAllowed' }); // Moon's clue ruled out
    k = act(k, giver('sun'), { type: 'penaltyReveal', card: 1 });
    k = pick(clue(k, 'heat', 'inf'), 2);
    k = pick(k, 24); // Sun hits the trap
    const rows = playerRows(k.state);
    const riya = rows.find((r) => r.team === 'sun' && r.role === 'clue-giver')!;
    const arjun = rows.find((r) => r.team === 'sun' && r.role === 'guesser')!;
    const dev = rows.find((r) => r.team === 'moon' && r.role === 'clue-giver')!;
    expect(riya).toMatchObject({
      won: false,
      wordsFound: 2,
      wrongPicks: 2,
      trapHit: true,
      cluesGiven: 2,
      avgClueNumber: 2,
      penalties: 0,
    });
    expect(arjun).toMatchObject({
      wordsFound: 2,
      wrongPicks: 2,
      cluesGiven: 0,
      avgClueNumber: null,
    });
    expect(dev).toMatchObject({
      won: true,
      cluesGiven: 1,
      avgClueNumber: 3,
      penalties: 1,
      wordsFound: 0,
    });
    expect(revealedCount(k.state)).toBe(5);
  });

  it('an undone guess does not count', () => {
    const k = act(pick(clue(started(), 'spice', 2), 9), TABLE, { type: 'undoLast' });
    expect(playerRows(k.state)[0].wrongPicks).toBe(0);
  });
});
