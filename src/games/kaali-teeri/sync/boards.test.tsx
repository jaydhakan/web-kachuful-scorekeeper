import { act, renderHook, waitFor } from '@testing-library/react';
import { archive } from '@/state/archive';
import type { Session } from '@/state/persistence';
import { resetSessionForTests, setSession } from '@/sync/session';
import { useKtHeadToHead, useKtLeaderboard, useKtPlayerStats } from './boards';

const s: Session = {
  user: { id: 'u1', email: 'a@b.c', role: 'member', playerId: 'me' },
  player: null,
};

function stub(body: unknown, etag = 'W/"1"') {
  const f = vi.fn<(url: string) => Promise<Response>>(
    async () => new Response(JSON.stringify(body), { status: 200, headers: { ETag: etag } }),
  );
  vi.stubGlobal('fetch', f);
  return f;
}

beforeEach(async () => {
  await archive.ready;
  resetSessionForTests();
  setSession(null);
});
afterEach(() => vi.unstubAllGlobals());

describe('Kaali Teeri online boards', () => {
  it('signed out: asks nothing and says to use the device’s own numbers', async () => {
    const f = stub({});
    const { result } = renderHook(() => useKtLeaderboard('week', 'points'));
    await act(async () => {});
    expect(result.current).toMatchObject({ online: false, data: null, loading: false });
    expect(f).not.toHaveBeenCalled();
  });

  it('signed in: reads the board for the period and sort, and caches it with its ETag', async () => {
    setSession(s);
    const board = { period: 'week', sort: 'made', rows: [], generatedAt: 1 };
    const f = stub(board, 'W/"9"');
    const { result } = renderHook(() => useKtLeaderboard('week', 'made'));
    await waitFor(() => expect(result.current.data).toEqual(board));
    expect(result.current.online).toBe(true);
    expect(f.mock.calls[0][0]).toBe('/api/kaali-teeri/leaderboard?period=week&sort=made');
    expect(archive.get('cache', 'r:kt:lb:week:made')).toMatchObject({ etag: 'W/"9"' });
  });

  it('player stats and head-to-head use their routes; no id (or the same two) asks nothing', async () => {
    setSession(s);
    const f = stub({ games: 3 });
    const stats = renderHook(() => useKtPlayerStats('p1'));
    await waitFor(() => expect(stats.result.current.data).toEqual({ games: 3 }));
    expect(f.mock.calls[0][0]).toBe('/api/kaali-teeri/players/p1/stats');
    const vs = renderHook(() => useKtHeadToHead('p1', 'p2'));
    await waitFor(() => expect(vs.result.current.loading).toBe(false));
    expect(f.mock.calls[1][0]).toBe('/api/kaali-teeri/players/p1/vs/p2');
    renderHook(() => useKtHeadToHead('p1', 'p1'));
    renderHook(() => useKtPlayerStats(null));
    await act(async () => {});
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('a failed read keeps the cached copy and reports the error', async () => {
    setSession(s);
    archive.put('cache', { key: 'r:kt:stats:p9', value: { games: 1 }, fetchedAt: 1 });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ code: 'not_found' }), { status: 404 })),
    );
    const { result } = renderHook(() => useKtPlayerStats('p9'));
    expect(result.current.data).toEqual({ games: 1 });
    await waitFor(() => expect(result.current.error?.code).toBe('not_found'));
    expect(result.current.data).toEqual({ games: 1 });
  });
});
