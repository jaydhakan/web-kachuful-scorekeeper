import { describe, expect, it } from 'vitest';
import { T0, kitGame, rulesWith, type KitEntry } from './__fixtures__/kit';
import { rulesOk, validate } from './validate';
import type { SpGame } from './types';

const make = (h: KitEntry) => kitGame([h]);
const NOW = T0 + 86_400_000;
const v = (g: SpGame) => validate(g, NOW);
/** Three hands that take team a to 240: a win on target. */
const WON: KitEntry[] = [0, 1, 2].map(() => ({ bids: [4, 3, 4, 3], teamA: 8 }));

describe('rulesOk', () => {
  it('accepts every choice Edit rules offers and nothing else', () => {
    expect(rulesOk(rulesWith())).toBe(true);
    expect(rulesOk(rulesWith({ timerSec: null, blindNil: true, minTeamBid: 4, mercy: -200 }))).toBe(
      true,
    );
    expect(rulesOk(rulesWith({ timerSec: 45 as 30 }))).toBe(false);
    expect(rulesOk(rulesWith({ nil: false, blindNil: true }))).toBe(false);
    expect(rulesOk(rulesWith({ minTeamBid: 5 }))).toBe(false);
    expect(rulesOk(rulesWith({ mercy: -100 }))).toBe(false);
    expect(rulesOk(null)).toBe(false);
  });
});

