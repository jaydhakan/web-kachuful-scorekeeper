import { kitGame, type KitEntry } from '@/games/spades/domain/__fixtures__/kit';
import type { SpGame } from '@/games/spades/domain/types';
import { archive } from '@/state/archive';
import type { Session } from '@/state/persistence';
import { resetSessionForTests, setSession } from '@/sync/session';
import { syncStatus } from '@/sync/status';
import { archiveSpGame, forgetEmptySp } from '../state/archive';
import {
  bindSpEngine,
  fromWire,
  hasSpWork,
  pendingSpGames,
  queueSpDelete,
  resetSpEngineForTests,
  resolveSpConflict,
  syncSpNow,
  toWire,
} from './engine';

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

const empty = () => [200, { items: [], nextCursor: null }] as [number, unknown];
const base = {
  'GET /players': empty,
  'GET /spades/games': empty,
};

let current: SpGame | null;
function bind(game: SpGame | null, s: Session = session) {
  current = game;
  bindSpEngine({
    session: () => s,
    game: () => current,
    syncGame: (g) => (current = g),
  });
}

const serverPlayer = (id: string) => ({
  id,
  displayName: id.toUpperCase(),
  nameKey: id,
  emoji: '🙂',
  color: 'c',
  createdAt: 0,
  updatedAt: 0,
  local: false,
});
const known = () => archive.put('players', ...['a', 'b', 'c', 'd'].map(serverPlayer));

const hand: KitEntry = { bids: [3, 4, 3, 3], teamA: 7 };
const done = (g: SpGame) => g.hands.filter((h) => h.phase === 'done');

/** A table-mode game seated by registry ids, starting an hour ago. */
function spGame(
  id: string,
  hands: number,
  ids = ['a', 'b', 'c', 'd'],
  start = Date.now() - 3600e3,
) {
  const g = kitGame(
    Array.from({ length: hands }, () => hand),
    { id, syncId: id, createdAt: start },
  );
  return {
    ...g,
    updatedAt: start + hands * 600e3,
    hands: g.hands.map((h, i) => ({ ...h, doneAt: start + (i + 1) * 600e3 })),
    players: g.players.map((p, i) => ({ ...p, playerId: ids[i] })),
  };
}
function myGame(id = 'g1', hands = 1, ids?: string[]) {
  const g = spGame(id, hands, ids);
  archiveSpGame(g, { account: ME });
  return g;
}

beforeEach(async () => {
  await archive.ready;
  resetSpEngineForTests();
  bind(null);
});
afterEach(() => {
  vi.unstubAllGlobals();
  bindSpEngine(null);
});

