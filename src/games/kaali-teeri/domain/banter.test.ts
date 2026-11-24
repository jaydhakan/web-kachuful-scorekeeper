import { describe, expect, it } from 'vitest';
import type { Mark } from '../../../progression/banter';
import { kitGame, T0, type KitHand } from './__fixtures__/kit';
import { ktBanterLog } from './banter';

// Five players, one deck (250 points), one partner: the seat after the bidder plays the called card.
const game = (hands: KitHand[]) =>
  kitGame({ id: 'g', players: ['a', 'b', 'c', 'd', 'e'], hands, start: T0 });
const kinds = (hands: KitHand[], marks: [string, Mark][]) =>
  ktBanterLog(game(hands), new Map(marks)).map((b) => b && `${b.kind}:${b.who}`);

describe('Kaali Teeri banter', () => {
  it('teases a Badshah whose bid failed, and a swept one first', () => {
    expect(kinds([{ bidder: 0, bid: 150, team: 100 }], [['p0', 'gold']])).toEqual(['bidFail:p0']);
    expect(kinds([{ bidder: 0, bid: 150, team: 0 }], [['p0', 'gold']])).toEqual(['swept:p0']);
  });

  it('teases a medallist partner on a failed bid, and praises one who stopped it', () => {
    expect(kinds([{ bidder: 0, bid: 150, team: 100 }], [['p1', 'silver']])).toEqual([
      'partnerFail:p1',
    ]);
    expect(kinds([{ bidder: 0, bid: 150, team: 100 }], [['p3', 'gold']])).toEqual(['stopped:p3']);
  });

  it('praises a big made bid and a sweep', () => {
    expect(kinds([{ bidder: 0, bid: 200, team: 210 }], [['p0', 'gold']])).toEqual(['bigMake:p0']);
    expect(kinds([{ bidder: 0, bid: 150, team: 250 }], [['p0', 'gold']])).toEqual(['sweep:p0']);
  });

  it('never teases a Legend, and says nothing with no holder at the table', () => {
    expect(kinds([{ bidder: 0, bid: 150, team: 100 }], [['p0', 'legend']])).toEqual([null]);
    expect(kinds([{ bidder: 0, bid: 150, team: 100 }], [])).toEqual([null]);
  });

  it('keeps the same kind out for the cooldown', () => {
    const fail: KitHand = { bidder: 0, bid: 150, team: 100 };
    expect(kinds([fail, fail, fail, fail], [['p0', 'gold']])).toEqual([
      'bidFail:p0',
      null,
      null,
      'bidFail:p0',
    ]);
  });
});