describe('validate (table-mode uploads)', () => {
  it('accepts a game won on target, one in progress and a cancelled one', () => {
    expect(
      v(kitGame(WON, { status: 'finished', result: { winner: 'a', endedBy: 'target' } })),
    ).toBeNull();
    expect(
      v(kitGame([...WON.slice(0, 2), { bids: [3, null, null, 2], phase: 'bidding' }])),
    ).toBeNull();
    expect(v(kitGame([{ bids: [3, 3, 3, 3], phase: 'tricks' }]))).toBeNull();
    expect(v(kitGame(WON.slice(0, 1), { status: 'cancelled' }))).toBeNull();
  });

  it('players: exactly four, distinct, named', () => {
    const g = make({ bids: [3, 3, 3, 3], teamA: 6 });
    expect(v({ ...g, players: g.players.slice(0, 3) })).toEqual({
      reason: 'players',
      handIndex: null,
    });
    expect(v({ ...g, players: [...g.players.slice(0, 3), { ...g.players[0] }] })?.reason).toBe(
      'players',
    );
    expect(
      v({ ...g, players: g.players.map((p, i) => (i ? p : { ...p, name: ' ' })) })?.reason,
    ).toBe('players');
  });

  it('rules and dealer', () => {
    const g = make({ bids: [3, 3, 3, 3], teamA: 6 });
    expect(v({ ...g, rules: rulesWith({ target: 55 }) })?.reason).toBe('rules');
    expect(v({ ...g, firstDealerIndex: 4 })?.reason).toBe('dealer');
    expect(v({ ...g, hands: [{ ...g.hands[0], dealer: 2 }] })).toEqual({
      reason: 'dealer',
      handIndex: 0,
    });
  });

  it('hands: in order, only the last unfinished, none after the game was decided', () => {
    const g = kitGame([
      { bids: [3, 3, 3, 3], teamA: 6 },
      { bids: [3, 3, 3, 3], teamA: 6 },
    ]);
    expect(v({ ...g, hands: [g.hands[0], { ...g.hands[1], index: 5 }] })?.reason).toBe('hands');
    expect(v({ ...g, hands: [{ ...g.hands[0], phase: 'tricks' }, g.hands[1]] })).toEqual({
      reason: 'hands',
      handIndex: 0,
    });
    expect(v(kitGame([...WON, { bids: [3, 3, 3, 3], teamA: 6 }]))).toEqual({
      reason: 'hands',
      handIndex: 3,
    });
  });

  it('bids: legal, in turn order, blind only on Nil and only when allowed', () => {
    expect(v(make({ bids: [3, 3, 14, 3], teamA: 6 }))).toEqual({ reason: 'bids', handIndex: 0 });
    // Dealer 0: seat 1 bids first, so seat 3 can't have bid while seat 2 hasn't.
    expect(v(make({ bids: [null, 3, null, 3], phase: 'bidding' }))?.reason).toBe('bids');
    expect(v(make({ bids: [3, 3, null, 3], phase: 'tricks' }))?.reason).toBe('bids');
    expect(
      v(kitGame([{ bids: [3, 1, 3, 2], teamA: 6 }], { rules: rulesWith({ minTeamBid: 4 }) }))
        ?.reason,
    ).toBe('bids');
    expect(
      v(
        kitGame([{ bids: [0, 3, 3, 3], teamA: 6, nil: [0, null, null, null] }], {
          rules: rulesWith({ nil: false }),
        }),
      )?.reason,
    ).toBe('bids');
    expect(
      v(
        make({
          bids: [0, 3, 3, 3],
          teamA: 6,
          nil: [0, null, null, null],
          blind: [true, false, false, false],
        }),
      )?.reason,
    ).toBe('bids');
    expect(
      v(
        kitGame([{ bids: [3, 3, 3, 3], teamA: 6, blind: [true, false, false, false] }], {
          rules: rulesWith({ blindNil: true }),
        }),
      )?.reason,
    ).toBe('bids');
  });

  it('tricks: 13 between the teams, Nil tricks inside the team’s, none before the phase', () => {
    expect(v(make({ bids: [3, 3, 3, 3], teamA: 14 }))?.reason).toBe('tricks');
    expect(v(make({ bids: [0, 3, 3, 3], teamA: 3, nil: [4, null, null, null] }))?.reason).toBe(
      'tricks',
    );
    expect(v(make({ bids: [0, 3, 3, 3], teamA: 3 }))?.reason).toBe('tricks');
    expect(v(make({ bids: [3, 3, 3, 3], teamA: 3, nil: [1, null, null, null] }))?.reason).toBe(
      'tricks',
    );
    expect(v(make({ bids: [0, 3, 0, 3], teamA: 3, nil: [1, null, 1, null] }))?.reason).toBe(
      'tricks',
    );
    expect(v(make({ bids: [null, 3, 3, 3], teamA: 6, phase: 'bidding' }))?.reason).toBe('tricks');
  });

  it('result: what the hands decided, or the host’s end or draw', () => {
    const won = (result: SpGame['result']) => v(kitGame(WON, { status: 'finished', result }));
    expect(won(undefined)?.reason).toBe('result');
    expect(won({ winner: 'b', endedBy: 'target' })?.reason).toBe('result');
    expect(won({ winner: 'a', endedBy: 'end' })?.reason).toBe('result');
    const two = (result: SpGame['result'], extra: KitEntry[] = []) =>
      v(kitGame([...WON.slice(0, 2), ...extra], { status: 'finished', result }));
    expect(two({ winner: 'a', endedBy: 'end' })).toBeNull();
    expect(
      two({ winner: 'a', endedBy: 'end' }, [{ bids: [null, null, null, 2], phase: 'bidding' }]),
    ).toBeNull();
    expect(two({ winner: 'b', endedBy: 'end' })?.reason).toBe('result');
    expect(two({ winner: 'draw', endedBy: 'draw' })).toBeNull();
    expect(two({ winner: 'a', endedBy: 'draw' })?.reason).toBe('result');
    expect(v(kitGame(WON.slice(0, 2), { result: { winner: 'a', endedBy: 'end' } }))?.reason).toBe(
      'result',
    );
    // An equal total ended by hand is a draw.
    const level: KitEntry[] = [
      { bids: [3, 3, 3, 3], teamA: 6 },
      { bids: [3, 3, 3, 3], teamA: 7 },
    ];
    expect(
      v(kitGame(level, { status: 'finished', result: { winner: 'draw', endedBy: 'end' } })),
    ).toBeNull();
  });

  it('times: nothing from the future, no hand before the game began', () => {
    const g = make({ bids: [3, 3, 3, 3], teamA: 6 });
    expect(v({ ...g, updatedAt: NOW + 3_600_000 })?.reason).toBe('times');
    expect(v({ ...g, hands: [{ ...g.hands[0], doneAt: T0 - 1 }] })).toEqual({
      reason: 'times',
      handIndex: 0,
    });
  });
});
