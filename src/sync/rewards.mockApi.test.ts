import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mockApi, seed } from '../../tools/mock-api/server';
import { kitGame, rows } from '@/games/kachuful/domain/__fixtures__/kit';
import { ep } from './endpoints';
import type { Player, WireGame } from './types';

/**
 * The Wardrobe, the Bazaar, gifts and milestones (backend-requests.md §3–§6) on tools/mock-api over real HTTP with
 * the app's client: the mock follows the doc and the client agrees with it.
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

beforeEach(() => {
  seed();
  cookie = '';
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

async function as(who: 'admin' | 'riya' | 'kabir') {
  cookie = '';
  await ep.login(`${who}@kachuful.test`, `${who}-demo`);
}
const mock = (path: string, body: unknown) =>
  realFetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => r.json() as Promise<Record<string, unknown>>);
const grant = (name: string, amount: number) => mock('/api/__mock/sikke', { name, amount });
async function players(): Promise<Player[]> {
  return (await ep.players()).items;
}
const idOf = (ps: Player[], name: string) => ps.find((p) => p.displayName === name)!.id;
const uuid = () => crypto.randomUUID();

describe('the Bazaar', () => {
  it('has six weekly items, every common always, and a balance', async () => {
    await as('riya');
    const b = (await ep.bazaar()).data;
    expect(b.week).toMatch(/^\d{4}-W\d{2}$/);
    expect(b.refreshesAt).toBeGreaterThan(Date.now());
    expect(b.weekly).toHaveLength(6);
    expect(new Set(b.weekly.map((i) => i.id)).size).toBe(6);
    expect(b.always.every((i) => i.price === 100)).toBe(true);
    expect(b.balance.balance).toBe(b.balance.earned - b.balance.spent);
  });

  it('buys once per purchase id, and answers each refusal with its code', async () => {
    await as('riya');
    await grant('Riya', 5000);
    const b = (await ep.bazaar()).data;
    const weekly = b.weekly.find((i) => i.price === 300)!;
    const id = uuid();
    const first = await ep.buy(weekly.id, 0, id);
    expect(first.item).toMatchObject({ id: weekly.id, v: 0, source: 'bought' });
    expect(first.balance.spent).toBe(300);
    // The same id again returns the first result and charges nothing.
    expect(await ep.buy(weekly.id, 0, id)).toEqual(first);
    await expect(ep.buy(weekly.id, 0, uuid())).rejects.toMatchObject({
      status: 409,
      code: 'already_owned',
    });
    // A colour of an owned item costs 50, and its stock doesn't matter.
    expect((await ep.buy(weekly.id, 1, uuid())).balance.spent).toBe(350);
    const notStocked = ['jersey', 'shades', 'diya_glow', 'lucky_seven', 'card_shark'].find(
      (x) => !b.weekly.some((i) => i.id === x),
    )!;
    await expect(ep.buy(notStocked, 0, uuid())).rejects.toMatchObject({
      status: 422,
      code: 'not_in_stock',
    });
    await expect(ep.buy('champions_shaal', 0, uuid())).rejects.toMatchObject({
      code: 'not_for_sale',
    });
    const sikke = (await ep.sikke(idOf(await players(), 'Riya'))).data;
    expect(sikke).toMatchObject({ spent: 350, balance: sikke.lifetime - 350 });
  });

  it('refuses a buyer short of Sikke with the balance and the price', async () => {
    await as('kabir');
    const { balance } = (await ep.bazaar()).data;
    await grant('Kabir', -balance.earned);
    await expect(ep.buy('hoodie', 0, uuid())).rejects.toMatchObject({
      status: 422,
      code: 'not_enough_sikke',
      body: { balance: 0, price: 100 },
    });
  });
});

describe('the Wardrobe', () => {
  it('wears only owned pairs, and everyone sees the look', async () => {
    await as('riya');
    await grant('Riya', 5000);
    await ep.buy('hoodie', 2, uuid());
    const w = (await ep.wardrobe()).data;
    expect(w.owned).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'hoodie', v: 0, source: 'bought' }),
        expect.objectContaining({ id: 'hoodie', v: 2, source: 'bought' }),
        expect.objectContaining({ id: 'pehle_waale', source: 'honour', at: null }),
      ]),
    );
    expect(w.saved).toEqual([null, null, null]);
    await expect(ep.putLook({ outfit: { id: 'sherwani', v: 0 } })).rejects.toMatchObject({
      status: 422,
      code: 'invalid_look',
      body: { slot: 'outfit' },
    });
    await expect(ep.putLook({ headwear: { id: 'hoodie', v: 0 } })).rejects.toMatchObject({
      body: { slot: 'headwear' },
    });
    const look = { outfit: { id: 'hoodie', v: 2 }, badge: { id: 'pehle_waale', v: 0 } };
    expect(await ep.putLook(look)).toEqual(look);
    await as('kabir');
    expect((await players()).find((p) => p.displayName === 'Riya')?.look).toEqual(look);
    expect((await players()).find((p) => p.displayName === 'Asha')?.look).toBeNull();
  });

  it('keeps three saved looks, even with items not owned yet', async () => {
    await as('riya');
    const look = { outfit: { id: 'sherwani', v: 1 } };
    expect(await ep.putSavedLook(2, 'Shaadi', look)).toEqual({ name: 'Shaadi', look });
    expect((await ep.wardrobe()).data.saved).toEqual([null, null, { name: 'Shaadi', look }]);
    await expect(ep.putSavedLook(1, '', look)).rejects.toMatchObject({ status: 422 });
    await ep.deleteSavedLook(2);
    expect((await ep.wardrobe()).data.saved).toEqual([null, null, null]);
  });
});

describe('gifts', () => {
  it('goes to someone in the circle, who owns it at once and opens it at the table', async () => {
    await as('riya');
    await grant('Riya', 5000);
    const ps = await players();
    const asha = idOf(ps, 'Asha');
    const giftId = uuid();
    const g = await ep.sendGift('sherwani', 1, asha, giftId);
    expect(g).toMatchObject({ item: { id: 'sherwani', v: 1 }, openedAt: null });
    expect(g.from.displayName).toBe('Riya');
    expect(await ep.sendGift('sherwani', 1, asha, giftId)).toEqual(g);
    await expect(ep.sendGift('sherwani', 1, asha, uuid())).rejects.toMatchObject({
      status: 409,
      code: 'already_owned',
    });
    await expect(ep.sendGift('kurta', 1, idOf(ps, 'Riya'), uuid())).rejects.toMatchObject({
      code: 'self_gift',
    });
    await expect(ep.sendGift('pehle_waale', 0, asha, uuid())).rejects.toMatchObject({
      code: 'not_for_sale',
    });
    expect((await ep.wardrobe()).data.balance.spent).toBe(800);

    await as('kabir');
    const pending = await ep.pendingGifts([asha, idOf(ps, 'Om')]);
    expect(pending.items.map((x) => x.id)).toEqual([giftId]);
    expect((await ep.openGift(giftId)).openedAt).toEqual(expect.any(Number));
    expect((await ep.pendingGifts([asha])).items).toEqual([]);
    const feed = await ep.activity(null, 'all');
    expect(feed.items.some((a) => a.kind === 'gift')).toBe(true);
    await as('riya');
    expect((await ep.myGifts(null)).items.map((x) => x.id)).toEqual([giftId]);
  });

  it('refuses a player outside the circle', async () => {
    await as('admin');
    const stranger = await ep.createPlayer({
      id: uuid(),
      displayName: 'Stranger',
      email: 'stranger@kachuful.test',
      emoji: '🙂',
      color: '#60a5fa',
    });
    await as('kabir');
    await grant('Kabir', 5000);
    await expect(ep.sendGift('kurta', 0, stranger.id, uuid())).rejects.toMatchObject({
      status: 422,
      code: 'not_in_circle',
    });
  });
});

describe('milestones', () => {
  it('an armed milestone comes back in the upload’s status, then in the list', async () => {
    await as('admin');
    await mock('/api/__mock/milestone', { next: true });
    const ps = (await players()).slice(0, 4);
    const g = kitGame({
      id: uuid(),
      players: ps.map((p) => p.id),
      names: ps.map((p) => p.displayName),
      start: Date.now() - 3600e3,
      rounds: rows(4, 10, (i) => [i % 4]),
      finished: true,
    });
    const out = await ep.putGame(g as WireGame);
    expect(out.status?.milestones).toHaveLength(1);
    const m = out.status!.milestones![0];
    expect(m).toMatchObject({ kind: 'group', game: null, gameId: g.syncId ?? g.id });
    expect(m.players.map((p) => p.id).sort()).toEqual(ps.map((p) => p.id).sort());
    expect((await ep.milestones(null)).items[0].key).toBe(m.key);
  });

  it('the control makes one at once, by key', async () => {
    await as('riya');
    const m = await mock('/api/__mock/milestone', { key: 'first:spades:boston' });
    expect(m).toMatchObject({ key: 'first:spades:boston', kind: 'first', game: 'spades', n: null });
    expect((await ep.milestones(null)).items.map((x) => x.key)).toContain('first:spades:boston');
  });
});
