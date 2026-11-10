import { act, renderHook } from '@testing-library/react';
import { started } from '@/games/ishaara/domain/__fixtures__/kit';
import type { SendResult } from './link';
import { TIMEOUT_RETRY_MS, useAutoTimeout, useClue } from './useTable';
import { ApiError } from '@/sync/api';

const G = started().state;
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useAutoTimeout', () => {
  it('sends timeout at the deadline on the server clock, again each second while too early', async () => {
    vi.useFakeTimers({ now: 0 });
    const tooEarly: SendResult = {
      ok: false,
      error: new ApiError(422, 'invalid_action', { reason: 'too-early' }),
    };
    const send = vi
      .fn<(a: unknown) => Promise<SendResult>>()
      .mockResolvedValueOnce(tooEarly)
      .mockResolvedValueOnce({ ok: false, refused: 'busy' })
      .mockResolvedValue({ ok: true, game: G });
    // The server runs 1 s ahead, so its deadline of 5000 is 4000 here.
    const game = { ...G, deadline: 5000 };
    const { rerender } = renderHook((p) => useAutoTimeout(p), {
      initialProps: { game, me: { host: true, team: null }, clockOffset: 1000, send },
    });
    await act(() => vi.advanceTimersByTimeAsync(3999));
    expect(send).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(send).toHaveBeenCalledWith({ type: 'timeout' });
    await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_RETRY_MS * 2));
    expect(send).toHaveBeenCalledTimes(3);
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(send).toHaveBeenCalledTimes(3);
    // A clue phone never sends it.
    rerender({
      game: { ...G, deadline: 20_000 },
      me: { host: false, team: null },
      clockOffset: 0,
      send,
    });
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(send).toHaveBeenCalledTimes(3);
  });
});

describe('useClue', () => {
  it('asks for the key once, keeps it in memory, and reports a refusal', async () => {
    const f = vi.fn(async (url: string) => {
      if (url.endsWith('/key'))
        return new Response(JSON.stringify({ key: Array(25).fill('blank'), team: 'moon' }));
      return new Response(
        JSON.stringify({ game: G, me: { host: false, team: 'moon' }, serverNow: 1 }),
      );
    });
    vi.stubGlobal('fetch', f);
    const { result, unmount } = renderHook(() => useClue(G.id));
    expect(result.current.keyStatus).toBe('idle');
    act(() => result.current.openKey());
    act(() => result.current.openKey());
    await vi.waitFor(() => expect(result.current.keyStatus).toBe('ready'));
    expect(result.current.team).toBe('moon');
    expect(result.current.key).toHaveLength(25);
    expect(f.mock.calls.filter((c) => String(c[0]).endsWith('/key'))).toHaveLength(1);
    expect(JSON.stringify(localStorage)).not.toContain('blank');
    unmount();

    vi.stubGlobal('fetch', async (url: string) =>
      url.endsWith('/key')
        ? new Response(JSON.stringify({ code: 'forbidden' }), { status: 403 })
        : new Response(JSON.stringify({ game: G, me: { host: true, team: null }, serverNow: 1 })),
    );
    const r2 = renderHook(() => useClue(G.id));
    act(() => r2.result.current.openKey());
    await vi.waitFor(() => expect(r2.result.current.keyStatus).toBe('forbidden'));
    expect(r2.result.current.key).toBeNull();
  });
});
