import { act, renderHook } from '@testing-library/react';
import {
  clearRewardNews,
  dropGift,
  dropMilestone,
  putMilestones,
  rewardNews,
  useGiftNews,
  useMilestoneNews,
} from './rewardNews';
import { applyFrame } from './seatInvitesLive';
import type { Gift, MilestoneOut, PlayerSummary } from './types';

const P = { id: 'p1', displayName: 'Riya' } as PlayerSummary;
const gift = (id: string): Gift => ({
  id,
  item: { id: 'sherwani', v: 1 },
  from: P,
  to: { ...P, id: 'p2', displayName: 'Dev' },
  sentAt: 1,
  openedAt: null,
});
const milestone = (key: string): MilestoneOut => ({
  key,
  kind: 'group',
  game: null,
  gameId: 'g1',
  n: 100,
  players: [P],
  at: 1,
});
const frame = (event: string, data: unknown) =>
  applyFrame({ event, id: null, data: JSON.stringify(data) });

afterEach(() => clearRewardNews());

describe('gifts and milestones on the user stream', () => {
  it('a gift-received frame reaches the gift news, once, and is dropped when shown', () => {
    const gifts = renderHook(() => useGiftNews());
    act(() => frame('gift-received', { gift: gift('g1') }));
    act(() => frame('gift-received', { gift: gift('g1') }));
    expect(gifts.result.current.map((g) => g.id)).toEqual(['g1']);
    act(() => dropGift('g1'));
    expect(gifts.result.current).toEqual([]);
    // Shown already: the same frame again (a reconnect) doesn't bring it back.
    act(() => frame('gift-received', { gift: gift('g1') }));
    expect(gifts.result.current).toEqual([]);
  });

  it('a milestone frame and the upload’s status say it once, the first word kept', () => {
    const ms = renderHook(() => useMilestoneNews());
    act(() => putMilestones([milestone('group:all:100')], true));
    act(() => frame('milestone', { milestone: milestone('group:all:100') }));
    act(() => frame('milestone', { milestone: milestone('first:spades:boston') }));
    expect(ms.result.current.map((m) => [m.key, m.local])).toEqual([
      ['first:spades:boston', false],
      ['group:all:100', true],
    ]);
    act(() => dropMilestone('group:all:100'));
    expect(ms.result.current.map((m) => m.key)).toEqual(['first:spades:boston']);
  });

  it('ignores malformed frames, and signing out clears everything', () => {
    frame('gift-received', { gift: { item: 'x' } });
    frame('milestone', { key: 'no-wrapper' });
    applyFrame({ event: 'milestone', id: null, data: '{not json' });
    expect(rewardNews()).toEqual({ gifts: [], milestones: [] });
    frame('gift-received', { gift: gift('g2') });
    clearRewardNews();
    expect(rewardNews().gifts).toEqual([]);
    frame('gift-received', { gift: gift('g2') });
    expect(rewardNews().gifts).toHaveLength(1);
  });
});
