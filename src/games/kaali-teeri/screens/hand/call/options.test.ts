import { cardOption, rankOpen, suitOpen } from './options';

describe('cardOption', () => {
  it('marks taken-out cards', () => {
    expect(cardOption('2', 'clubs', [], 5).why).toBe('out');
    expect(cardOption('2', 'hearts', [], 5)).toEqual({ needsCopy: false, copies: [], why: null });
  });
  it('refuses a card already called with one deck', () => {
    expect(cardOption('A', 'hearts', [{ rank: 'A', suit: 'hearts' }], 6).why).toBe('called');
  });
  it('lists the copies left with two decks', () => {
    expect(cardOption('A', 'hearts', [], 8).copies).toEqual([1, 2, 'other']);
    expect(cardOption('A', 'hearts', [{ rank: 'A', suit: 'hearts', copy: 1 }], 8)).toEqual({
      needsCopy: true,
      copies: [2],
      why: null,
    });
    expect(cardOption('A', 'hearts', [{ rank: 'A', suit: 'hearts', copy: 'other' }], 8).why).toBe(
      'called',
    );
  });
  it('needs no copy when one copy is out', () => {
    // Nine players: one 2♥ is out, so the other is the only one.
    expect(cardOption('2', 'hearts', [], 9)).toEqual({ needsCopy: false, copies: [], why: null });
  });
  it('opens a rank or suit while any of its cards can be called', () => {
    expect(rankOpen('2', [], 6)).toBe(false);
    expect(rankOpen('2', [], 5)).toBe(true);
    expect(suitOpen('clubs', [], 6)).toBe(true);
  });
});
