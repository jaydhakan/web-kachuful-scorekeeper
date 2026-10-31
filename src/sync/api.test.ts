import { ApiError, call, errorText, get, onUnauthenticated, post } from './api';

const reply = (status: number, body?: unknown, headers: Record<string, string> = {}) =>
  vi.fn(
    async () => new Response(body === undefined ? null : JSON.stringify(body), { status, headers }),
  );

afterEach(() => vi.unstubAllGlobals());

describe('api client', () => {
  it('sends the CSRF header and JSON on writes, same-origin cookies always', async () => {
    const f = reply(200, { ok: 1 });
    vi.stubGlobal('fetch', f);
    await post('/auth/login', { email: 'a' });
    await get('/players', { updatedSince: 5, cursor: null });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/auth/login');
    expect(init.headers).toMatchObject({ 'X-Kachuful': '1', 'Content-Type': 'application/json' });
    expect(init.credentials).toBe('same-origin');
    const [url2, init2] = f.mock.calls[1] as unknown as [string, RequestInit];
    expect(url2).toBe('/api/players?updatedSince=5');
    expect(init2.headers).not.toHaveProperty('X-Kachuful');
  });

  it('maps an error body to its code and status', async () => {
    vi.stubGlobal(
      'fetch',
      reply(409, { code: 'name_taken', message: 'taken', existing: { id: 'p' } }),
    );
    const e = await post('/players', {}).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({ status: 409, code: 'name_taken', body: { existing: { id: 'p' } } });
    expect(errorText(e, { name_taken: 'Taken!' }, 'Oops')).toBe('Taken!');
  });

  it('a network failure is "offline", a 5xx without a body is "server"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    );
    expect(await get('/x').catch((e: ApiError) => [e.code, e.offline])).toEqual(['offline', true]);
    vi.stubGlobal('fetch', reply(502));
    expect(await get('/x').catch((e: ApiError) => e.code)).toBe('server');
  });

  it('passes the ETag and resolves a 304 with no data', async () => {
    const f = reply(304, undefined, { ETag: '"9-x"' });
    vi.stubGlobal('fetch', f);
    const r = await call('GET', '/leaderboard', undefined, { etag: '"9-x"' });
    expect(r).toEqual({ data: null, status: 304, etag: '"9-x"' });
    expect((f.mock.calls[0] as unknown as [string, RequestInit])[1].headers).toMatchObject({
      'If-None-Match': '"9-x"',
    });
  });

  it('tells listeners about a 401', async () => {
    const seen = vi.fn();
    const off = onUnauthenticated(seen);
    vi.stubGlobal('fetch', reply(401, { code: 'unauthenticated' }));
    await get('/auth/me').catch(() => {});
    off();
    expect(seen).toHaveBeenCalledOnce();
  });
});
