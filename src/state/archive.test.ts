import { demoGame, type Game } from '@/games/kachuful/domain';
import type { KtGame } from '@/games/kaali-teeri/domain';
import { kitGame, T0 } from '@/games/kaali-teeri/domain/__fixtures__/kit';
import { newGame, type IshaaraPublic } from '@/games/ishaara/domain';
import { PLAYERS, RULES, WORDS } from '@/games/ishaara/domain/__fixtures__/kit';
import { archiveIshaaraGame } from '@/games/ishaara/state/persistence';
import {
  archive,
  archiveGame,
  archiveKtGame,
  Archive,
  DB_VERSION,
  forgetEmpty,
  forgetEmptyKt,
  idbBackend,
  upgradeDb,
  type KtGameRec,
  resetArchive,
  sweepEmpty,
  type Backend,
  type GameRec,
} from './archive';

/** A backend that keeps rows between Archive instances, standing in for IndexedDB. */
function diskBackend(fail = false): Backend & { rows: Record<string, Map<string, unknown>> } {
  const rows: Record<string, Map<string, unknown>> = {
    games: new Map(),
    players: new Map(),
    outbox: new Map(),
    cache: new Map(),
    inbox: new Map(),
    ktGames: new Map(),
    ishaaraGames: new Map(),
  };
  const key = (s: string, r: Record<string, unknown>) =>
    String(
      r[{ games: 'syncId', ktGames: 'syncId', ishaaraGames: 'syncId', cache: 'key' }[s] ?? 'id'],
    );
  return {
    rows,
    load: async () =>
      Object.fromEntries(Object.entries(rows).map(([k, m]) => [k, [...m.values()]])) as never,
    put: async (s, rs) => {
      if (fail) throw new DOMException('full', 'QuotaExceededError');
      rs.forEach((r) => rows[s].set(key(s, r as never), r));
    },
    del: async (s, ks) => void ks.forEach((k) => rows[s].delete(k)),
    clear: async (ss) => void ss.forEach((s) => rows[s].clear()),
  };
}

const real = (patch: Partial<Game> = {}): Game => ({
  ...demoGame(),
  id: 'g1',
  syncId: 'sync-1',
  ...patch,
});

describe('archive', () => {
  // A fresh archive bumps its version once loading settles; every test starts after that.
  beforeEach(() => archive.ready);

  it('keeps a real game, and not the demo or a game with no round done', async () => {
    await archive.ready;
    archiveGame(demoGame());
    const fresh = real();
    // Bids typed, nothing confirmed: still nothing to keep.
    fresh.rounds = [{ ...fresh.rounds[0], phase: 'bidding', results: {} }];
    archiveGame(fresh);
    expect(archive.games()).toHaveLength(0);
    archiveGame(real());
    expect(archive.games().map((r) => r.syncId)).toEqual(['sync-1']);
    expect(archive.get('games', 'sync-1')).toMatchObject({ origin: 'local', endedAt: null });
  });

  it('records when a finished game ended, and replaces the copy as the game changes', () => {
    archiveGame(real());
    const v = archive.version;
    archiveGame(real({ rev: 2, status: 'finished', finishedAt: 500, updatedAt: 500 }));
    expect(archive.version).toBeGreaterThan(v);
    expect(archive.games()).toHaveLength(1);
    expect(archive.get('games', 'sync-1')!.endedAt).toBe(500);
  });

  it('skips writing an unchanged game', () => {
    // One game, twice: the demo game is stamped with the clock, so two builds can differ by a millisecond.
    const g = real();
    archiveGame(g);
    const v = archive.version;
    archiveGame(g);
    expect(archive.version).toBe(v);
  });

  it('lists newest first and leaves out deleted games', () => {
    archiveGame(real({ syncId: 'a', updatedAt: 1 }));
    archiveGame(real({ syncId: 'b', updatedAt: 3 }));
    archiveGame(real({ syncId: 'c', updatedAt: 2 }));
    archive.put('games', { ...archive.get('games', 'c')!, deleted: true });
    expect(archive.games().map((r) => r.syncId)).toEqual(['b', 'a']);
  });

  it('reloads what it wrote, and a write made while loading wins over the disk copy', async () => {
    const disk = diskBackend();
    const a = new Archive(disk);
    await a.ready;
    const rec: GameRec = {
      syncId: 'x',
      game: real({ syncId: 'x' }),
      updatedAt: 1,
      endedAt: null,
      origin: 'local',
    };
    a.put('games', rec);
    a.put('cache', { key: 'k', value: 1, fetchedAt: 0 });
    await new Promise((r) => setTimeout(r));
    const b = new Archive(disk);
    b.put('cache', { key: 'k', value: 2, fetchedAt: 1 });
    await b.ready;
    expect(b.get('games', 'x')).toEqual(rec);
    expect(b.get('cache', 'k')!.value).toBe(2);
  });

  it('reports a full disk once per failed write and keeps the data in memory', async () => {
    const a = resetArchive(diskBackend(true));
    await a.ready;
    const errs: string[] = [];
    a.onError((e) => errs.push(e));
    archiveGame(real());
    await new Promise((r) => setTimeout(r));
    expect(errs).toEqual(['quota']);
    expect(a.games()).toHaveLength(1);
  });

  it('notifies subscribers on every change', () => {
    const f = vi.fn();
    const off = archive.subscribe(f);
    archive.put('inbox', { id: 'i', kind: 'conflict', key: 'g', createdAt: 0, data: {} });
    archive.del('inbox', 'i');
    archive.del('inbox', 'missing');
    off();
    expect(f).toHaveBeenCalledTimes(2);
  });
});

