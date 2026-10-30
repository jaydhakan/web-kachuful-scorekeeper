import { demoGame, standings, curRound, doneRounds } from '@/domain';
import fixture from './__fixtures__/prototype-save.json';
import { CURRENT_SCHEMA, isGameShape, migrateGame } from './migrations';
import {
  KEYS,
  loadInitial,
  parseSnapshot,
  resolveCorrupt,
  saveGame,
  storage,
  pushRecentNames,
} from './persistence';

const seed = (entries: Record<string, unknown>) =>
  Object.entries(entries).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('migrations', () => {
  it('loads a save written by the prototype (no schemaVersion)', () => {
    const raw = fixture['kachuful.v1'];
    expect('schemaVersion' in raw).toBe(false);
    const g = migrateGame(raw);
    expect(g).not.toBeNull();
    expect(g!.schemaVersion).toBe(CURRENT_SCHEMA);
    expect(doneRounds(g!)).toHaveLength(6);
    expect(curRound(g!).bids).toEqual({ p2: 2, p3: 3, p4: 1 });
    expect(standings(g!)[0]).toMatchObject({ t: 60, rank: 1 });
  });

  it('keeps every field of the prototype shape', () => {
    const raw = fixture['kachuful.v1'];
    expect(migrateGame(raw)).toEqual({ ...raw, schemaVersion: CURRENT_SCHEMA });
  });

  it('does not touch a current-version save', () => {
    const g = { ...demoGame(), schemaVersion: CURRENT_SCHEMA };
    expect(migrateGame(g)).toEqual(g);
  });

  it('refuses a save from a newer app', () => {
    expect(migrateGame({ ...demoGame(), schemaVersion: CURRENT_SCHEMA + 1 })).toBeNull();
  });

  it.each([
    ['null', null],
    ['an array', []],
    ['an empty object', {}],
    ['no rounds', { ...demoGame(), rounds: [] }],
    ['too few players', { ...demoGame(), players: demoGame().players.slice(0, 2) }],
    ['a bad direction', { ...demoGame(), direction: 'up' }],
    ['a round without bids', { ...demoGame(), rounds: [{ index: 0 }] }],
  ])('rejects %s', (_n, v) => {
    expect(isGameShape(v)).toBe(false);
    expect(migrateGame(v)).toBeNull();
  });

  it('migrates undo snapshots too and drops unreadable ones', () => {
    expect(parseSnapshot(fixture['kachuful.undo'][0])!.schemaVersion).toBe(CURRENT_SCHEMA);
    expect(parseSnapshot('{nope')).toBeNull();
  });
});

describe('loadInitial', () => {
  it('restores a prototype save, its screen and its undo stack', () => {
    seed(fixture);
    const l = loadInitial();
    expect(l.corrupt).toBe(false);
    expect(l.screen).toBe('round');
    expect(l.undo).toHaveLength(1);
    expect(curRound(l.game).bids.p4).toBe(1);
  });

  it('seeds only the demo game on first run, never its names', () => {
    const l = loadInitial();
    expect(l.game.id).toBe('demo');
    expect(l.screen).toBe('home');
    expect(JSON.parse(localStorage.getItem(KEYS.game)!).schemaVersion).toBe(CURRENT_SCHEMA);
    expect(localStorage.getItem(KEYS.lastGroup)).toBeNull();
    expect(localStorage.getItem(KEYS.recentNames)).toBeNull();
  });

  it('only resumes the round or winner screen, otherwise goes home', () => {
    seed({ ...fixture, [KEYS.screen]: 'setup' });
    expect(loadInitial().screen).toBe('home');
    seed({ [KEYS.screen]: 'winner' });
    expect(loadInitial().screen).toBe('winner');
  });

  it('ignores a malformed undo stack', () => {
    seed({ ...fixture, [KEYS.undo]: 'nope' });
    expect(loadInitial().undo).toEqual([]);
    seed({ [KEYS.undo]: [1, 'a'] });
    expect(loadInitial().undo).toEqual(['a']);
  });

  it('flags unparseable JSON as corrupt, backs it up and does not overwrite it', () => {
    localStorage.setItem(KEYS.game, '{"players": [');
    const l = loadInitial();
    expect(l.corrupt).toBe(true);
    expect(localStorage.getItem(KEYS.backup)).toBe('{"players": [');
    expect(localStorage.getItem(KEYS.game)).toBe('{"players": [');
  });

  it('flags valid JSON of the wrong shape as corrupt', () => {
    localStorage.setItem(KEYS.game, JSON.stringify({ players: [] }));
    expect(loadInitial().corrupt).toBe(true);
    expect(localStorage.getItem(KEYS.backup)).toBe(JSON.stringify({ players: [] }));
  });

  it('"keep backup" starts fresh and leaves the backup; "reset" removes it', () => {
    localStorage.setItem(KEYS.game, 'garbage');
    loadInitial();
    resolveCorrupt('keep');
    expect(localStorage.getItem(KEYS.backup)).toBe('garbage');
    expect(JSON.parse(localStorage.getItem(KEYS.game)!).id).toBe('demo');
    localStorage.setItem(KEYS.game, 'garbage');
    resolveCorrupt('reset');
    expect(localStorage.getItem(KEYS.backup)).toBeNull();
    expect(loadInitial().corrupt).toBe(false);
  });

  it('survives localStorage being unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(loadInitial().game.players).toHaveLength(5);
  });
});

describe('saveGame', () => {
  const quota = () => new DOMException('full', 'QuotaExceededError');

  it('stamps the schema version and writes the undo stack', () => {
    expect(saveGame(demoGame(), ['a'])).toBe('ok');
    expect(JSON.parse(localStorage.getItem(KEYS.game)!).schemaVersion).toBe(CURRENT_SCHEMA);
    expect(JSON.parse(localStorage.getItem(KEYS.undo)!)).toEqual(['a']);
  });

  it('trims undo snapshots first when the quota is hit, then recovers', () => {
    const undo = Array.from({ length: 20 }, (_, i) => 'x'.repeat(100) + i);
    const real = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      k: string,
      v: string,
    ) {
      if (k === KEYS.undo && JSON.parse(v).length > 5) throw quota();
      real.call(this, k, v);
    });
    expect(saveGame(demoGame(), undo)).toBe('ok');
    expect(JSON.parse(localStorage.getItem(KEYS.undo)!)).toEqual(undo.slice(-5));
  });

  it('reports quota when nothing fits, without throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw quota();
    });
    expect(saveGame(demoGame(), ['a'])).toBe('quota');
  });

  it('reports unavailable storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(saveGame(demoGame(), [])).toBe('unavailable');
  });

  it('keeps the value in memory when storage rejects the write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw quota();
    });
    storage.set('k', { a: 1 });
    vi.restoreAllMocks();
    localStorage.clear();
    expect(storage.get('k', null)).toEqual({ a: 1 });
  });
});

describe('recent names', () => {
  it('puts new names first, de-duplicates case-insensitively and caps at 20', () => {
    storage.set(KEYS.recentNames, ['Riya', 'Dev']);
    pushRecentNames(['dev', 'Zed']);
    expect(storage.get<string[]>(KEYS.recentNames, [])).toEqual(['Zed', 'dev', 'Riya']);
    pushRecentNames(Array.from({ length: 25 }, (_, i) => 'n' + i));
    expect(storage.get<string[]>(KEYS.recentNames, [])).toHaveLength(20);
  });
});
