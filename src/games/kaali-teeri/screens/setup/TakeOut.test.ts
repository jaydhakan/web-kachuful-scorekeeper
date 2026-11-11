import { TR } from '@/theme/trumps';
import { ktSetup as s } from '@/games/kaali-teeri/strings/setup';
import { takeOutGroups } from './TakeOut';

const line = (n: number) =>
  s.takeOutLine(
    takeOutGroups(n).map((g) => ({ name: g.card.rank + TR[g.card.suit].sym, copies: g.copies })),
  );

describe('the cards to take out, as the table reads them', () => {
  it('names each card once, with "both decks" or both/one as the copies need', () => {
    expect(takeOutGroups(4)).toEqual([]);
    expect(takeOutGroups(8)).toEqual([]);
    expect(line(5)).toBe('Take out 2♣ and 2♦');
    expect(line(6)).toBe('Take out 2♣, 2♦, 2♥ and 2♠');
    expect(line(7)).toBe('Take out 2♣, 2♦ and 2♥ from both decks');
    expect(line(9)).toBe('Take out both 2♣, both 2♦ and one 2♥');
    expect(line(10)).toBe('Take out 2♣ and 2♦ from both decks');
  });
});
