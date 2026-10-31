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

/** A tiny server: routes by method and path, records every call. */
function server(routes: Record<string, (body: unknown, path: string) => [number, unknown?]>) {
  const calls: string[] = [];
  const f = vi.fn(async (url: string, init: RequestInit) => {
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
      local: true,
      pendingCreate: true,
    });
    const g = myGame();
    const calls = server({
      ...base,
      'POST /players': (b) => [
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
      ],
      'PUT /games/g1': (b) => [200, { rev: (b as WireGame).rev, earned: [] }],
    });
    await syncNow({ full: true });
    expect(calls.filter((c) => !c.startsWith('GET'))).toEqual(['POST /players', 'PUT /games/g1']);
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

  it('a name the server already has asks; "same person" moves the games to that player', async () => {
    archive.put('players', serverPlayer('a', 'Ann'), serverPlayer('b', 'Ben'), {
      ...serverPlayer('c', 'Cat'),
      local: true,
      pendingCreate: true,
    });
    myGame();
    server({
      ...base,
      'POST /players': () => [
        409,
        { code: 'name_taken', existing: { id: 'cat2', displayName: 'Cat' } },
      ],
    });
    await syncNow({ full: true });
    expect(archive.get('inbox', 'nameMatch:c')).toBeDefined();
    archive.put('players', serverPlayer('cat2', 'Cat'));
    resolveNameMatch('c', { existingId: 'cat2' });
    expect(archive.get('games', 'g1')!.game.players[2].playerId).toBe('cat2');
    expect(archive.get('inbox', 'nameMatch:c')).toBeUndefined();
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

  it('the wire game uses the sync id and keeps the local id', () => {
    const g = myGame('w1');
    const w = toWire(g);
    expect(w.id).toBe('w1');
    expect(w).not.toHaveProperty('syncId');
    expect(fromWire(w)).toMatchObject({ syncId: 'w1', id: g.id });
  });
});
