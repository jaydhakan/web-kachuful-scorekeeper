import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mockApi, seed } from '../../../../../tools/mock-api/server';
import { rulesWith } from '@/games/spades/domain/__fixtures__/kit';
import type { Action } from '@/games/spades/domain';
import { ApiError } from '@/sync/api';
import { ep } from '@/sync/endpoints';
import { seatEp } from '@/sync/seatInviteApi';
import { reasonOf, spEp, viewOfError } from './endpoints';
import type { SpViewOut } from './types';

/**
 * Spades online against tools/mock-api over real HTTP, as four accounts: checks the mock follows backend-requests.md
 * §4 and the app's client agrees with it, down to each seat seeing only its own hand.
 */
let srv: Server;
let base = '';
const realFetch = globalThis.fetch;
let cookie = '';
const jars: Record<string, string> = {};

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
  for (const who of ['admin', 'riya', 'kabir']) {
    cookie = '';
    await ep.login(`${who}@kachuful.test`, `${who}-demo`);
    jars[who] = cookie;
  }
  // A fourth account, linked to Asha (a player Riya made, so in Riya's circle).
  cookie = '';
  const { token } = await (
    await realFetch(base + '/api/__mock/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'asha@kachuful.test' }),
    })
  ).json();
  const players = await (
    await realFetch(base + '/api/players?limit=200', { headers: { Cookie: jars.admin } })
  ).json();
  const asha = players.items.find((p: { displayName: string }) => p.displayName === 'Asha');
  const r = await realFetch(base + `/api/auth/invites/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Kachuful': '1' },
    body: JSON.stringify({ password: 'asha-demo-1', player: { id: asha.id } }),
  });
  expect(r.ok).toBe(true);
  jars.asha = r.headers.get('set-cookie')!.split(';')[0];
});
afterEach(() => vi.unstubAllGlobals());

const as = (who: string) => void (cookie = jars[who]);
const fail = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error('should have failed');
    },
    (e: ApiError) => e,
  );
let n = 0;
const act = (v: SpViewOut, a: Action) =>
  spEp.act(v.table.id, {
    ...a,
    actionId: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
    rev: v.table.rev,
  });

describe('the mock Spades online API', () => {
  it('runs a table from create to the deal, each seat seeing only its own hand', async () => {
    as('admin');
    const id = crypto.randomUUID();
    const made = await spEp.create({ id, rules: rulesWith({ target: 300 }) });
    expect(made.me).toEqual({ seat: 0, host: true, hand: null });
    expect(made.table).toMatchObject({
      name: "Jay's table",
      status: 'lobby',
      rules: { target: 300 },
    });
    expect(made.invites).toEqual([null, null, null, null]);

    as('riya');
    expect(await spEp.byCode(made.table.code)).toEqual({ id });
    expect((await fail(spEp.byCode('ZZZZ'))).status).toBe(404);
    const riya = await spEp.join(id);
    expect(riya.me.seat).toBe(1);
    const e = await fail(spEp.rules(id, rulesWith()));
    expect([e.status, e.code]).toEqual([403, 'not_your_turn']);
    expect(viewOfError(e)?.table.rev).toBe(riya.table.rev);

    // Riya invites nobody (not the host); Jay invites Kabir to seat 2, and the view shows it.
    as('admin');
    const kabirId = (await seatEp.circle()).items.find((c) => c.name === 'Kabir')!.userId;
    const inv = await seatEp.create(id, { userId: kabirId, seat: '2' });
    const shown = await spEp.view(id);
    expect(shown.invites[2]).toMatchObject({ id: inv.id, userId: kabirId, name: 'Kabir' });
    as('kabir');
    await seatEp.accept(inv.id);
    as('admin');
    const full3 = await spEp.view(id);
    expect(full3.invites[2]).toBeNull();
    expect(full3.table.seats[2].who?.name).toBe('Kabir');

    as('asha');
    await spEp.join(id);
    as('riya');
    const er = await fail(spEp.join(id, 0));
    expect(reasonOf(er)).toBe('seat-taken');

    for (const who of ['admin', 'riya', 'kabir', 'asha']) {
      as(who);
      await act(await spEp.view(id), { type: 'ready' });
    }
    as('riya');
    const no = await fail(act(await spEp.view(id), { type: 'drawForDeal' }));
    expect(no.status).toBe(403);
    as('admin');
    const drawn = await act(await spEp.view(id), { type: 'drawForDeal' });
    expect(drawn.table).toMatchObject({ status: 'playing', phase: 'deal' });
    expect(drawn.table.drawn).toHaveLength(4);
    const dealer = drawn.table.dealer!;
    as(['admin', 'riya', 'kabir', 'asha'][dealer]);
    await act(await spEp.view(id), { type: 'deal' });
    const hands = [];
    for (const who of ['admin', 'riya', 'kabir', 'asha']) {
      as(who);
      const v = await spEp.view(id);
      expect(v.table.phase).toBe('bidding');
      expect(v.me.hand).toHaveLength(13);
      expect(JSON.stringify(v.table)).not.toContain('"hand"');
      hands.push(v.me.hand!.map((c) => c.rank + c.suit).join());
    }
    expect(new Set(hands).size).toBe(4);

    // A stale rev is refused with the current view; a resent actionId changes nothing.
    as('admin');
    const cur = await spEp.view(id);
    const stale = await fail(spEp.act(id, { type: 'look', actionId: crypto.randomUUID(), rev: 1 }));
    expect([stale.status, stale.code]).toEqual([409, 'stale']);
    expect(viewOfError(stale)?.table.rev).toBe(cur.table.rev);
  });
});
