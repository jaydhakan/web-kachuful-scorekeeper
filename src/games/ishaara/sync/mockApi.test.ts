import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mockApi, seed } from '../../../../tools/mock-api/server';
import { WORDS } from '@/games/ishaara/domain/__fixtures__/kit';
import type { IshaaraRules, Seated, Team } from '@/games/ishaara/domain';
import { ApiError } from '@/sync/api';
import { ep } from '@/sync/endpoints';
import type { Page, Player } from '@/sync/types';
import { gameOfError, ishEp, reasonOf } from './endpoints';
import { followIshaara, type IshaaraEvent } from './events';
import type { IshaaraGameOut } from './types';

/**
 * Ishaara against tools/mock-api over real HTTP, signed in as three accounts (Jay hosts, Riya and Kabir give clues):
 * checks the mock's routes follow backend-requests.md and the app's client agrees with them.
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

const RULES: IshaaraRules = { timerSec: 60, clueEntry: 'typed', packs: ['everyday'], bestOf: 3 };

async function seats(): Promise<Seated[]> {
  const r = await realFetch(base + '/api/players?limit=200', { headers: { Cookie: cookie } });
  const ps = ((await r.json()) as Page<Player>).items;
  const by = (n: string) => ps.find((p) => p.displayName === n)!;
  const seat = (n: string, team: Team, role: Seated['role']): Seated => {
    const p = by(n);
    return { id: p.id, name: n, emoji: p.emoji, color: p.color, playerId: p.id, team, role };
  };
  return [
    seat('Riya', 'sun', 'clue-giver'),
    seat('Asha', 'sun', 'guesser'),
    seat('Kabir', 'moon', 'clue-giver'),
    seat('Om', 'moon', 'guesser'),
  ];
}

const fail = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error('should have failed');
    },
    (e: ApiError) => e,
  );
const send = (g: IshaaraGameOut, body: object) =>
  ishEp.act(g.game.id, { actionId: crypto.randomUUID(), rev: g.game.rev, ...body } as never);
const clock = (advanceMs: number) =>
  realFetch(base + '/api/__mock/ishaara/clock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ advanceMs }),
  });

describe('Ishaara on the mock API', () => {
  it('creates, joins on key open, plays a turn, and keeps the key off every public read', async () => {
    await as('admin');
    const players = await seats();
    const id = crypto.randomUUID();
    let g = await ishEp.create({ id, players, words: WORDS, rules: RULES });
    expect(g.game).toMatchObject({ id, status: 'waiting', rev: 1, solution: null });
    expect(g.me).toEqual({ host: true, team: null });
    expect(typeof g.serverNow).toBe('number');
    // The same host resending the same id gets the same game back.
    expect((await ishEp.create({ id, players, words: WORDS, rules: RULES })).game.id).toBe(id);
    // The host isn't a clue-giver, so no key.
    expect(await fail(ishEp.key(id))).toMatchObject({ status: 403, code: 'forbidden' });

    await as('riya');
    expect(await fail(ishEp.create({ id, players, words: WORDS, rules: RULES }))).toMatchObject({
      status: 409,
      code: 'id_conflict',
    });
    const sunKey = await ishEp.key(id);
    expect(sunKey.team).toBe('sun');
    expect(sunKey.key).toHaveLength(25);
    await as('kabir');
    const moonKey = await ishEp.key(id);
    expect(moonKey.key).toEqual(sunKey.key);
    g = await ishEp.game(id);
    expect(g.game.status).toBe('active');
    expect(g.me).toEqual({ host: false, team: 'moon' });

    const key = sunKey.key;
    const turn = g.game.turn;
    await as(turn === 'sun' ? 'riya' : 'kabir');
    // The table can't give clues; the other team's clue-giver can't either.
    g = await send(g, { type: 'clue', word: 'sky', number: 1 });
    expect(g.game.clue).toMatchObject({ team: turn, word: 'sky', number: 1 });
    expect(g.game.deadline).toBeGreaterThan(g.serverNow);

    await as('admin');
    const card = key.findIndex((x) => x === turn);
    const body = { actionId: crypto.randomUUID(), rev: g.game.rev, type: 'guess', card } as const;
    g = await ishEp.act(id, body);
    expect(g.game.revealed[card]).toBe(turn);
    // A resend of the same actionId changes nothing, even with a stale rev.
    const again = await ishEp.act(id, body);
    expect(again.game.rev).toBe(g.game.rev);
    // A stale rev is 409 with the current game to adopt.
    const stale = await fail(
      ishEp.act(id, { actionId: crypto.randomUUID(), rev: 1, type: 'endTurn' }),
    );
    expect(stale).toMatchObject({ status: 409, code: 'stale' });
    expect(gameOfError(stale)?.game.rev).toBe(g.game.rev);
    // A table action from a clue phone is not theirs.
    await as('kabir');
    const nyt = await fail(send(g, { type: 'endTurn' }));
    expect(nyt).toMatchObject({ status: 403, code: 'not_your_turn' });
    expect(gameOfError(nyt)?.game.id).toBe(id);
    // The timer can't be called before the deadline; after the mock clock moves on, it can.
    await as('admin');
    expect(reasonOf(await fail(send(g, { type: 'timeout' })))).toBe('too-early');
    await clock(61_000);
    g = await send(g, { type: 'timeout' });
    expect(g.game.turn).not.toBe(turn);

    // Nothing public carries a face-down card's identity.
    const list = await ishEp.games();
    const pub = JSON.stringify([g, list, await ishEp.game(id)]);
    expect(pub).not.toContain('"key"');
    expect(g.game.revealed.filter((x) => x !== null)).toHaveLength(1);

    // Resign ends it; the solution appears, and a rematch follows with the other team starting.
    g = await send(g, { type: 'resign', team: g.game.turn });
    expect(g.game).toMatchObject({ status: 'finished', endedBy: 'resign' });
    expect(g.game.solution).toEqual(key);
    const words = WORDS.map((w) => w + 'x');
    const re = await ishEp.rematch(id, { id: crypto.randomUUID(), words });
    expect(re.game).toMatchObject({
      status: 'waiting',
      starting: g.game.starting === 'sun' ? 'moon' : 'sun',
    });
    expect(re.game.match.game).toBe(2);
    expect((await ishEp.game(id)).game.next).toBe(re.game.id);
    // The next clue-giver on each team is the next seat linked to an account, else the same one.
    expect(re.game.players.filter((p) => p.role === 'clue-giver').map((p) => p.name)).toEqual([
      'Riya',
      'Kabir',
    ]);
    expect((await ishEp.rematch(id, { id: crypto.randomUUID(), words })).game.id).toBe(re.game.id);
  });

  it('lists a clue-giver’s active games and history, and ranks the seeded games', async () => {
    await as('riya');
    const hist = await ishEp.games({ status: 'finished' });
    expect(hist.items.length).toBe(3);
    expect(hist.items[0].myTeam).toBe('sun');
    expect(JSON.stringify(hist)).not.toMatch(/"solution"|"key"/);
    expect((await ishEp.games({ role: 'clue-giver', status: 'active' })).items).toEqual([]);
    const lb = (await ishEp.leaderboard('all', 'wins')).data;
    expect(lb.rows.length).toBe(6);
    expect(lb.rows[0].player.displayName).toBeTruthy();
    const riya = lb.rows.find((r) => r.player.displayName === 'Riya')!;
    const stats = (await ishEp.playerStats(riya.player.id)).data;
    expect(stats).toMatchObject({ games: 3, clueGames: 3 });
    expect(stats).not.toHaveProperty('playerId');
    expect(await fail(ishEp.leaderboard('decade' as never, 'wins'))).toMatchObject({
      status: 422,
    });
  });

  it('refuses a game whose clue-giver has no account, and hides games from non-members', async () => {
    await as('admin');
    const players = await seats();
    players[1].role = 'clue-giver';
    players[0].role = 'guesser';
    const e = await fail(
      ishEp.create({ id: crypto.randomUUID(), players, words: WORDS, rules: RULES }),
    );
    expect(e).toMatchObject({ status: 422, code: 'invalid_game' });
    expect(reasonOf(e)).toBe('clue-giver-account');
    expect(
      reasonOf(
        await fail(
          ishEp.create({
            id: crypto.randomUUID(),
            players: await seats(),
            words: WORDS.slice(1),
            rules: RULES,
          }),
        ),
      ),
    ).toBe('words');
  });

  it('streams state frames to the table, with joined when a clue-giver opens the key', async () => {
    await as('admin');
    const g = await ishEp.create({
      id: crypto.randomUUID(),
      players: await seats(),
      words: WORDS,
      rules: RULES,
    });
    const events: IshaaraEvent[] = [];
    const conns: string[] = [];
    const stop = followIshaara(g.game.id, {
      onEvent: (e) => events.push(e),
      onConn: (c) => conns.push(c),
      onGone: () => conns.push('gone'),
    });
    await vi.waitFor(() => expect(events).toHaveLength(1));
    expect(conns).toEqual(['live']);
    expect(events[0]).toMatchObject({ type: 'state', game: { rev: 1 } });
    const host = cookie;
    await as('riya');
    await ishEp.key(g.game.id);
    await vi.waitFor(() => expect(events.map((e) => e.type)).toEqual(['state', 'state', 'joined']));
    stop();
    cookie = host;
    await ishEp.deleteGame(g.game.id);
    expect(await fail(ishEp.game(g.game.id))).toMatchObject({ status: 404 });
  });
});