describe('games with no round done', () => {
  beforeEach(() => archive.ready);
  const empty = (syncId: string): Game => {
    const g = real({ syncId });
    g.rounds = [{ ...g.rounds[0], phase: 'bidding', results: {} }];
    return g;
  };
  const rec = (g: Game, more: Partial<GameRec> = {}): GameRec => ({
    syncId: g.syncId,
    game: g,
    updatedAt: g.updatedAt,
    endedAt: null,
    origin: 'local',
    ...more,
  });

  it('forgets a copy only this device has, and deletes one the server has through the outbox', () => {
    archive.put('games', rec(empty('here')), rec(empty('there'), { account: 'u1', syncedRev: 3 }));
    expect(forgetEmpty('here')).toBe(false);
    expect(archive.get('games', 'here')).toBeUndefined();
    expect(forgetEmpty('there')).toBe(true);
    expect(archive.get('games', 'there')?.deleted).toBe(true);
    expect(archive.get('outbox', 'del:there')).toMatchObject({ kind: 'deleteGame', key: 'there' });
  });

  it('sweeps old empty games once, never the one on the table or an unreadable one', () => {
    const broken = { ...rec(real({ syncId: 'broken' })), game: {} as Game };
    archive.put(
      'games',
      rec(empty('old')),
      rec(empty('table')),
      rec(real({ syncId: 'kept' })),
      broken,
    );
    sweepEmpty('table');
    expect(
      archive
        .all('games')
        .map((r) => r.syncId)
        .sort(),
    ).toEqual(['broken', 'kept', 'table']);
    archive.put('games', rec(empty('later')));
    sweepEmpty('table');
    expect(archive.get('games', 'later')).toBeDefined();
  });
});

describe('Kaali Teeri games', () => {
  beforeEach(() => archive.ready);
  const kt = (patch: Partial<KtGame> = {}): KtGame => ({
    ...kitGame({
      id: 'kt-1',
      players: ['a', 'b', 'c', 'd'],
      start: T0,
      hands: [{ bidder: 0, bid: 150, team: 200 }],
    }),
    ...patch,
  });

  it('keeps a game with a hand done in its own store, apart from Kachuful games', () => {
    archiveKtGame(
      kt({ hands: [{ ...kt().hands[0], phase: 'playing', teamPoints: null, countedBy: null }] }),
    );
    archiveKtGame(kt({ id: 'demo', syncId: 'demo' }));
    expect(archive.ktGames()).toHaveLength(0);
    archiveKtGame(kt());
    archiveGame(real());
    expect(archive.ktGames().map((r) => r.syncId)).toEqual(['kt-1']);
    expect(archive.games().map((r) => r.syncId)).toEqual(['sync-1']);
    expect(archive.get('ktGames', 'kt-1')).toMatchObject({ origin: 'local', endedAt: null });
  });

  it('records when it ended, skips an unchanged copy, lists newest first, forgets on request', () => {
    archiveKtGame(kt());
    const v = archive.version;
    archiveKtGame(kt());
    expect(archive.version).toBe(v);
    archiveKtGame(kt({ rev: 2, status: 'finished', finishedAt: T0 + 9, updatedAt: T0 + 9 }));
    expect(archive.get('ktGames', 'kt-1')!.endedAt).toBe(T0 + 9);
    archiveKtGame(kt({ status: 'finished', rev: 3 }));
    expect(archive.get('ktGames', 'kt-1')!.endedAt).toBe(kt().updatedAt);
    archiveKtGame(kt({ syncId: 'kt-2', updatedAt: T0 + 1e9 }));
    archive.put('ktGames', { ...archive.get('ktGames', 'kt-2')!, syncId: 'kt-3', deleted: true });
    expect(archive.ktGames().map((r) => r.syncId)).toEqual(['kt-2', 'kt-1']);
    forgetEmptyKt('kt-2');
    expect(archive.ktGames().map((r) => r.syncId)).toEqual(['kt-1']);
  });

  it('reloads Kaali Teeri games from disk next to everything else', async () => {
    const disk = diskBackend();
    const a = new Archive(disk);
    await a.ready;
    const rec: KtGameRec = {
      syncId: 'k',
      game: kt({ syncId: 'k' }),
      updatedAt: 1,
      endedAt: null,
      origin: 'local',
    };
    a.put('ktGames', rec);
    a.put('games', {
      syncId: 'x',
      game: real({ syncId: 'x' }),
      updatedAt: 1,
      endedAt: null,
      origin: 'local',
    });
    await a.flush();
    const b = new Archive(disk);
    await b.ready;
    expect(b.get('ktGames', 'k')).toEqual(rec);
    expect(b.get('games', 'x')).toBeDefined();
  });
});

