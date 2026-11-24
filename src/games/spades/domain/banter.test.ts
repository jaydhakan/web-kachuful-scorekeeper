import { describe, expect, it } from 'vitest';
import type { Mark } from '../../../progression/banter';
import { spBanterLog } from './banter';
import { tableHand, type TableEntry } from './table';
import type { SpGame } from './types';

const game = (hands: Omit<TableEntry, 'index' | 'dealer'>[]): SpGame =>
  ({
    kind: 'spades',
    schemaVersion: 1,
    id: 'g',
    syncId: 's',
    rev: 1,
    createdAt: 0,
    updatedAt: 0,
    players: ['Riya', 'Arjun', 'Dev', 'Meera'].map((name, k) => ({
      id: 'p' + k,
      name,
      emoji: '🙂',
      color: '#888888',
    })),
    firstDealerIndex: 0,
    direction: 'cw',
    rules: {
      target: 500,
      timerSec: null,
      nil: true,
      blindNil: false,
      minTeamBid: null,
      mercy: null,
    },
    hands: hands.map((h, i) => tableHand({ ...h, index: i, dealer: 0 })),
    status: 'active',
  }) as unknown as SpGame;
const kinds = (hands: Omit<TableEntry, 'index' | 'dealer'>[], marks: [string, Mark][]) =>
  spBanterLog(game(hands), new Map(marks)).map((b) => b && `${b.kind}:${b.who}`);

describe('Spades banter', () => {
  it('teases a Badshah whose team was set, and one whose Nil broke', () => {
    expect(kinds([{ bids: [4, 3, 4, 3], teamA: 6 }], [['p0', 'gold']])).toEqual(['set:p0']);
    expect(kinds([{ bids: [0, 3, 4, 3], teamA: 6, nilTricks: [1] }], [['p0', 'gold']])).toEqual([
      'nilBroken:p0',
    ]);
  });

  it('praises a made Nil, a big contract and setting the other team', () => {
    expect(kinds([{ bids: [0, 3, 4, 3], teamA: 6, nilTricks: [0] }], [['p0', 'gold']])).toEqual([
      'nilMade:p0',
    ]);
    expect(kinds([{ bids: [5, 1, 5, 1], teamA: 11 }], [['p0', 'gold']])).toEqual(['bigMake:p0']);
    expect(kinds([{ bids: [3, 5, 3, 5], teamA: 6 }], [['p0', 'gold']])).toEqual(['setThem:p0']);
  });

  it('never teases a Legend, and says nothing with no holder seated', () => {
    expect(kinds([{ bids: [4, 3, 4, 3], teamA: 6 }], [['p0', 'legend']])).toEqual([null]);
    expect(kinds([{ bids: [4, 3, 4, 3], teamA: 6 }], [])).toEqual([null]);
  });
});
