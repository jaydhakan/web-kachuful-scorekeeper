import { kitGame, rows } from '@/domain/__fixtures__/kit';
import { doneRounds, type Game } from '@/domain';
import { archive, archiveGame } from '@/state/archive';
import type { Session } from '@/state/persistence';
import {
  bindEngine,
  fromWire,
  importable,
  importGames,
  resolveConflict,
  resolveNameMatch,
  syncNow,
  toWire,
} from './engine';
import { syncStatus } from './status';
import type { WireGame } from './types';

const ME = 'u1';
const session: Session = {
  user: { id: ME, email: 'a@b.c', role: 'member', playerId: null },
  player: null,
};

/** A tiny server: routes by method and path, records every call (and every URL, queries included). */
const urls: string[] = [];
function server(routes: Record<string, (body: unknown, path: string) => [number, unknown?]>) {
  const calls: string[] = [];
  const f = vi.fn(async (url: string, init: RequestInit) => {
    urls.push(url);
    const path = url.replace('/api', '').split('?')[0];
    const key = `${init.method} ${path}`;
    calls.push(key);
    const h = Object.entries(routes).find(([k]) => new RegExp('^' + k + '$').test(key))?.[1];
    const [status, body] = h
      ? h(init.body ? JSON.parse(String(init.body)) : undefined, path)
      : [404, { code: 'not_found' }];
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
  });
  vi.stubGlobal('fetch', f);
  return calls;
}

const base = {
  'GET /bootstrap': () =>
    [
      200,
      {
        user: session.user,
        player: null,
        players: [],
        myGames: [],
        myAchievements: [],
        dataVersion: 1,
      },
    ] as [number, unknown],
  'GET /games': () => [200, { items: [], nextCursor: null }] as [number, unknown],
};

let current: Game;
function bind(game: Game) {
  current = game;
  bindEngine({
    session: () => session,
    game: () => current,
    setSession: () => {},
    syncGame: (g) => (current = g),
    open: () => {},
  });
}

const serverPlayer = (id: string, name: string) => ({
  id,
  displayName: name,
  nameKey: name.toLowerCase(),
  emoji: '🙂',
  color: 'c',
  createdAt: 0,
  updatedAt: 0,
  local: false,
});

function myGame(id = 'g1', ids = ['a', 'b', 'c']) {
  const g = kitGame({
    id,
    players: ids,
    names: ['Ann', 'Ben', 'Cat'],
    start: Date.now() - 3600e3,
    rounds: rows(3, 3, [0]),
  });
  archiveGame(g, { account: ME });
  return g;
}

beforeEach(async () => {
  await archive.ready;
  bind(myGame('cur', ['a', 'b', 'c']));
  archive.del('games', 'cur');
});
afterEach(() => {
  vi.unstubAllGlobals();
  bindEngine(null);
});

