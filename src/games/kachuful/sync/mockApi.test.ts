import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mockApi, seed } from '../../../../tools/mock-api/server';
import { ep } from '@/sync/endpoints';

/** Kachuful's boards on tools/mock-api (the in-memory API dev and e2e use), over real HTTP with the app's client. */
let srv: Server;
let base = '';
const realFetch = globalThis.fetch;
let cookie = '';

beforeAll(async () => {
  srv = createServer((req, res) =>
    mockApi(req, res, () => {
      res.statusCode = 404;
      res.end();
    }),
  );
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => srv.close(() => r())));

beforeEach(() => {
  seed();
  // The browser's cookie jar, for a test without one.
  vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
    const res = await realFetch(base + url, {
      ...init,
      redirect: 'manual',
      headers: { ...(init.headers as Record<string, string>), ...(cookie && { Cookie: cookie }) },
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return res;
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('Kachuful on the mock API', () => {
  it("a player's all-time rank is the bid accuracy board's, with more than 50 rounds", async () => {
    await ep.login('riya@kachuful.test', 'riya-demo');
    const board = (
      await ep.leaderboard(0, Date.now() + 864e5, 'accuracy', undefined, { minRounds: 50 })
    ).data!;
    const ranked = board.rows.filter((r) => r.qualified);
    expect(ranked.length).toBeGreaterThan(1);
    for (const row of board.rows) {
      const p = (await ep.player(row.player.id)).data!;
      expect([row.player.displayName, p.rank]).toEqual([
        row.player.displayName,
        { global: row.rank, outOf: ranked.length },
      ]);
    }
  });
});
