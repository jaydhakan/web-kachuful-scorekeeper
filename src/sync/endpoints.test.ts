import { ApiError } from './api';
import { ep } from './endpoints';
import { isTombstone } from './types';

/**
 * The client against responses copied from the API as built: the paths and
 * queries it builds, the shapes it gets back, and every error code a call can answer.
 */
type Call = [string, RequestInit];
function serve(status: number, body?: unknown) {
  const f = vi.fn(
    async () =>
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  vi.stubGlobal('fetch', f);
  return () => f.mock.calls.map((c) => c as unknown as Call);
}
const fail = (p: Promise<unknown>) =>
  p.then(
    () => null,
    (e: ApiError) => e,
  );

afterEach(() => vi.unstubAllGlobals());

const ASHA = {
  id: '9638a212-3624-44d2-a83c-6011b47c8e13',
  displayName: 'Asha',
  email: null,
  photoUrl: null,
  firstName: null,
  lastName: null,
  emoji: '🐸',
  color: '#f472b6',
  createdBy: '1651ac66-21ad-4102-a540-e680d35b9c25',
  linkedUserId: null,
  mergedInto: null,
  createdAt: 1793439966418,
  updatedAt: 1793439966418,
  games: 18,
  lastPlayedAt: 1793439666514,
  createdByName: 'Riya',
};

describe('players: the same-player rule', () => {
  it('check sends name and email, and only a match names a player', async () => {
    const calls = serve(200, { status: 'match', player: ASHA });
    const r = await ep.checkPlayer('asha', 'ASHA@kachuful.test');
    expect(calls()[0][0]).toBe('/api/players/check?name=asha&email=ASHA%40kachuful.test');
    expect(r.status === 'match' && r.player.displayName).toBe('Asha');
    for (const status of ['name_taken', 'email_taken', 'new'] as const) {
      serve(200, { status, player: null });
      expect(await ep.checkPlayer('Brand New', 'brand.new@example.com')).toEqual({
        status,
        player: null,
      });
    }
  });

  it('check: a bad email is 422, too many is 429 with a wait', async () => {
    serve(422, { code: 'invalid', fields: { email: 'must look like x@y.z' } });
    expect(await fail(ep.checkPlayer('a', 'nope'))).toMatchObject({ status: 422, code: 'invalid' });
    serve(429, { code: 'rate_limited', retryAfter: 30 });
    expect((await fail(ep.checkPlayer('a', 'a@b.c')))?.retryAfter).toBe(30);
  });

  it('create answers 409 same_player with the player, or taken codes with no details', async () => {
    const calls = serve(409, { code: 'same_player', player: ASHA });
    const e = await fail(
      ep.createPlayer({
        id: '55555555-5555-4555-8555-555555555555',
        displayName: 'Asha',
        email: 'asha@kachuful.test',
        emoji: '🐯',
        color: '#60a5fa',
      }),
    );
    expect(calls()[0][1]).toMatchObject({ method: 'POST' });
    expect(e).toMatchObject({
      status: 409,
      code: 'same_player',
      body: { player: { id: ASHA.id } },
    });
    for (const [code, message] of [
      ['email_taken', 'That email belongs to another player.'],
      ['name_taken', 'That name belongs to another player.'],
    ]) {
      serve(409, { code, message });
      const x = await fail(ep.createPlayer({ ...ASHA, email: 'x@y.z' }));
      expect(x).toMatchObject({ code, message });
      expect(Object.keys(x!.body).sort()).toEqual(['code', 'message']);
    }
    serve(422, { code: 'invalid', fields: { email: 'must look like x@y.z' } });
    expect((await fail(ep.createPlayer({ ...ASHA, email: '' })))?.body.fields).toEqual({
      email: 'must look like x@y.z',
    });
    serve(409, { code: 'id_conflict', message: 'x' });
    expect((await fail(ep.createPlayer({ ...ASHA, email: 'x@y.z' })))?.code).toBe('id_conflict');
  });

  it('patch can change an email and answers email_taken, name_taken, 403, 404 and 422', async () => {
    const calls = serve(200, { ...ASHA, email: 'asha.new@kachuful.test' });
    await ep.patchPlayer(ASHA.id, { email: 'asha.new@kachuful.test' });
    expect(calls()[0][1]).toMatchObject({
      method: 'PATCH',
      body: '{"email":"asha.new@kachuful.test"}',
    });
    for (const [status, code] of [
      [409, 'email_taken'],
      [409, 'name_taken'],
      [403, 'forbidden'],
      [404, 'not_found'],
      [422, 'invalid'],
    ] as const) {
      serve(status, { code, message: '' });
      expect(await fail(ep.patchPlayer(ASHA.id, { email: 'x@y.z' }))).toMatchObject({
        status,
        code,
      });
    }
  });
});

describe('players: photos', () => {
  it('uploads the raw image with its own type and gets the versioned URL back', async () => {
    const calls = serve(200, { photoUrl: `/api/players/${ASHA.id}/photo?v=1` });
    const img = new Blob([new Uint8Array(10)], { type: 'image/webp' });
    expect(await ep.setPhoto(ASHA.id, img)).toEqual({
      photoUrl: `/api/players/${ASHA.id}/photo?v=1`,
    });
    const [url, init] = calls()[0];
    expect(url).toBe(`/api/players/${ASHA.id}/photo`);
    expect(init).toMatchObject({ method: 'PUT', body: img, credentials: 'include' });
    expect(init.headers).toMatchObject({ 'Content-Type': 'image/webp', 'X-Kachuful': '1' });
  });

  it('upload errors: 403, 404, 413 and 415', async () => {
    const img = new Blob(['hello'], { type: 'text/plain' });
    for (const [status, code] of [
      [403, 'forbidden'],
      [404, 'not_found'],
      [413, 'too_large'],
      [415, 'unsupported_media_type'],
    ] as const) {
      serve(status, { code, message: 'Send a WebP, JPEG or PNG image (at most 2 MB).' });
      expect(await fail(ep.setPhoto(ASHA.id, img))).toMatchObject({ status, code });
    }
  });

  it('delete is a 204', async () => {
    const calls = serve(204);
    await ep.deletePhoto(ASHA.id);
    expect(calls()[0]).toMatchObject([`/api/players/${ASHA.id}/photo`, { method: 'DELETE' }]);
  });
});

describe('auth and invites', () => {
  it('login returns the player too', async () => {
    serve(200, {
      user: { id: 'u', email: 'riya@kachuful.test', role: 'member', playerId: 'p', createdAt: 1 },
      player: { ...ASHA, id: 'p', displayName: 'Riya' },
    });
    expect((await ep.login('riya@kachuful.test', 'riya-demo')).player?.displayName).toBe('Riya');
  });

  it('accepting an invite never sends an email; errors carry no player details', async () => {
    const calls = serve(409, {
      code: 'name_taken',
      message: 'That name belongs to another player.',
    });
    const e = await fail(
      ep.acceptInvite('t', 'pw1', { id: 'n', displayName: 'Asha', emoji: '🐯', color: '#fff' }),
    );
    expect(JSON.parse(String(calls()[0][1].body)).player).not.toHaveProperty('email');
    expect(e?.body).not.toHaveProperty('existing');
    for (const [status, code] of [
      [410, 'gone'],
      [422, 'weak_password'],
      [409, 'email_taken'],
      [409, 'player_linked'],
      [409, 'id_conflict'],
      [422, 'unknown_player'],
      [422, 'invalid'],
      [429, 'rate_limited'],
    ] as const) {
      serve(status, { code, message: '' });
      expect(await fail(ep.acceptInvite('t', 'pw1', { id: 'p' }))).toMatchObject({ status, code });
    }
  });
});

describe('games', () => {
  it('uploads to the syncId and sends the game as it is', async () => {
    const calls = serve(200, { rev: 1, earned: [] });
    const g = { id: 'g-5c0ffee0', syncId: '5c0ffee0-0000-4000-8000-000000000001', rev: 1 };
    await ep.putGame(g as never);
    const [url, init] = calls()[0];
    expect(url).toBe('/api/games/5c0ffee0-0000-4000-8000-000000000001');
    expect(JSON.parse(String(init.body))).toEqual(g);
  });

  it('lists my games with mine=true and keeps tombstones apart', async () => {
    const calls = serve(200, {
      items: [{ id: 'gone-1', deleted: true, updatedAt: 1793000120000 }],
      nextCursor: null,
    });
    const page = await ep.games({ mine: true, updatedSince: 1793000000000 });
    expect(calls()[0][0]).toBe('/api/games?mine=true&updatedSince=1793000000000&limit=200');
    expect(isTombstone(page.items[0])).toBe(true);
  });

  it("admin: previews, clears a user's games and deletes the user", async () => {
    let calls = serve(200, { games: 3 });
    expect(await ep.clearUserGames('u1')).toEqual({ games: 3 });
    expect([calls()[0][0], calls()[0][1].method]).toEqual(['/api/admin/users/u1/games', 'DELETE']);
    calls = serve(204);
    await ep.deleteUser('u1');
    expect([calls()[0][0], calls()[0][1].method]).toEqual(['/api/admin/users/u1', 'DELETE']);
  });

  it('upload outcomes: stale with the server copy, gone, unknown players, invalid games', async () => {
    const g = { id: 'g', syncId: 's', rev: 1 } as never;
    serve(409, { code: 'stale', server: { id: 'g', syncId: 's', rev: 2 } });
    expect((await fail(ep.putGame(g)))?.body.server).toMatchObject({ rev: 2 });
    serve(410, { code: 'gone', message: '' });
    expect((await fail(ep.putGame(g)))?.status).toBe(410);
    serve(422, { code: 'unknown_player', playerIds: ['x'] });
    expect((await fail(ep.putGame(g)))?.body.playerIds).toEqual(['x']);
    serve(422, { code: 'invalid_game', reason: 'players', roundIndex: null });
    expect((await fail(ep.putGame(g)))?.body.reason).toBe('players');
  });
});

describe('admin', () => {
  it('lists invite-only rows with a null user and no link', async () => {
    serve(200, [
      {
        user: null,
        player: null,
        active: false,
        lastSeenAt: null,
        invite: { email: 'new.player@kachuful.test', expiresAt: 1794044766 },
      },
    ]);
    const [row] = await ep.adminUsers();
    expect(row.user).toBeNull();
    expect(row.invite).toEqual({ email: 'new.player@kachuful.test', expiresAt: 1794044766 });
  });

  it('merge refuses two players who sat at one table', async () => {
    serve(422, { code: 'invalid', fields: { intoId: 'they played together' } });
    expect(await fail(ep.merge('a', 'b'))).toMatchObject({ status: 422, code: 'invalid' });
    serve(409, { code: 'both_linked', message: '' });
    expect((await fail(ep.merge('a', 'b')))?.code).toBe('both_linked');
  });
});

describe('boards and ETags', () => {
  it('passes If-None-Match and resolves a 304 without a body', async () => {
    const f = vi.fn(async () => new Response(null, { status: 304, headers: { ETag: 'W/"7"' } }));
    vi.stubGlobal('fetch', f);
    const r = await ep.player('p', { etag: 'W/"7"' });
    expect(r).toMatchObject({ status: 304, data: null, etag: 'W/"7"' });
    expect((f.mock.calls[0] as unknown as Call)[1].headers).toMatchObject({
      'If-None-Match': 'W/"7"',
    });
  });

  it('the leaderboard sends minRounds, minGames and limit only when given', async () => {
    const calls = serve(200, { rows: [], minRounds: 50, generatedAt: 0 });
    await ep.leaderboard(1, 2, 'accuracy');
    await ep.leaderboard(1, 2, 'accuracy', undefined, { minRounds: 50 });
    await ep.leaderboard(0, 2, 'rounds', undefined, { minGames: 3, limit: 5 });
    expect(calls().map((c) => c[0])).toEqual([
      '/api/leaderboard?from=1&to=2&metric=accuracy',
      '/api/leaderboard?from=1&to=2&metric=accuracy&minRounds=50',
      '/api/leaderboard?from=0&to=2&metric=rounds&minGames=3&limit=5',
    ]);
  });

  it('awards carry a null game except for day_bang and day_ouch', async () => {
    serve(200, {
      date: '2026-10-31',
      final: false,
      awards: [{ code: 'day_star', player: ASHA, value: 3, gameId: null, roundIndex: null }],
    });
    const r = await ep.daily('2026-10-31');
    expect(r.data.awards[0]).toMatchObject({ gameId: null, roundIndex: null });
  });
});

describe('appearance, preferences and the active game', () => {
  it('builds the paths and bodies the contract names', async () => {
    let calls = serve(200, { items: [], nextCursor: null });
    await ep.activeGame();
    expect(calls()[0][0]).toBe('/api/games?status=active&mine=true&limit=1');
    calls = serve(200, { theme: null, setup: null, updatedAt: null });
    await ep.setPrefs({ theme: null });
    expect(calls()[0][1]).toMatchObject({ method: 'PATCH', body: '{"theme":null}' });
    expect(calls()[0][1].headers).toMatchObject({ 'X-Kachuful': '1' });
    calls = serve(200, {
      theme: 'yerba-sun',
      allowUserOverride: true,
      updatedAt: 1,
      updatedBy: 'Jay',
    });
    await ep.setAppearance({ theme: 'yerba-sun', allowUserOverride: true });
    expect(calls()[0]).toMatchObject(['/api/admin/settings/appearance', { method: 'PUT' }]);
  });

  it('errors keep the usual shape: 403 forbidden, 422 invalid with fields', async () => {
    serve(403, { code: 'forbidden', message: '' });
    expect(await fail(ep.setAppearance({ theme: 'x', allowUserOverride: true }))).toMatchObject({
      status: 403,
      code: 'forbidden',
    });
    serve(422, { code: 'invalid', fields: { 'setup.decks': 'must be 1 or 2' } });
    expect((await fail(ep.setPrefs({ setup: null })))?.body.fields).toEqual({
      'setup.decks': 'must be 1 or 2',
    });
  });
});

describe('wardrobe, bazaar, gifts and milestones (backend-requests §3–§6)', () => {
  const BAL = { earned: 1200, spent: 300, balance: 900 };
  const LOOK = { outfit: { id: 'jersey', v: 2, number: 7 }, frame: { id: 'neon_ring', v: 0 } };

  it('reads and writes the wardrobe, saved looks by slot', async () => {
    let calls = serve(200, {
      owned: [{ id: 'kurta', v: 0, source: 'level', at: null }],
      look: LOOK,
      saved: [null, { name: 'Shaadi', look: LOOK }, null],
      balance: BAL,
    });
    const w = (await ep.wardrobe()).data;
    expect(calls()[0][0]).toBe('/api/me/wardrobe');
    expect(w.saved).toHaveLength(3);
    expect(w.balance.balance).toBe(900);
    calls = serve(200, LOOK);
    expect(await ep.putLook(LOOK)).toEqual(LOOK);
    expect(calls()[0]).toMatchObject([
      '/api/me/wardrobe/look',
      { method: 'PUT', body: JSON.stringify(LOOK) },
    ]);
    calls = serve(200, { name: 'Shaadi', look: LOOK });
    await ep.putSavedLook(1, 'Shaadi', LOOK);
    expect(calls()[0]).toMatchObject([
      '/api/me/wardrobe/saved/1',
      { method: 'PUT', body: JSON.stringify({ name: 'Shaadi', look: LOOK }) },
    ]);
    calls = serve(204);
    await ep.deleteSavedLook(2);
    expect(calls()[0]).toMatchObject(['/api/me/wardrobe/saved/2', { method: 'DELETE' }]);
  });

  it('wardrobe errors: 409 no_player, 422 invalid_look with the slot', async () => {
    serve(409, { code: 'no_player' });
    expect(await fail(ep.wardrobe())).toMatchObject({ status: 409, code: 'no_player' });
    serve(422, { code: 'invalid_look', slot: 'headwear' });
    expect((await fail(ep.putLook({ headwear: { id: 'safa', v: 1 } })))?.body.slot).toBe(
      'headwear',
    );
  });

  it('the bazaar, and a purchase sent with the caller’s id', async () => {
    let calls = serve(200, {
      week: '2026-W48',
      refreshesAt: 1795060800000,
      weekly: [{ id: 'shawl', price: 750, owned: [] }],
      always: [{ id: 'kurta', price: 100, owned: [0] }],
      balance: BAL,
    });
    expect((await ep.bazaar()).data.week).toBe('2026-W48');
    expect(calls()[0][0]).toBe('/api/bazaar');
    calls = serve(200, {
      item: { id: 'shawl', v: 1, source: 'bought', at: 1 },
      balance: { ...BAL, spent: 1100, balance: 100 },
    });
    const out = await ep.buy('shawl', 1, 'p-1');
    expect(out.item.source).toBe('bought');
    expect(calls()[0]).toMatchObject([
      '/api/bazaar/purchases',
      { method: 'POST', body: '{"itemId":"shawl","v":1,"purchaseId":"p-1"}' },
    ]);
  });

  it('purchase errors carry their codes and details', async () => {
    serve(422, { code: 'not_enough_sikke', balance: 40, price: 300 });
    expect(await fail(ep.buy('shades', 0, 'p'))).toMatchObject({
      status: 422,
      code: 'not_enough_sikke',
      body: { balance: 40, price: 300 },
    });
    for (const [status, code] of [
      [422, 'not_in_stock'],
      [409, 'already_owned'],
      [422, 'not_for_sale'],
    ] as const) {
      serve(status, { code });
      expect(await fail(ep.buy('x', 0, 'p'))).toMatchObject({ status, code });
    }
  });

  it('gifts: send, pending for a table, open, and my list', async () => {
    const gift = {
      id: 'g1',
      item: { id: 'sherwani', v: 0 },
      from: ASHA,
      to: { ...ASHA, id: 'p2', displayName: 'Dev' },
      sentAt: 1,
      openedAt: null,
    };
    let calls = serve(200, gift);
    await ep.sendGift('sherwani', 0, 'p2', 'g1');
    expect(calls()[0]).toMatchObject([
      '/api/gifts',
      { method: 'POST', body: '{"itemId":"sherwani","v":0,"toPlayerId":"p2","giftId":"g1"}' },
    ]);
    calls = serve(200, { items: [gift] });
    expect((await ep.pendingGifts(['p1', 'p2'])).items).toHaveLength(1);
    expect(calls()[0][0]).toBe('/api/gifts/pending?players=p1%2Cp2');
    calls = serve(200, { ...gift, openedAt: 2 });
    expect((await ep.openGift('g1')).openedAt).toBe(2);
    expect(calls()[0]).toMatchObject(['/api/gifts/g1/open', { method: 'POST' }]);
    calls = serve(200, { items: [gift], nextCursor: 'c2' });
    expect((await ep.myGifts('c1')).nextCursor).toBe('c2');
    expect(calls()[0][0]).toBe('/api/me/gifts?cursor=c1&limit=50');
    for (const [status, code] of [
      [422, 'not_in_circle'],
      [422, 'self_gift'],
      [409, 'already_owned'],
    ] as const) {
      serve(status, { code });
      expect(await fail(ep.sendGift('x', 0, 'p', 'g'))).toMatchObject({ status, code });
    }
  });

  it('milestones page newest first', async () => {
    const calls = serve(200, {
      items: [
        {
          key: 'group:all:100',
          kind: 'group',
          game: null,
          gameId: 'g9',
          n: 100,
          players: [ASHA],
          at: 5,
        },
      ],
      nextCursor: null,
    });
    const p = await ep.milestones(null);
    expect(calls()[0][0]).toBe('/api/milestones?limit=50');
    expect(p.items[0].n).toBe(100);
  });
});
