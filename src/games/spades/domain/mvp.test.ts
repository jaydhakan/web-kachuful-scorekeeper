import { describe, expect, it } from 'vitest';
import { kitGame, WHO } from './__fixtures__/kit';
import { mvpOf } from './mvp';

const [RIYA, ARJUN] = WHO.map((w) => w.playerId);

describe('the player of the game', () => {
  it('is whoever made the most Nils', () => {
    // Seat 1 (Arjun) bids Nil and takes nothing; team A takes 9 of 9 bid.
    const g = kitGame([{ bids: [5, 0, 4, 3], teamA: 9, nil: [null, 0, null, null] }]);
    expect(mvpOf(g)).toEqual({ playerId: ARJUN, kind: 'nils', n: 1 });
  });

  it('else whoever bid the most tricks for contracts their team made', () => {
    const g = kitGame([
      { bids: [6, 2, 3, 2], teamA: 9 },
      { bids: [2, 3, 5, 3], teamA: 7 },
    ]);
    // Team A made both: Riya bid 6 + 2, Dev 3 + 5; team B (bid 4, then 6) was set in the second hand.
    expect(mvpOf(g)).toEqual({ playerId: RIYA, kind: 'bids', n: 8 });
    const tie = kitGame([{ bids: [4, 2, 4, 2], teamA: 8 }]);
    expect(mvpOf(tie)?.playerId).toBe(RIYA);
  });

  it('is nobody when no contract was made and no Nil held', () => {
    // Team A bid 12 and took 10, team B bid 7 and took 3: both set.
    expect(mvpOf(kitGame([{ bids: [6, 4, 6, 3], teamA: 10 }]))).toBeNull();
  });
});
