import { demoGame, type Game } from '@/domain';
import { archive, archiveGame, Archive, resetArchive, type Backend, type GameRec } from './archive';

/** A backend that keeps rows between Archive instances, standing in for IndexedDB. */
function diskBackend(fail = false): Backend & { rows: Record<string, Map<string, unknown>> } {
  const rows: Record<string, Map<string, unknown>> = {
    games: new Map(),
    players: new Map(),
    outbox: new Map(),
    cache: new Map(),
    inbox: new Map(),
  };
  const key = (s: string, r: Record<string, unknown>) =>
    String(r[{ games: 'syncId', cache: 'key' }[s] ?? 'id']);
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
  it('keeps a real game, and not the demo or a game nobody has bid in', async () => {
    await archive.ready;
    archiveGame(demoGame());
    const fresh = real();
    fresh.rounds = [{ ...fresh.rounds[0], bids: {} }];
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
    archiveGame(real());
    const v = archive.version;
    archiveGame(real());
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
