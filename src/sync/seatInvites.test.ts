import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSeatInvites,
  dropInvite,
  INVITE_TTL_MS,
  putInvite,
  resetSeatInvitesForTests,
  serverNow,
  setInvites,
  useSeatInviteCount,
  useSeatInvites,
  type SeatInvite,
} from './seatInvites';
import {
  bannerCandidate,
  markTold,
  putUpdate,
  useCardsShown,
  useQuietInvites,
  useSeatInviteUpdates,
  resetSignalsForTests,
} from './seatInviteSignals';
import { applyFrame } from './seatInvitesLive';

const T0 = Date.UTC(2026, 10, 16, 12);

function invite(over: Partial<SeatInvite> = {}): SeatInvite {
  return {
    id: 'i1',
    kind: 'ishaara',
    gameId: 'g1',
    seat: 'clue:sun',
    status: 'pending',
    createdAt: T0,
    from: { userId: 'u-jay', name: 'Jay', emoji: '🦊', color: '#ff8800', photoUrl: null },
    table: { name: 'Jay’s game', seatsTaken: [] },
    partner: null,
    ...over,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  resetSeatInvitesForTests();
  resetSignalsForTests();
});
afterEach(() => vi.useRealTimers());

describe('the seat invite store', () => {
  it('counts pending invites per game, newest first', () => {
    const count = renderHook(() => useSeatInviteCount('ishaara'));
    const spades = renderHook(() => useSeatInviteCount('spades'));
    const list = renderHook(() => useSeatInvites('ishaara'));
    act(() =>
      setInvites(
        [
          invite(),
          invite({ id: 'i2', createdAt: T0 + 1000 }),
          invite({ id: 's1', kind: 'spades-online', seat: '2' }),
          invite({ id: 'x', status: 'declined' }),
        ],
        T0 + 2000,
      ),
    );
    expect(count.result.current).toBe(2);
    expect(spades.result.current).toBe(1);
    expect(list.result.current.map((i) => i.id)).toEqual(['i2', 'i1']);
  });

  it('hides an invite once its 30 minutes pass by the server clock, without a push', () => {
    // The device runs 5 minutes behind the server.
    const count = renderHook(() => useSeatInviteCount('ishaara'));
    act(() => setInvites([invite()], T0 + 5 * 60_000));
    expect(serverNow()).toBe(T0 + 5 * 60_000);
    expect(count.result.current).toBe(1);
    act(() => void vi.advanceTimersByTime(INVITE_TTL_MS - 5 * 60_000 - 1000));
    expect(count.result.current).toBe(1);
    act(() => void vi.advanceTimersByTime(2000));
    expect(count.result.current).toBe(0);
  });

  it('never lists an invite that arrives already expired', () => {
    act(() => setInvites([invite({ createdAt: T0 - INVITE_TTL_MS - 1 })], T0));
    const list = renderHook(() => useSeatInvites());
    expect(list.result.current).toEqual([]);
  });

  it('applies the stream: new, gone, an answered copy and the host’s updates', () => {
    const list = renderHook(() => useSeatInvites());
    const ups = renderHook(() => useSeatInviteUpdates('g1'));
    act(() => setInvites([], T0));
    act(() =>
      applyFrame({ event: 'seat-invite', id: null, data: JSON.stringify(invite({ id: 'n1' })) }),
    );
    expect(list.result.current.map((i) => i.id)).toEqual(['n1']);
    act(() =>
      applyFrame({
        event: 'seat-invite',
        id: null,
        data: JSON.stringify(invite({ id: 'n1', status: 'cancelled' })),
      }),
    );
    expect(list.result.current).toEqual([]);
    act(() => applyFrame({ event: 'seat-invite', id: null, data: JSON.stringify(invite()) }));
    act(() =>
      applyFrame({ event: 'seat-invite-gone', id: null, data: '{"id":"i1","status":"expired"}' }),
    );
    expect(list.result.current).toEqual([]);
    act(() =>
      applyFrame({
        event: 'seat-invite-update',
        id: null,
        data: JSON.stringify({ id: 'h1', status: 'declined', gameId: 'g1', seat: 'clue:moon' }),
      }),
    );
    expect(ups.result.current).toEqual([
      { id: 'h1', status: 'declined', gameId: 'g1', seat: 'clue:moon' },
    ]);
    act(() => applyFrame({ event: 'hello', id: null, data: `{"serverNow":${T0 + 60_000}}` }));
    expect(serverNow()).toBe(T0 + 60_000);
  });

  it('ignores malformed frames', () => {
    const list = renderHook(() => useSeatInvites());
    act(() => {
      applyFrame({ event: 'seat-invite', id: null, data: 'not json' });
      applyFrame({ event: 'seat-invite', id: null, data: '{"id":"x"}' });
      applyFrame({ event: 'ping', id: null, data: '{}' });
    });
    expect(list.result.current).toEqual([]);
  });

  it('keeps the host’s updates for a game only', () => {
    putUpdate({ id: 'a', status: 'declined', gameId: 'g1', seat: 'clue:sun' });
    putUpdate({ id: 'b', status: 'accepted', gameId: 'g2', seat: 'clue:sun' });
    putUpdate({ id: 'a', status: 'accepted', gameId: 'g1', seat: 'clue:sun' });
    const ups = renderHook(() => useSeatInviteUpdates('g1'));
    expect(ups.result.current).toEqual([
      { id: 'a', status: 'accepted', gameId: 'g1', seat: 'clue:sun' },
    ]);
  });

  it('announces only invites new to this visit, once, and not while quiet or shown as cards', () => {
    setInvites([invite({ id: 'old' })], T0);
    expect(bannerCandidate()).toBeNull();
    putInvite(invite({ id: 'new', createdAt: T0 + 10 }));
    expect(bannerCandidate()?.id).toBe('new');

    const quiet = renderHook(({ on }) => useQuietInvites(on), { initialProps: { on: true } });
    expect(bannerCandidate()).toBeNull();
    quiet.rerender({ on: false });
    expect(bannerCandidate()?.id).toBe('new');

    const cards = renderHook(() => useCardsShown('ishaara'));
    expect(bannerCandidate()).toBeNull();
    cards.unmount();
    markTold(['new']);
    expect(bannerCandidate()).toBeNull();
  });

  it('forgets everything on sign-out, and drops an answered invite', () => {
    const count = renderHook(() => useSeatInviteCount('ishaara'));
    act(() => setInvites([invite(), invite({ id: 'i2' })], T0));
    act(() => dropInvite('i2'));
    expect(count.result.current).toBe(1);
    act(() => clearSeatInvites());
    expect(count.result.current).toBe(0);
  });
});