describe('sync engine', () => {
  it('creates new players first, then uploads the game, and marks it synced', async () => {
    archive.put('players', serverPlayer('a', 'Ann'), serverPlayer('b', 'Ben'), {
      ...serverPlayer('c', 'Cat'),
      email: 'cat@example.com',
      local: true,
      pendingCreate: true,
    });
    const g = myGame();
    let sent: unknown;
    const calls = server({
      ...base,
      'POST /players': (b) => {
        sent = b;
        return [
          201,
          {
            ...(b as object),
            createdBy: ME,
            linkedUserId: null,
            mergedInto: null,
            createdAt: 1,
            updatedAt: 1,
            firstName: null,
            lastName: null,
          },
        ];
      },
      'PUT /games/g1': (b) => [200, { rev: (b as WireGame).rev, earned: [] }],
    });
    await syncNow({ full: true });
    expect(calls.filter((c) => !c.startsWith('GET'))).toEqual(['POST /players', 'PUT /games/g1']);
    expect(sent).toMatchObject({ email: 'cat@example.com' });
    expect(archive.get('games', 'g1')!.syncedRev).toBe(g.rev);
    expect(archive.get('players', 'c')!.local).toBe(false);
    expect(syncStatus()).toMatchObject({ phase: 'idle', waiting: 0 });
  });

  it('a game waits while one of its players is not on the server', async () => {
    archive.put('players', serverPlayer('a', 'Ann'), serverPlayer('b', 'Ben'), {
      ...serverPlayer('c', 'Cat'),
      local: true,
    });
    myGame();
    const calls = server(base);
    await syncNow({ full: true });
    expect(calls).not.toContain('PUT /games/g1');
    expect(syncStatus().waiting).toBe(1);
  });

  it('a stale upload keeps the copy with more rounds and saves the other as a conflict copy', async () => {
    archive.put(
      'players',
      serverPlayer('a', 'Ann'),
      serverPlayer('b', 'Ben'),
      serverPlayer('c', 'Cat'),
    );
    const mine = myGame();
    const theirs = kitGame({
      id: 'g1',
      players: ['a', 'b', 'c'],
      names: ['Ann', 'Ben', 'Cat'],
      start: mine.createdAt,
      rounds: rows(3, 5, [1]),
    });
    server({
      ...base,
      'PUT /games/g1': () => [409, { code: 'stale', server: toWire({ ...theirs, rev: 7 }) }],
    });
    await syncNow({ full: true });
    const main = archive.get('games', 'g1')!;
    expect(doneRounds(main.game)).toHaveLength(5);
    expect(main.syncedRev).toBe(7);
    const copy = archive.games().find((r) => r.conflictOf === 'g1')!;
    expect(doneRounds(copy.game)).toHaveLength(3);
    expect(archive.get('inbox', 'conflict:g1')).toBeDefined();
    // Keeping the copy makes it the game again (to be uploaded) and removes the copy.
    resolveConflict(copy.syncId, true);
    expect(doneRounds(archive.get('games', 'g1')!.game)).toHaveLength(3);
    expect(archive.get('games', 'g1')!.game.rev).toBe(main.game.rev + 1);
    expect(archive.get('games', copy.syncId)).toBeUndefined();
  });

  it('a game the server rejects stays here, is not retried, and the inbox says why', async () => {
    archive.put(
      'players',
      serverPlayer('a', 'Ann'),
      serverPlayer('b', 'Ben'),
      serverPlayer('c', 'Cat'),
    );
    myGame();
    const calls = server({
      ...base,
      'PUT /games/g1': () => [422, { code: 'invalid_game', reason: 'bids', roundIndex: 1 }],
    });
    await syncNow({ full: true });
    await syncNow({ full: false });
    expect(calls.filter((c) => c === 'PUT /games/g1')).toHaveLength(1);
    expect(archive.get('inbox', 'rejected:g1')!.data).toMatchObject({ reason: 'bids' });
    expect(syncStatus().phase).toBe('attention');
  });

  it('rewrites merged player ids in the archive and in the current game', async () => {
    archive.put(
      'players',
      serverPlayer('a', 'Ann'),
      serverPlayer('b', 'Ben'),
      serverPlayer('c', 'Cat'),
      serverPlayer('z', 'Zed'),
    );
    const g = myGame();
    bind(g);
    server({
      ...base,
      'PUT /games/g1': (b) => [200, { rev: (b as WireGame).rev, earned: [], remap: { c: 'z' } }],
    });
    await syncNow({ full: true });
    expect(archive.get('games', 'g1')!.game.players.map((p) => p.playerId)).toEqual([
      'a',
      'b',
      'z',
    ]);
    expect(current.players[2].playerId).toBe('z');
  });

  it('a name someone else has (no details given) asks for another name', async () => {
    archive.put('players', serverPlayer('a', 'Ann'), serverPlayer('b', 'Ben'), {
      ...serverPlayer('c', 'Cat'),
      email: 'cat@example.com',
      local: true,
      pendingCreate: true,
    });
    myGame();
    server({
      ...base,
      'POST /players': () => [
        409,
        { code: 'name_taken', message: 'That name belongs to another player.' },
      ],
    });
    await syncNow({ full: true });
    expect(archive.get('inbox', 'nameMatch:c')!.data).toEqual({
      name: 'Cat',
      playerId: 'c',
      field: 'name',
    });
    resolveNameMatch('c', { rename: 'Cat S' });
    expect(archive.get('players', 'c')).toMatchObject({
      displayName: 'Cat S',
      pendingCreate: true,
    });
    expect(archive.get('inbox', 'nameMatch:c')).toBeUndefined();
  });

  it('409 same_player: name and email are an existing player, whose id the games then use', async () => {
    archive.put('players', serverPlayer('a', 'Ann'), serverPlayer('b', 'Ben'), {
      ...serverPlayer('c', 'Cat'),
      email: 'cat@example.com',
      local: true,
      pendingCreate: true,
    });
    const g = myGame();
    bind(g);
    const calls = server({
      ...base,
      'POST /players': () => [
        409,
        {
          code: 'same_player',
          player: { ...serverPlayer('cat9', 'Cat'), email: null, photoUrl: null, games: 4 },
        },
      ],
      'PUT /games/g1': (b) => [200, { rev: (b as WireGame).rev, earned: [] }],
    });
    await syncNow({ full: true });
    expect(archive.get('players', 'c')!.mergedInto).toBe('cat9');
    expect(archive.get('players', 'cat9')!.local).toBe(false);
    expect(current.players[2].playerId).toBe('cat9');
    expect(calls).toContain('PUT /games/g1');
    expect(archive.get('inbox', 'nameMatch:c')).toBeUndefined();
  });

  it('410 gone: a game deleted on the server leaves this device', async () => {
    archive.put(
      'players',
      serverPlayer('a', 'Ann'),
      serverPlayer('b', 'Ben'),
      serverPlayer('c', 'Cat'),
    );
    myGame();
    server({ ...base, 'PUT /games/g1': () => [410, { code: 'gone', message: 'deleted' }] });
    await syncNow({ full: true });
    expect(archive.get('games', 'g1')).toBeUndefined();
  });

  it('410 on the game being played: it stays on this phone, no longer synced, and the inbox says so', async () => {
    archive.put(
      'players',
      serverPlayer('a', 'Ann'),
      serverPlayer('b', 'Ben'),
      serverPlayer('c', 'Cat'),
    );
    const g = myGame();
    bind(g);
    server({ ...base, 'PUT /games/g1': () => [410, { code: 'gone', message: 'deleted' }] });
    await syncNow({ full: true });
    expect(archive.get('games', 'g1')).toMatchObject({ account: undefined });
    expect(archive.get('inbox', 'rejected:g1')!.data).toEqual({ reason: 'deleted' });
  });

  it('pulls from the newest server change minus 5 s, and tombstones remove games', async () => {
    archive.put('cache', { key: 'games:since', value: 1_000_000, fetchedAt: 0 });
    archive.put('games', {
      syncId: 'old',
      game: myGame('old'),
      updatedAt: 0,
      endedAt: 0,
      origin: 'remote',
      account: ME,
      syncedRev: 1,
    });
    urls.length = 0;
    server({
      ...base,
      'GET /games': () => [
        200,
        { items: [{ id: 'old', deleted: true, updatedAt: 1_200_000 }], nextCursor: null },
      ],
    });
    await syncNow({ full: true });
    expect(urls.find((u) => u.startsWith('/api/games?'))).toContain('updatedSince=995000');
    expect(archive.get('games', 'old')).toBeUndefined();
    expect(archive.get('cache', 'games:since')!.value).toBe(1_200_000);
  });

  it('a 429 waits retryAfter seconds before asking again', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
    myGame();
    let n = 0;
    const calls = server({
      ...base,
      'GET /bootstrap': () =>
        n++ ? base['GET /bootstrap']() : [429, { code: 'rate_limited', retryAfter: 30 }],
    });
    await syncNow({ full: true });
    await syncNow({ full: true });
    expect(calls.filter((c) => c === 'GET /bootstrap')).toHaveLength(1);
    vi.setSystemTime(Date.now() + 31e3);
    await syncNow({ full: true });
    expect(calls.filter((c) => c === 'GET /bootstrap')).toHaveLength(2);
    vi.useRealTimers();
  });

  it('a new player without an email waits, and the inbox asks for it', async () => {
    archive.put('players', serverPlayer('a', 'Ann'), serverPlayer('b', 'Ben'), {
      ...serverPlayer('c', 'Cat'),
      local: true,
      pendingCreate: true,
    });
    myGame();
    const calls = server(base);
    await syncNow({ full: true });
    expect(calls).not.toContain('POST /players');
    expect(archive.get('inbox', 'nameMatch:c')!.data).toMatchObject({
      field: 'email',
      missing: true,
    });
    resolveNameMatch('c', { email: ' Cat@Example.com ' });
    expect(archive.get('players', 'c')).toMatchObject({
      email: 'cat@example.com',
      pendingCreate: true,
    });
  });

  it('a 401 stops the run and needs a fresh sign-in', async () => {
    myGame();
    server({ 'GET /bootstrap': () => [401, { code: 'unauthenticated' }] });
    await syncNow({ full: true });
    expect(syncStatus().phase).toBe('attention');
  });

  it('offers games scored before signing in, and imports them with matched players', () => {
    const g = kitGame({
      id: 'old',
      players: ['l1', 'l2', 'l3'],
      names: ['Ann', 'Ben', 'Cat'],
      start: 0,
      rounds: rows(3, 2, [0]),
    });
    archiveGame(g);
    archive.put('players', { ...serverPlayer('l1', 'Ann'), local: true }, serverPlayer('a', 'Ann'));
    expect(importable().map((r) => r.syncId)).toContain('old');
    importGames(['old'], { l1: 'a', l2: null, l3: null });
    const r = archive.get('games', 'old')!;
    expect(r.account).toBe(ME);
    expect(r.game.players[0].playerId).toBe('a');
    expect(importable().map((x) => x.syncId)).not.toContain('old');
  });

  it("remembers who this account's player has sat with, for setup's suggestions", async () => {
    bindEngine({
      session: () => ({
        ...session,
        player: { id: 'me', displayName: 'Me', emoji: '🙂', color: 'c' },
      }),
      game: () => current,
      setSession: () => {},
      syncGame: () => {},
      open: () => {},
    });
    urls.length = 0;
    server({
      ...base,
      'GET /players/me/games': () => [
        200,
        {
          items: [{ id: 'x', players: [{ playerId: 'me' }, { playerId: 'zed' }] }],
          nextCursor: null,
        },
      ],
    });
    await syncNow({ full: true });
    expect(archive.get('cache', 'met')!.value).toEqual(['me', 'zed']);
    // The next pull asks only about recent days.
    await syncNow({ full: true });
    expect(urls.filter((u) => u.startsWith('/api/players/me/games')).pop()).toContain('from=');
  });

  it('the wire game is the game as it is, with registry ids; a stored one keeps its key', () => {
    const g = myGame('w1');
    const w = toWire(g);
    expect(w).toMatchObject({ id: g.id, syncId: g.syncId, rev: g.rev });
    expect(w.players.every((p) => p.playerId)).toBe(true);
    expect(fromWire(w)).toEqual(w);
    expect(fromWire({ ...w, syncId: undefined }, 'server-key').syncId).toBe('server-key');
  });
});
