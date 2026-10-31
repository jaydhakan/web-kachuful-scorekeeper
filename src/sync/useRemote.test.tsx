import { act, renderHook, waitFor } from '@testing-library/react';
import { archive } from '@/state/archive';
import { call } from './api';
import { useRemote } from './useRemote';

const reply = (status: number, body?: unknown, etag?: string) =>
  vi.fn(
    async () =>
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: etag ? { ETag: etag } : {},
      }),
  );

beforeEach(() => archive.ready);
afterEach(() => vi.unstubAllGlobals());

describe('useRemote (cache first, HANDOFF §5.5 ETags)', () => {
  it('shows the cached copy, revalidates with its ETag, and keeps it on a 304', async () => {
    archive.put('cache', { key: 'r:lb', value: { n: 1 }, etag: 'W/"7"', fetchedAt: 1 });
    const f = reply(304, undefined, 'W/"7"');
    vi.stubGlobal('fetch', f);
    const { result } = renderHook(() =>
      useRemote<{ n: number }>('lb', (o) => call('GET', '/leaderboard', undefined, o)),
    );
    expect(result.current.data).toEqual({ n: 1 });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ n: 1 });
    expect((f.mock.calls[0] as unknown as [string, RequestInit])[1].headers).toMatchObject({
      'If-None-Match': 'W/"7"',
    });
  });

  it('stores a new answer with its ETag', async () => {
    vi.stubGlobal('fetch', reply(200, { n: 2 }, 'W/"8"'));
    const { result } = renderHook(() =>
      useRemote<{ n: number }>('lb2', (o) => call('GET', '/leaderboard', undefined, o)),
    );
    await waitFor(() => expect(result.current.data).toEqual({ n: 2 }));
    expect(archive.get('cache', 'r:lb2')).toMatchObject({ value: { n: 2 }, etag: 'W/"8"' });
  });

  it('never asks again for a closed day or season', async () => {
    archive.put('cache', { key: 'r:day', value: { final: true }, fetchedAt: 1 });
    const f = reply(200, { final: true });
    vi.stubGlobal('fetch', f);
    const { result } = renderHook(() =>
      useRemote<{ final: boolean }>(
        'day',
        (o) => call('GET', '/awards/daily?date=2026-10-01', undefined, o),
        (v) => v.final,
      ),
    );
    await act(async () => {});
    expect(result.current).toMatchObject({ data: { final: true }, loading: false });
    expect(f).not.toHaveBeenCalled();
  });
});
