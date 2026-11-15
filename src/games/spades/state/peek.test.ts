import { kitGame } from '@/games/spades/domain/__fixtures__/kit';
import { KEYS, storage } from '@/state/persistence';
import { peek } from './peek';

describe('peek (the landing resume line, without the domain)', () => {
  it('names the hand and its dealer, and the two teams', () => {
    // Two hands done and the third being bid; Riya (seat 0) dealt first, so Dev deals the third.
    const g = kitGame(
      [
        { bids: [3, 3, 3, 3], teamA: 7 },
        { bids: [3, 3, 3, 3], teamA: 6 },
        { bids: [null, null, null, null], phase: 'bidding' },
      ],
      { updatedAt: 99 },
    );
    storage.set(KEYS.spGame, g);
    expect(peek()).toEqual({
      line: 'Hand 3 · Dev deals',
      updatedAt: 99,
      hand: 3,
      teams: ['Riya & Dev', 'Arjun & Meera'],
      hands: g.hands,
    });
  });
  it('follows the first dealer round the table, whatever the seat layout', () => {
    storage.set(
      KEYS.spGame,
      kitGame([{ bids: [3, 3, 3, 3], teamA: 7 }], { first: 3, direction: 'ccw' }),
    );
    expect(peek()?.line).toBe('Hand 1 · Meera deals');
  });
  it('is null with nothing to resume, and for anything it cannot read', () => {
    expect(peek()).toBeNull();
    storage.set(KEYS.spGame, kitGame([], { status: 'finished' }));
    expect(peek()).toBeNull();
    storage.set(KEYS.spGame, { kind: 'kaali-teeri', status: 'active' });
    expect(peek()).toBeNull();
    storage.set(KEYS.spGame, { ...kitGame([]), players: [{ name: 'Riya' }] });
    expect(peek()).toBeNull();
    storage.set(KEYS.spGame, 'garbage');
    expect(peek()).toBeNull();
  });
});
