import { ApiError } from '@/sync/api';
import { started } from '@/games/ishaara/domain/__fixtures__/kit';
import { eventsUrl, gameOfError, ishEp, reasonOf } from './endpoints';
import type { IshaaraGameOut } from './types';

/** The client's paths, methods, headers and error handling for each Ishaara route (backend-requests.md §3). */
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

const OUT: IshaaraGameOut = {
  game: started().state,
  me: { host: true, team: null },
  serverNow: 1,
};
const ID = OUT.game.id;

describe('Ishaara endpoints', () => {
  it('reads use GET without the CSRF header; writes POST JSON with it', async () => {
    let calls = serve(200, OUT);
    await ishEp.game(ID);
    expect(calls()[0][0]).toBe(`/api/ishaara/games/${ID}`);
    expect((calls()[0][1].headers as Record<string, string>)['X-Kachuful']).toBeUndefined();

    calls = serve(201, OUT);
    await ishEp.create({
      id: ID,
      players: OUT.game.players,
      words: OUT.game.words,
      rules: OUT.game.rules,
    });
    expect(calls()[0][0]).toBe('/api/ishaara/games');
    expect(calls()[0][1]).toMatchObject({ method: 'POST', credentials: 'include' });
    expect((calls()[0][1].headers as Record<string, string>)['X-Kachuful']).toBe('1');

    calls = serve(200, OUT);
    await ishEp.act(ID, { actionId: 'a', rev: 3, type: 'guess', card: 4 });
    expect(calls()[0][0]).toBe(`/api/ishaara/games/${ID}/actions`);
    expect(JSON.parse(calls()[0][1].body as string)).toEqual({
      actionId: 'a',
      rev: 3,
      type: 'guess',
      card: 4,
    });

    calls = serve(201, OUT);
    await ishEp.rematch(ID, { id: 'n', words: [] });
    expect(calls()[0][0]).toBe(`/api/ishaara/games/${ID}/rematch`);

    calls = serve(204);
    await ishEp.deleteGame(ID);
    expect(calls()[0][1].method).toBe('DELETE');
  });

  it('builds list, key and board queries', async () => {
    let calls = serve(200, { items: [], nextCursor: null });
    await ishEp.games({ role: 'clue-giver', status: 'active' });
    expect(calls()[0][0]).toBe('/api/ishaara/games?role=clue-giver&status=active');
    await ishEp.games({ status: 'finished', cursor: '50', limit: 20 });
    expect(calls()[1][0]).toBe('/api/ishaara/games?status=finished&cursor=50&limit=20');
    calls = serve(200, { key: [], team: 'sun' });
    await ishEp.key(ID);
    expect(calls()[0][0]).toBe(`/api/ishaara/games/${ID}/key`);
    calls = serve(200, { rows: [] });
    await ishEp.leaderboard('week', 'rate');
    expect(calls()[0][0]).toBe('/api/ishaara/leaderboard?period=week&sort=rate');
    await ishEp.playerStats('p1');
    await ishEp.vs('p1', 'p2');
    expect(
      calls()
        .slice(1)
        .map((c) => c[0]),
    ).toEqual(['/api/ishaara/players/p1/stats', '/api/ishaara/players/p1/vs/p2']);
    expect(eventsUrl(ID)).toBe(`/api/ishaara/games/${ID}/events`);
  });

  it('action errors carry the current game and the domain reason', async () => {
    serve(409, { code: 'stale', game: OUT });
    const stale = await fail(ishEp.act(ID, { actionId: 'a', rev: 1, type: 'endTurn' }));
    expect(stale).toMatchObject({ status: 409, code: 'stale' });
    expect(gameOfError(stale)).toEqual(OUT);

    serve(422, { code: 'invalid_action', reason: 'revealed', game: OUT });
    const bad = await fail(ishEp.act(ID, { actionId: 'a', rev: 1, type: 'guess', card: 0 }));
    expect(reasonOf(bad)).toBe('revealed');
    expect(gameOfError(bad)?.game.rev).toBe(OUT.game.rev);

    serve(403, { code: 'forbidden' });
    const no = await fail(ishEp.key(ID));
    expect(no).toMatchObject({ status: 403, code: 'forbidden' });
    expect(gameOfError(no)).toBeNull();
    expect(reasonOf(new Error('x'))).toBeNull();

    vi.stubGlobal('fetch', async () => {
      throw new TypeError('network');
    });
    expect((await fail(ishEp.game(ID)))?.offline).toBe(true);
  });
});