describe('Spades table-mode sync engine', () => {
  it('creates new players first, then uploads the game to its own route, and marks it synced', async () => {
    archive.put('players', serverPlayer('a'), serverPlayer('b'), serverPlayer('c'), {
      ...serverPlayer('d'),
      email: 'd@example.com',
      local: true,
      pendingCreate: true,
    });
    const g = myGame();
    let sent: SpGame | undefined;
    const calls = server({
      ...base,
      'POST /players': (b) => [201, { ...(b as object), createdAt: 1, updatedAt: 1 }],
      'PUT /spades/games/g1': (b) => {
        sent = b as SpGame;
        return [200, { rev: sent.rev, earned: [] }];
      },
    });
    await syncSpNow({ full: true });
    expect(calls.filter((c) => !c.startsWith('GET'))).toEqual([
      'POST /players',
      'PUT /spades/games/g1',
    ]);
    expect(sent).toMatchObject({ kind: 'spades', syncId: 'g1' });
    expect(archive.get('spGames', 'g1')!.syncedRev).toBe(g.rev);
    expect(archive.get('players', 'd')!.local).toBe(false);
    expect(syncStatus()).toMatchObject({ phase: 'idle', waiting: 0 });
  });

  it('with no table open (Me’s Sync now), uses the stored session and still uploads', async () => {
    bindSpEngine(null);
    setSession(session);
    known();
    const g = myGame();
    const calls = server({
      ...base,
      'PUT /spades/games/g1': () => [200, { rev: g.rev, earned: [] }],
    });
    try {
      expect(pendingSpGames(ME)).toHaveLength(1);
      await syncSpNow();
      expect(calls).toContain('PUT /spades/games/g1');
      expect(archive.get('spGames', 'g1')!.syncedRev).toBe(g.rev);
      expect(pendingSpGames(ME)).toEqual([]);
    } finally {
      setSession(null);
      resetSessionForTests();
    }
  });

  it('never touches the network signed out', async () => {
    bindSpEngine({ session: () => null, game: () => null, syncGame: () => {} });
    myGame();
    const calls = server(base);
    await syncSpNow({ full: true });
    expect(calls).toEqual([]);
    expect(syncStatus().phase).toBe('signedOut');
  });

  it('a game waits while one of its players is not on the server', async () => {
    known();
    archive.put('players', { ...serverPlayer('d'), local: true });
    myGame();
    const calls = server(base);
    await syncSpNow({ full: true });
    expect(calls).not.toContain('PUT /spades/games/g1');
    expect(syncStatus().waiting).toBe(1);
  });

  it('422 unknown_player: those players are created first, the game goes next time', async () => {
    known();
    myGame();
    server({
      ...base,
      'PUT /spades/games/g1': () => [422, { code: 'unknown_player', playerIds: ['d'] }],
    });
    await syncSpNow({ full: true });
    expect(archive.get('players', 'd')).toMatchObject({ pendingCreate: true, local: true });
    expect(archive.get('spGames', 'g1')!.syncedRev).toBeUndefined();
  });

  it('a stale upload keeps the copy with more hands and saves the other as a conflict copy', async () => {
    known();
    const mine = myGame('g1', 1);
    const theirs = spGame('g1', 3, undefined, mine.createdAt);
    bind(mine);
    server({
      ...base,
      'PUT /spades/games/g1': () => [409, { code: 'stale', server: { ...theirs, rev: 7 } }],
    });
    await syncSpNow({ full: true });
    const main = archive.get('spGames', 'g1')!;
    expect(done(main.game)).toHaveLength(3);
    expect(main.syncedRev).toBe(7);
    expect(current && done(current)).toHaveLength(3);
    const copy = archive.spGames().find((r) => r.conflictOf === 'g1')!;
    expect(done(copy.game)).toHaveLength(1);
    expect(archive.get('inbox', 'sp:conflict:g1')!.data).toMatchObject({ game: 'spades' });
    resolveSpConflict(copy.syncId, true);
    expect(done(archive.get('spGames', 'g1')!.game)).toHaveLength(1);
    expect(archive.get('spGames', 'g1')!.game.rev).toBe(main.game.rev + 1);
    expect(archive.get('spGames', copy.syncId)).toBeUndefined();
  });

  it('a game the server rejects stays here, is not retried, and the inbox says why', async () => {
    known();
    myGame();
    const calls = server({
      ...base,
      'PUT /spades/games/g1': () => [422, { code: 'invalid_game', reason: 'tricks', handIndex: 0 }],
    });
    await syncSpNow({ full: true });
    await syncSpNow({ full: false });
    expect(calls.filter((c) => c === 'PUT /spades/games/g1')).toHaveLength(1);
    expect(archive.get('inbox', 'sp:rejected:g1')!.data).toMatchObject({
      reason: 'tricks',
      handIndex: 0,
      game: 'spades',
    });
    expect(archive.get('outbox', 'spput:g1')).toMatchObject({
      kind: 'putSpGame',
      blocked: 'tricks',
    });
    expect(syncStatus().phase).toBe('attention');
  });

  it('rewrites merged player ids in the archive and in the current game', async () => {
    known();
    archive.put('players', serverPlayer('z'));
    const g = myGame();
    bind(g);
    server({
      ...base,
      'PUT /spades/games/g1': () => [200, { rev: g.rev, earned: [], remap: { d: 'z' } }],
    });
    await syncSpNow({ full: true });
    expect(archive.get('spGames', 'g1')!.game.players[3].playerId).toBe('z');
    expect(current!.players[3].playerId).toBe('z');
  });

  it('410 gone: a game deleted on the server leaves this device', async () => {
    known();
    myGame();
    server({ ...base, 'PUT /spades/games/g1': () => [410, { code: 'gone' }] });
    await syncSpNow({ full: true });
    expect(archive.get('spGames', 'g1')).toBeUndefined();
  });

  it('410 on the game being played: it stays on this phone, no longer synced, and the inbox says so', async () => {
    known();
    bind(myGame());
    server({ ...base, 'PUT /spades/games/g1': () => [410, { code: 'gone' }] });
    await syncSpNow({ full: true });
    expect(archive.get('spGames', 'g1')).toMatchObject({ account: undefined });
    expect(archive.get('inbox', 'sp:rejected:g1')!.data).toMatchObject({ reason: 'deleted' });
  });

  it('pulls from the newest server change minus 5 s, and tombstones remove games', async () => {
    archive.put('cache', { key: 'sp:games:since', value: 1_000_000, fetchedAt: 0 });
    archive.put('spGames', {
      ...archive.get('spGames', myGame('old').syncId)!,
      origin: 'remote',
      syncedRev: 1,
    });
    urls.length = 0;
    server({
      ...base,
      'GET /spades/games': () => [
        200,
        { items: [{ id: 'old', deleted: true, updatedAt: 1_200_000 }], nextCursor: null },
      ],
    });
    await syncSpNow({ full: true });
    const list = urls.find((u) => u.startsWith('/api/spades/games?'))!;
    expect(list).toContain('updatedSince=995000');
    expect(list).toContain('involving=true');
    expect(archive.get('spGames', 'old')).toBeUndefined();
    expect(archive.get('cache', 'sp:games:since')!.value).toBe(1_200_000);
  });

  it('a game someone else scored with me at the table is kept to view, never synced from here', async () => {
    const theirs = spGame('k1', 2);
    const summary = {
      id: 'k1',
      kind: 'spades',
      owner: { id: 'kabir', name: 'Kabir' },
      createdAt: theirs.createdAt,
      finishedAt: null,
      updatedAt: 1_300_000,
      status: 'active',
      hands: 2,
      target: 200,
      players: [],
      scores: { a: 0, b: 0 },
      result: null,
      live: false,
    };
    const calls = server({
      ...base,
      'GET /spades/games': () => [200, { items: [summary], nextCursor: null }],
      'GET /spades/games/k1': () => [200, { game: theirs, summary }],
    });
    await syncSpNow({ full: true });
    expect(archive.get('spGames', 'k1')).toMatchObject({
      owner: { id: 'kabir' },
      account: undefined,
      syncedRev: theirs.rev,
      endedAt: null,
    });
    expect(calls.filter((c) => c.startsWith('PUT'))).toEqual([]);
    // Unchanged on the next pull: not fetched again.
    await syncSpNow({ full: true });
    expect(calls.filter((c) => c === 'GET /spades/games/k1')).toHaveLength(1);
  });

  it('a newer server copy of the game on the table replaces it', async () => {
    const g = myGame('g1', 1);
    archive.put('spGames', { ...archive.get('spGames', 'g1')!, syncedRev: g.rev });
    bind(g);
    const newer = { ...spGame('g1', 2, undefined, g.createdAt), rev: 5 };
    server({
      ...base,
      'GET /spades/games': () => [
        200,
        {
          items: [
            {
              id: 'g1',
              owner: { id: ME, name: 'Me' },
              status: 'active',
              hands: 2,
              updatedAt: 9,
              finishedAt: null,
            },
          ],
          nextCursor: null,
        },
      ],
      'GET /spades/games/g1': () => [200, { game: newer, summary: {} }],
    });
    await syncSpNow({ full: true });
    expect(current!.rev).toBe(5);
    expect(archive.get('spGames', 'g1')).toMatchObject({ account: ME, syncedRev: 5 });
  });

  it('a 429 waits retryAfter seconds before asking again', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
    let n = 0;
    const calls = server({
      ...base,
      'GET /players': () => (n++ ? empty() : [429, { code: 'rate_limited', retryAfter: 30 }]),
    });
    await syncSpNow({ full: true });
    await syncSpNow({ full: true });
    expect(calls.filter((c) => c === 'GET /players')).toHaveLength(1);
    vi.setSystemTime(Date.now() + 31e3);
    await syncSpNow({ full: true });
    expect(calls.filter((c) => c === 'GET /players')).toHaveLength(2);
    vi.useRealTimers();
  });

  it('a 401 stops the run and needs a fresh sign-in', async () => {
    server({ 'GET /players': () => [401, { code: 'unauthenticated' }] });
    await syncSpNow({ full: true });
    expect(syncStatus().phase).toBe('attention');
  });

  it("adds everyone this account's player sat with at Spades, both kinds, to the shared circle", async () => {
    archive.put('cache', { key: 'met', value: ['from-kachuful'], fetchedAt: 0 });
    bind(null, { ...session, player: { id: 'me', displayName: 'Me', emoji: '🙂', color: 'c' } });
    let pages = 0;
    server({
      ...base,
      'GET /spades/players/me/games': () => [
        200,
        pages++ === 0
          ? {
              items: [
                {
                  id: 'x',
                  kind: 'spades',
                  createdAt: Date.now(),
                  players: [{ playerId: 'me' }, { playerId: 'zed' }],
                },
              ],
              nextCursor: 'c2',
            }
          : {
              items: [
                {
                  id: 'y',
                  kind: 'spades-online',
                  createdAt: 0,
                  seats: [{ playerId: 'amy' }, null],
                },
              ],
              nextCursor: null,
            },
      ],
    });
    await syncSpNow({ full: true });
    expect(archive.get('cache', 'met')!.value).toEqual(['from-kachuful', 'zed', 'amy']);
    // The next pull stops at a page reaching games started before the last pull (minus a day).
    const calls = server({
      ...base,
      'GET /spades/players/me/games': () => [
        200,
        { items: [{ id: 'y', kind: 'spades', createdAt: 0, players: [] }], nextCursor: 'more' },
      ],
    });
    await syncSpNow({ full: true });
    expect(calls.filter((c) => c.includes('/players/me/games'))).toHaveLength(1);
  });

  it('deletes go to the Spades route, and an undone game that was on the server is deleted there', async () => {
    known();
    const g = myGame();
    archive.put('spGames', { ...archive.get('spGames', 'g1')!, syncedRev: g.rev });
    expect(forgetEmptySp('g1')).toBe(true);
    expect(hasSpWork(ME)).toBe(true);
    myGame('g2');
    archive.put('spGames', { ...archive.get('spGames', 'g2')!, syncedRev: 1 });
    queueSpDelete('g2');
    const calls = server({ ...base, 'DELETE /spades/games/g.*': () => [204] });
    await syncSpNow({ full: true });
    expect(calls.filter((c) => c.startsWith('DELETE'))).toEqual([
      'DELETE /spades/games/g1',
      'DELETE /spades/games/g2',
    ]);
    expect(archive.all('outbox')).toEqual([]);
  });

  it('the wire game is the game as it is, with registry ids; a stored one keeps its key', () => {
    const g = myGame('w1');
    const w = toWire(g);
    expect(w).toMatchObject({ id: g.id, syncId: g.syncId, rev: g.rev, kind: 'spades' });
    expect(w.players.every((p) => p.playerId)).toBe(true);
    expect(fromWire(w)).toEqual(w);
  });
});
