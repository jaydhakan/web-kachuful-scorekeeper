import { gameTotals, validate, type SpGame } from '@/games/spades/domain';
import { SP_KEYS } from '@/games/spades/state/keys';
import { peek } from '@/games/spades/state/peek';
import { storage } from '@/state/persistence';
import fixture from './__fixtures__/sp-v1-save.json';
import { CURRENT_SCHEMA, isSpShape, migrateSpGame, migrateWith, migrations } from './migrations';
import {
  loadSp,
  loadSpLastGroup,
  parseSpSnapshot,
  resolveSpCorrupt,
  saveSp,
  saveSpLastGroup,
} from './persistence';

const saved = () => structuredClone(fixture) as unknown as SpGame;

beforeEach(() => localStorage.clear());

describe('migrations', () => {
  it('a v1 save loads as it was saved, totals derived from its hands, and the server accepts it', () => {
    const g = migrateSpGame(saved())!;
    expect(g).toEqual(saved());
    expect(validate(g, g.updatedAt + 1)).toBe(null);
    const t = gameTotals(g);
    expect([t.a.score, t.a.bags, t.b.score, t.b.bags]).toEqual([192, 2, 141, 1]);
  });

  it('starts at schema 1 with no steps yet', () => {
    expect(CURRENT_SCHEMA).toBe(1);
    expect(migrations).toEqual({});
  });

  it('runs each step in turn up to the current version (a pretend v2 and v3)', () => {
    const table = {
      1: (g: Record<string, unknown>) => ({ ...g, extra: 'x', schemaVersion: 2 }),
      2: (g: Record<string, unknown>) => ({ ...g, more: g.extra, schemaVersion: 3 }),
    };
    expect(migrateWith(saved(), table, 3)).toMatchObject({
      extra: 'x',
      more: 'x',
      schemaVersion: 3,
    });
    expect(migrateWith(saved(), {}, 2)).toBe(null);
    expect(migrateWith(saved(), { 1: () => ({ schemaVersion: 2 }) }, 2)).toBe(null);
  });

  it('refuses a newer, unversioned or misshapen save', () => {
    expect(migrateSpGame({ ...saved(), schemaVersion: 2 })).toBe(null);
    expect(migrateSpGame({ ...saved(), schemaVersion: undefined })).toBe(null);
    expect(migrateSpGame({ ...saved(), players: saved().players.slice(0, 3) })).toBe(null);
    expect(migrateSpGame({ ...saved(), kind: 'kaali-teeri' })).toBe(null);
    expect(isSpShape({ ...saved(), hands: [{ index: 0 }] })).toBe(false);
    expect(parseSpSnapshot('{not json')).toBe(null);
  });
});

describe('persistence', () => {
  it('saves and loads the game, its undo ring and the screen it reopens on', () => {
    expect(saveSp(saved(), ['a', 'b'])).toBe('ok');
    const l = loadSp();
    expect(l).toMatchObject({ screen: 'game', undo: ['a', 'b'], corrupt: false });
    expect(l.game).toEqual(saved());
  });

  it('keeps the keys and shape the landing page reads', () => {
    saveSp(saved(), []);
    expect(storage.get(SP_KEYS.game, null)).toMatchObject({ kind: 'spades', status: 'active' });
    expect(peek()).toMatchObject({ hand: 3, teams: ['Riya & Dev', 'Arjun & Meera'] });
    expect(peek()!.line).toBe('Hand 3 · Dev deals');
  });

  it('a finished or cancelled game reopens on a new setup, not the game', () => {
    saveSp({ ...saved(), status: 'cancelled', finishedAt: saved().updatedAt }, []);
    expect(loadSp().screen).toBe('setup');
    expect(peek()).toBe(null);
  });

  it('no game clears the game and its undo ring', () => {
    saveSp(saved(), ['x']);
    saveSp(null, ['x']);
    expect(storage.getRaw(SP_KEYS.game)).toBe(null);
    expect(storage.getRaw(SP_KEYS.undo)).toBe(null);
  });

  it('an unreadable save is backed up, not loaded, until the player chooses', () => {
    storage.setRaw(SP_KEYS.game, '{"kind":"spades","broken":');
    const l = loadSp();
    expect(l).toMatchObject({ game: null, corrupt: true });
    expect(storage.getRaw(SP_KEYS.backup)).toBe('{"kind":"spades","broken":');
    resolveSpCorrupt('keep');
    expect(storage.getRaw(SP_KEYS.game)).toBe(null);
    expect(storage.getRaw(SP_KEYS.backup)).not.toBe(null);
    storage.setRaw(SP_KEYS.game, 'nope');
    loadSp();
    resolveSpCorrupt('reset');
    expect(storage.getRaw(SP_KEYS.backup)).toBe(null);
  });

  it('a full disk drops the oldest undo snapshots before giving up', () => {
    const set = vi.spyOn(storage, 'set');
    let calls = 0;
    set.mockImplementation((k, v) => {
      calls++;
      if (k === SP_KEYS.undo && Array.isArray(v) && v.length > 5) return 'quota';
      localStorage.setItem(k, JSON.stringify(v));
      return 'ok';
    });
    const ring = Array.from({ length: 12 }, (_, i) => `s${i}`);
    expect(saveSp(saved(), ring)).toBe('ok');
    expect(storage.get(SP_KEYS.undo, [])).toEqual(ring.slice(-5));
    expect(calls).toBe(4);
    set.mockRestore();
  });

  it('remembers the last group only when it is four players with valid rules', () => {
    const lg = {
      players: saved().players.map(({ name, emoji, color, playerId }) => ({
        name,
        emoji,
        color,
        playerId,
      })),
      direction: 'cw' as const,
      rules: saved().rules,
      at: 1,
    };
    saveSpLastGroup(lg);
    expect(loadSpLastGroup()).toEqual(lg);
    saveSpLastGroup({ ...lg, players: lg.players.slice(0, 3) });
    expect(loadSpLastGroup()).toBe(null);
    saveSpLastGroup({ ...lg, rules: { ...lg.rules, target: 7 } });
    expect(loadSpLastGroup()).toBe(null);
  });
});
