import { renderHook, waitFor } from '@testing-library/react';
import { started } from '@/games/ishaara/domain/__fixtures__/kit';
import { gameInSearch, gameLink, useGameLink } from './gameLink';
import { useRefreshWhileVisible } from './lists';

const answer = (me: { host: boolean; team: 'sun' | 'moon' | null }) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ game: started().state, me, serverNow: 1 }))),
  );

afterEach(() => {
  vi.unstubAllGlobals();
  history.replaceState(null, '', '/');
});

describe('a link to one game (ISH-F13)', () => {
  it('writes and reads the game in the address', () => {
    expect(gameLink('g 1', 'https://x.test')).toBe('https://x.test/ishaara?game=g%201');
    expect(gameInSearch('?game=g%201')).toBe('g 1');
    expect(gameInSearch('?open=signin')).toBeNull();
  });

  it('opens a clue-giver at the key and tidies the address', async () => {
    answer({ host: false, team: 'moon' });
    history.replaceState(null, '', '/ishaara?game=g1');
    const open = vi.fn();
    renderHook(() => useGameLink(open));
    await waitFor(() => expect(open).toHaveBeenCalledWith('g1', 'clue'));
    expect(location.search).toBe('');
  });

  it('opens the host at the table, and does nothing without a game in the address', async () => {
    answer({ host: true, team: null });
    history.replaceState(null, '', '/ishaara?game=g2');
    const open = vi.fn();
    renderHook(() => useGameLink(open));
    await waitFor(() => expect(open).toHaveBeenCalledWith('g2', 'table'));
    const none = vi.fn();
    renderHook(() => useGameLink(none));
    await new Promise((r) => setTimeout(r, 0));
    expect(none).not.toHaveBeenCalled();
  });
});

describe('lists a clue-giver waits on', () => {
  it('ask again every few seconds while visible, and on coming back', () => {
    vi.useFakeTimers();
    const reload = vi.fn();
    const { unmount } = renderHook(() => useRefreshWhileVisible(reload, 5000));
    vi.advanceTimersByTime(10_000);
    expect(reload).toHaveBeenCalledTimes(2);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(reload).toHaveBeenCalledTimes(3);
    unmount();
    vi.advanceTimersByTime(10_000);
    expect(reload).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});
