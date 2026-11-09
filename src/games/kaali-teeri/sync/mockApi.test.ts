import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mockApi, seed } from '../../../../tools/mock-api/server';
import { kitGame } from '@/games/kaali-teeri/domain/__fixtures__/kit';
import { archive, archiveKtGame } from '@/state/archive';
import { recFromServer } from '@/state/registry';
import type { Session } from '@/state/persistence';
import type { Page, Player } from '@/sync/types';
import { ep } from '@/sync/endpoints';
import { bindKtEngine, resetKtEngineForTests, syncKtNow } from './engine';
import { ktEp } from './endpoints';
import type { KtGameSummary, KtLiveResp } from './types';

/**
 * The engine and the share links against tools/mock-api (the in-memory API dev and e2e use), over real HTTP:
 * checks the mock's Kaali Teeri routes and the app's calls agree.
 */
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

beforeEach(async () => {
  seed();
  resetKtEngineForTests();
  await archive.ready;
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
afterEach(() => {
  vi.unstubAllGlobals();
  bindKtEngine(null);
});

async function signIn() {
  const r = await ep.login('riya@kachuful.test', 'riya-demo');
  const page = await realFetch(base + '/api/players?limit=200', { headers: { Cookie: cookie } });
  const players = ((await page.json()) as Page<Player>).items;
  archive.put('players', ...players.map((p) => recFromServer(p)));
  const s: Session = { user: r.user, player: null };
  return { s, ids: players.slice(0, 4).map((p) => p.id) };
}

describe('Kaali Teeri on the mock API', () => {
  it('uploads a game, lists it, ranks it, and refuses a bad one with the domain’s reason', async () => {
    const { s, ids } = await signIn();
    const g = kitGame({
      id: crypto.randomUUID(),
      players: ids,
      start: Date.now() - 3600e3,
      hands: [
        { bidder: 0, bid: 150, team: 160 },
        { bidder: 1, bid: 200, team: 100 },
      ],
    });
    archiveKtGame(g, { account: s.user.id });
    bindKtEngine({ session: () => s, game: () => null, syncGame: () => {} });
    await syncKtNow({ full: true });
    expect(archive.get('ktGames', g.syncId)!.syncedRev).toBe(g.rev);

    const list = await ktEp.games({ mine: true });
    expect((list.items[0] as KtGameSummary).hands).toBe(2);
    const board = await ktEp.leaderboard('all', 'made');
    const top = board.data.rows.find((r) => r.player.id === ids[0])!;
    expect(top).toMatchObject({ rank: 1, handsBid: 1, bidsMade: 1, madeRate: 1, games: 1 });
    expect(board.data.rows.find((r) => r.player.id === ids[1])).toMatchObject({ madeRate: 0 });
    expect((await ktEp.playerStats(ids[0])).data).toMatchObject({ handsBid: 1, bidsMade: 1 });
    expect((await ktEp.vs(ids[0], ids[1])).data).toMatchObject({ games: 1 });

    // A changed game with the same rev is stale; a bad one is refused with the domain's reason.
    const edit = { ...g, hands: [g.hands[0]] };
    await expect(ktEp.putGame(edit)).rejects.toMatchObject({ status: 409, code: 'stale' });
    const bad = { ...g, rev: 9, hands: [{ ...g.hands[0], teamPoints: 3 }, g.hands[1]] };
    await expect(ktEp.putGame(bad)).rejects.toMatchObject({
      status: 422,
      code: 'invalid_game',
      body: expect.objectContaining({ reason: 'team_points', handIndex: 0 }),
    });
    await expect(ep.putGame({ ...g } as never)).rejects.toMatchObject({ code: 'kind_mismatch' });

    // Share links: the public body carries the kind; the preview page opens Kaali Teeri.
    const link = await ep.link(g.syncId, 'live');
    const live = (await ktEp.live(link.token)) as KtLiveResp;
    expect(live).toMatchObject({ kind: 'kaali-teeri', game: { syncId: g.syncId } });
    expect(live.summary.owner.id).toBeNull();
    const page = await (await realFetch(`${base}/l/${link.token}`)).text();
    expect(page).toContain(`url=/kaali-teeri?live=${link.token}`);

    await ktEp.deleteGame(g.syncId);
    await expect(ktEp.live(link.token)).rejects.toMatchObject({ status: 410 });
  });
});
