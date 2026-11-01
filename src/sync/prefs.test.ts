import { KEYS, storage, type LastGroup } from '@/state/persistence';
import { cachedPrefs, keepPrefs } from '@/state/prefs';
import { refreshPrefs, sendSetup, takePrefs } from './prefs';
import type { Preferences } from './types';

/** The client half of requests 2 and 3 against the contract of 2026-11-01, and against today's production (404). */
type Call = { method: string; url: string; body: unknown };
function serve(routes: Record<string, () => [number, unknown?]>) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const key = `${init.method} ${url}`;
      calls.push({
        method: init.method!,
        url,
        body: init.body ? JSON.parse(String(init.body)) : undefined,
      });
      const [status, body] = routes[key]?.() ?? [404, { code: 'not_found', message: 'Not found' }];
      return new Response(body === undefined ? null : JSON.stringify(body), { status });
    }),
  );
  return calls;
}
const patches = (calls: Call[]) => calls.filter((c) => c.method === 'PATCH');

const lg = (n: number, at?: number): LastGroup => ({
  names: Array.from({ length: n }, (_, i) => 'P' + i),
  emojis: [],
  colors: [],
  direction: 'ccw',
  decks: 1,
  at,
});
const prefs = (o: Partial<Preferences> = {}): Preferences => ({
  theme: null,
  setup: { playerCount: 4, decks: 1, direction: 'cw' },
  updatedAt: 1000,
  ...o,
});
const echo = (setup: Preferences['setup']) => () =>
  [200, prefs({ setup, updatedAt: 2000 })] as [number, unknown];

afterEach(() => vi.unstubAllGlobals());
beforeEach(() => localStorage.clear());

describe('preferences from the server (requests 2 and 3)', () => {
  it('an answer without preferences (production until deployed) changes nothing and sends nothing', async () => {
    const calls = serve({});
    storage.set(KEYS.lastGroup, lg(5, 5000));
    takePrefs(undefined);
    await Promise.resolve();
    expect(cachedPrefs()).toBeNull();
    expect(calls).toEqual([]);
  });

  it('keeps them, and leaves the server alone when its setup is the newer', async () => {
    const calls = serve({});
    storage.set(KEYS.lastGroup, lg(5, 500));
    takePrefs(prefs());
    await vi.waitFor(() => expect(cachedPrefs()).toEqual(prefs()));
    expect(patches(calls)).toEqual([]);
  });

  it('sends this device’s last group when it is the newer, and keeps the answer', async () => {
    const setup = { playerCount: 5, decks: 1, direction: 'ccw' } as const;
    const calls = serve({ 'PATCH /api/me/preferences': echo(setup) });
    storage.set(KEYS.lastGroup, lg(5, 5000));
    takePrefs(prefs());
    await vi.waitFor(() => expect(cachedPrefs()?.updatedAt).toBe(2000));
    expect(patches(calls)).toEqual([
      { method: 'PATCH', url: '/api/me/preferences', body: { setup } },
    ]);
  });

  it('an account that never saved a setup gets this device’s group, even one saved before groups had a time', async () => {
    const calls = serve({ 'PATCH /api/me/preferences': echo(null) });
    storage.set(KEYS.lastGroup, lg(6));
    takePrefs(prefs({ setup: null, updatedAt: null }));
    await vi.waitFor(() => expect(patches(calls)).toHaveLength(1));
    expect(patches(calls)[0].body).toEqual({
      setup: { playerCount: 6, decks: 1, direction: 'ccw' },
    });
  });

  it('a newer group with the same table is not sent again (every PATCH moves updatedAt)', async () => {
    const calls = serve({});
    storage.set(KEYS.lastGroup, lg(4, 5000));
    takePrefs(prefs({ setup: { playerCount: 4, decks: 1, direction: 'ccw' } }));
    await Promise.resolve();
    expect(patches(calls)).toEqual([]);
  });

  it('refresh reads /auth/me, and an offline or 401 answer keeps the cached copy', async () => {
    serve({ 'GET /api/auth/me': () => [200, { user: {}, player: null, preferences: prefs() }] });
    await refreshPrefs();
    expect(cachedPrefs()).toEqual(prefs());
    serve({ 'GET /api/auth/me': () => [401, { code: 'unauthenticated' }] });
    await refreshPrefs();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await refreshPrefs();
    expect(cachedPrefs()).toEqual(prefs());
  });
});

describe('sending the setup when a game starts', () => {
  it('sends a table that fits; a 404 or offline keeps it on this device without throwing', async () => {
    const calls = serve({});
    await expect(sendSetup(lg(5, 1))).resolves.toBeUndefined();
    expect(patches(calls)).toHaveLength(1);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(sendSetup(lg(5, 1))).resolves.toBeUndefined();
    expect(cachedPrefs()).toBeNull();
  });

  it('skips a table the server already has, and one that can’t be dealt', async () => {
    const calls = serve({});
    keepPrefs(prefs({ setup: { playerCount: 5, decks: 1, direction: 'ccw' } }));
    await sendSetup(lg(5, 1));
    await sendSetup(lg(9, 1));
    expect(calls).toEqual([]);
  });

  it('a 422 (count that doesn’t fit the decks) is the contract’s shape and changes nothing here', async () => {
    serve({
      'PATCH /api/me/preferences': () => [
        422,
        {
          code: 'invalid',
          message: 'Invalid',
          fields: { setup: 'playerCount does not fit decks' },
        },
      ],
    });
    await sendSetup(lg(5, 1));
    expect(cachedPrefs()).toBeNull();
  });
});
