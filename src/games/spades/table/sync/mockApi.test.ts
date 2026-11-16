import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mockApi, seed } from '../../../../../tools/mock-api/server';
import { kitGame } from '@/games/spades/domain/__fixtures__/kit';
import {
  gameResult,
  scoresOf,
  totals,
  validate,
  type SpGame,
  type SpResult,
} from '@/games/spades/domain';
import { archive } from '@/state/archive';
import { recFromServer } from '@/state/registry';
import type { Session } from '@/state/persistence';
import type { Page, Player } from '@/sync/types';
import { ep } from '@/sync/endpoints';
import { archiveSpGame } from '../state/archive';
import { bindSpEngine, resetSpEngineForTests, syncSpNow } from './engine';
import { spEp } from './endpoints';
import type { SpGameSummary, SpLiveResp } from './types';

/**
 * The engine and the share links against tools/mock-api (the in-memory API dev and e2e use), over real HTTP:
 * checks the mock's Spades table-mode routes and the app's calls agree.
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
  resetSpEngineForTests();
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
  bindSpEngine(null);
});

async function signIn() {
  const r = await ep.login('riya@kachuful.test', 'riya-demo');
  const page = await realFetch(base + '/api/players?limit=200', { headers: { Cookie: cookie } });
  const players = ((await page.json()) as Page<Player>).items;
  archive.put('players', ...players.map((p) => recFromServer(p)));
  const s: Session = { user: r.user, player: null };
  return { s, ids: players.slice(0, 4).map((p) => p.id) };
}

/** Two hands take team a past 200: finished a minute ago, so today's board and a live link both have it. */
function endedGame(ids: string[]): SpGame {
  const start = Date.now() - 3600e3;
  const g = kitGame(
    [
      { bids: [3, 4, 3, 3], teamA: 7 },
      { bids: [0, 4, 4, 3], teamA: 5, nil: [0, null, null, null] },
    ],
    { id: crypto.randomUUID(), syncId: crypto.randomUUID(), createdAt: start },
  );
  const updatedAt = Date.now() - 60e3;
  return {
    ...g,
    players: g.players.map((p, i) => ({ ...p, playerId: ids[i] })),
    hands: g.hands.map((h, i) => ({ ...h, doneAt: start + (i + 1) * 600e3 })),
    updatedAt,
    finishedAt: updatedAt,
    status: 'finished',
    result: gameResult(g) as SpResult,
  };
}

describe('Spades table mode on the mock API', () => {
  it('uploads a game, lists it, ranks it, and refuses a bad one with the domain’s reason', async () => {
    const { s, ids } = await signIn();
    const g = endedGame(ids);
    expect(validate(g)).toBeNull();
    archiveSpGame(g, { account: s.user.id });
    bindSpEngine({ session: () => s, game: () => null, syncGame: () => {} });
    await syncSpNow({ full: true });
    expect(archive.get('spGames', g.syncId)!.syncedRev).toBe(g.rev);

    const list = await spEp.games({ mine: true });
    const sum = list.items.find((x) => x.id === g.syncId) as SpGameSummary;
    expect(sum).toMatchObject({
      kind: 'spades',
      hands: 2,
      status: 'finished',
      target: 200,
      result: g.result,
      scores: scoresOf(totals(g.hands)),
    });
    expect(sum.players.map((p) => p.team)).toEqual(['a', 'b', 'a', 'b']);

    const board = await spEp.leaderboard('today', 'made');
    expect(board.data.rows).toHaveLength(4);
    expect(board.data.rows.find((r) => r.player.id === ids[0])).toMatchObject({
      games: 1,
      bids: 1,
      bidsMade: 1,
      nils: 1,
      nilsMade: 1,
      rank: 1,
    });
    expect(board.data.pairs).toHaveLength(2);
    // Stats and head-to-head are all time, so the seeded games may add to these.
    const stats = (await spEp.playerStats(ids[0])).data;
    expect(stats.games).toBeGreaterThanOrEqual(1);
    expect(stats.partners.map((p) => p.playerId)).toContain(ids[2]);
    expect((await spEp.vs(ids[0], ids[1])).data.against).toBeGreaterThanOrEqual(1);

    // A changed game with the same rev is stale; a bad one is refused with the domain's reason.
    const edit = { ...g, hands: [g.hands[0]] };
    await expect(spEp.putGame(edit)).rejects.toMatchObject({ status: 409, code: 'stale' });
    const bad = {
      ...g,
      rev: 9,
      hands: [{ ...g.hands[0], teamTricks: [7, 7] as [number, number] }, g.hands[1]],
    };
    await expect(spEp.putGame(bad)).rejects.toMatchObject({
      status: 422,
      code: 'invalid_game',
      body: expect.objectContaining({ reason: 'tricks', handIndex: 0 }),
    });
    await expect(ep.putGame({ ...g } as never)).rejects.toMatchObject({ code: 'kind_mismatch' });

    // Share links: the public body carries the kind; the preview page opens Spades.
    const link = await ep.link(g.syncId, 'live');
    const live = (await spEp.live(link.token)) as SpLiveResp;
    expect(live).toMatchObject({ kind: 'spades', game: { syncId: g.syncId } });
    expect(live.summary.owner.id).toBeNull();
    const page = await (await realFetch(`${base}/l/${link.token}`)).text();
    expect(page).toContain(`url=/spades?live=${link.token}`);
    const recap = await ep.link(g.syncId, 'recap');
    expect(await spEp.recap(recap.token)).toMatchObject({ kind: 'spades' });

    await spEp.deleteGame(g.syncId);
    await expect(spEp.live(link.token)).rejects.toMatchObject({ status: 410 });
    expect((await spEp.leaderboard('today', 'wins')).data.rows).toEqual([]);
  });

  it('the seed has finished games for the demo players, so the boards are not empty', async () => {
    await signIn();
    const list = await spEp.games({});
    expect(list.items).toHaveLength(3);
    expect(list.items.every((x) => 'status' in x && x.status === 'finished')).toBe(true);
    const board = await spEp.leaderboard('all', 'wins');
    expect(board.data.rows.length).toBeGreaterThan(4);
    expect(board.data.rows[0]).toMatchObject({ rank: 1 });
    expect(board.data.pairs.length).toBeGreaterThan(0);
    // Riya scored one and sat in all three.
    expect((await spEp.games({ mine: true })).items).toHaveLength(1);
    expect((await spEp.games({ involving: true })).items).toHaveLength(3);
  });
});