describe('Ishaara history copies', () => {
  const finished = (over: Partial<IshaaraPublic> = {}): IshaaraPublic => {
    const g = newGame({
      id: 'ish-1',
      players: PLAYERS,
      words: WORDS,
      rules: RULES,
      starting: 'sun',
      now: 5,
    });
    return {
      ...g,
      status: 'finished',
      winner: 'sun',
      endedBy: 'resign',
      finishedAt: 9,
      solution: [],
      ...over,
    };
  };

  it('keeps only finished games, newest first, and survives a reload', async () => {
    const disk = diskBackend();
    resetArchive(disk);
    await archive.ready;
    archiveIshaaraGame({ ...finished(), status: 'active', solution: null });
    expect(archive.ishaaraGames()).toHaveLength(0);
    archiveIshaaraGame(finished(), 'Jay');
    archiveIshaaraGame(finished({ id: 'ish-2', finishedAt: 20 }));
    expect(archive.ishaaraGames().map((r) => [r.syncId, r.endedAt])).toEqual([
      ['ish-2', 20],
      ['ish-1', 9],
    ]);
    await archive.flush();
    const b = new Archive(disk);
    await b.ready;
    expect(b.get('ishaaraGames', 'ish-1')).toMatchObject({ hostName: 'Jay', endedAt: 9 });
  });
});

describe('database upgrade', () => {
  /** A database as an older version left it: stores holding rows, which an upgrade must not touch. */
  function oldDb(stores: string[]) {
    const made: { name: string; keyPath: string; indexes: string[] }[] = [];
    const rows = new Map(stores.map((s) => [s, ['row']]));
    return {
      made,
      rows,
      objectStoreNames: {
        contains: (n: string) => rows.has(n) || made.some((m) => m.name === n),
      },
      createObjectStore(name: string, o: { keyPath: string }) {
        const rec = { name, keyPath: o.keyPath, indexes: [] as string[] };
        made.push(rec);
        return { createIndex: (i: string) => void rec.indexes.push(i) };
      },
    };
  }
  const V1 = ['games', 'players', 'outbox', 'cache', 'inbox'];

  it("version 1 to 3 adds ktGames and ishaaraGames, with the games store's indexes, and keeps every row", () => {
    expect(DB_VERSION).toBe(3);
    const d = oldDb(V1);
    upgradeDb(d);
    expect(d.made).toEqual([
      { name: 'ktGames', keyPath: 'syncId', indexes: ['endedAt', 'updatedAt'] },
      { name: 'ishaaraGames', keyPath: 'syncId', indexes: ['endedAt', 'updatedAt'] },
    ]);
    for (const s of V1) expect(d.rows.get(s)).toEqual(['row']);
  });

  it('version 2 to 3 adds only ishaaraGames and keeps every row', () => {
    const V2 = [...V1, 'ktGames'];
    const d = oldDb(V2);
    upgradeDb(d);
    expect(d.made).toEqual([
      { name: 'ishaaraGames', keyPath: 'syncId', indexes: ['endedAt', 'updatedAt'] },
    ]);
    for (const s of V2) expect(d.rows.get(s)).toEqual(['row']);
  });

  it('a new database gets every store', () => {
    const d = oldDb([]);
    upgradeDb(d);
    expect(d.made.map((m) => [m.name, m.keyPath, m.indexes.length])).toEqual([
      ['games', 'syncId', 2],
      ['players', 'id', 0],
      ['outbox', 'id', 0],
      ['cache', 'key', 0],
      ['inbox', 'id', 0],
      ['ktGames', 'syncId', 2],
      ['ishaaraGames', 'syncId', 2],
    ]);
  });

  it('opens the database at the new version and upgrades it through upgradeDb', async () => {
    const d = oldDb(V1);
    let asked: [string, number] | null = null;
    const db = {
      ...d,
      transaction: () => ({ objectStore: () => ({ getAll: () => fakeReq([]) }) }),
    };
    const idb = {
      open(name: string, v: number) {
        asked = [name, v];
        const r = { result: db } as unknown as IDBOpenDBRequest;
        setTimeout(() => {
          r.onupgradeneeded?.({} as IDBVersionChangeEvent);
          r.onsuccess?.({} as Event);
        });
        return r;
      },
    } as unknown as IDBFactory;
    const loaded = await idbBackend(idb).load();
    expect(asked).toEqual(['kachuful', 3]);
    expect(d.made.map((m) => m.name)).toEqual(['ktGames', 'ishaaraGames']);
    expect(Object.keys(loaded).sort()).toEqual([
      'cache',
      'games',
      'inbox',
      'ishaaraGames',
      'ktGames',
      'outbox',
      'players',
    ]);
  });
});

function fakeReq<T>(result: T): IDBRequest<T> {
  const r = { result } as unknown as IDBRequest<T>;
  setTimeout(() => r.onsuccess?.({} as Event));
  return r;
}
