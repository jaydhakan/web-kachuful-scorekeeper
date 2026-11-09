import { totals, validate, type KtGame } from '@/games/kaali-teeri/domain';
import { T0 } from '@/games/kaali-teeri/domain/__fixtures__/kit';
import { KEYS, storage } from '@/state/persistence';
import fixture from './__fixtures__/kt-v1-save.json';
import { CURRENT_SCHEMA, isKtShape, migrateKtGame, migrateWith, migrations } from './migrations';
import { peek } from './peek';
import {
  loadKt,
  loadKtLastGroup,
  loadKtPrefs,
  parseKtSnapshot,
  resolveKtCorrupt,
  saveKt,
  saveKtLastGroup,
  saveKtPrefs,
  saveKtScreen,
} from './persistence';
import { DEFAULT_PREFS } from './types';

const saved = () => structuredClone(fixture['kaaliteeri.v1']) as unknown as KtGame;

describe('migrations', () => {
  it('a v1 save loads as it was saved, and is a game the server accepts', () => {
    const g = migrateKtGame(saved())!;
    expect(g).toEqual(saved());
    expect(validate(g, T0 + 1e9)).toBe(null);
    expect(totals(g)).toEqual({ p0: 360, p1: 0, p2: 0, p3: 0, p4: 360, p5: 360, p6: 360 });
    expect(g.hands[1]).toMatchObject({
      phase: 'playing',
      called: [{ copy: 'other' }, { copy: 1 }],
    });
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
    expect(migrateWith({ ...saved(), schemaVersion: 2 }, table, 3)).toMatchObject({
      more: undefined,
      schemaVersion: 3,
    });
    // A missing step or one that breaks the shape is unreadable rather than half-migrated.
    expect(migrateWith(saved(), {}, 2)).toBe(null);
    expect(migrateWith(saved(), { 1: () => ({ schemaVersion: 2 }) }, 2)).toBe(null);
  });

  it('refuses a newer, unversioned or misshapen save', () => {
    expect(migrateKtGame({ ...saved(), schemaVersion: 2 })).toBe(null);
    expect(migrateKtGame({ ...saved(), schemaVersion: 0 })).toBe(null);
    expect(migrateKtGame({ ...saved(), schemaVersion: 1.5 })).toBe(null);
    const unversioned: Partial<KtGame> = saved();
    delete unversioned.schemaVersion;
    expect(migrateKtGame(unversioned)).toBe(null);
    for (const bad of [
      null,
      [],
      'x',
      { ...saved(), kind: 'kachuful' },
      { ...saved(), players: saved().players.slice(0, 3) },
      { ...saved(), players: [...saved().players.slice(1), { id: 1 }] },
      { ...saved(), hands: [] },
      { ...saved(), hands: [{ ...saved().hands[0], playedBy: [] }] },
      { ...saved(), hands: [{ ...saved().hands[0], called: [{ rank: 'A' }] }] },
      { ...saved(), rules: { ...saved().rules, decks: 3 } },
      { ...saved(), direction: 'up' },
      { ...saved(), status: 'paused' },
      { ...saved(), ui: null },
    ])
      expect(isKtShape(bad)).toBe(false);
  });
});

describe('saving and loading', () => {
  it('round-trips the game, its undo ring and screen; no game clears them', () => {
    const g = saved();
    expect(saveKt(g, ['a', 'b'])).toBe('ok');
    saveKtScreen('game');
    expect(loadKt()).toEqual({
      game: g,
      screen: 'game',
      undo: ['a', 'b'],
      prefs: DEFAULT_PREFS,
      corrupt: false,
    });
    expect(JSON.parse(storage.getRaw(KEYS.ktGame)!).schemaVersion).toBe(1);
    saveKt(null, []);
    expect(storage.getRaw(KEYS.ktGame)).toBe(null);
    expect(storage.getRaw(KEYS.ktUndo)).toBe(null);
    expect(loadKt()).toMatchObject({ game: null, screen: 'home', undo: [] });
  });

  it('a finished game reopens on home; junk in the undo ring is dropped', () => {
    saveKt({ ...saved(), status: 'finished' }, []);
    storage.set(KEYS.ktUndo, ['ok', 3, null]);
    saveKtScreen('game');
    expect(loadKt()).toMatchObject({ screen: 'home', undo: ['ok'] });
    storage.set(KEYS.ktUndo, 'nope');
    expect(loadKt().undo).toEqual([]);
  });

  it('an unreadable save is backed up and waits for a choice', () => {
    storage.setRaw(KEYS.ktGame, '{"kind":"kaali-teeri"');
    expect(loadKt()).toMatchObject({ game: null, corrupt: true, screen: 'home' });
    expect(storage.getRaw(KEYS.ktBackup)).toBe('{"kind":"kaali-teeri"');
    storage.setRaw(KEYS.ktGame, JSON.stringify({ ...saved(), schemaVersion: 9 }));
    expect(loadKt().corrupt).toBe(true);
    resolveKtCorrupt('keep');
    expect(storage.getRaw(KEYS.ktGame)).toBe(null);
    expect(storage.getRaw(KEYS.ktBackup)).not.toBe(null);
    resolveKtCorrupt('reset');
    expect(storage.getRaw(KEYS.ktBackup)).toBe(null);
  });

  it('a full disk drops undo snapshots before the game', () => {
    const big = Array.from({ length: 10 }, (_, i) => 'x'.repeat(10) + i);
    let calls = 0;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      k,
      v,
    ) {
      calls++;
      if (k === KEYS.ktUndo && JSON.parse(v).length > 0)
        throw new DOMException('full', 'QuotaExceededError');
    });
    expect(saveKt(saved(), big)).toBe('ok');
    expect(calls).toBe(6);
    spy.mockRestore();
  });

  it('snapshots parse through the migrations', () => {
    expect(parseKtSnapshot(JSON.stringify(saved()))).toEqual(saved());
    expect(parseKtSnapshot('{')).toBe(null);
    expect(parseKtSnapshot('{}')).toBe(null);
  });

  it('prefs: quick mode and the defenders by default; bad values fall back', () => {
    expect(loadKtPrefs()).toEqual({ quick: true, countedBy: 'defenders' });
    saveKtPrefs({ quick: false, countedBy: 'bidders' });
    expect(loadKtPrefs()).toEqual({ quick: false, countedBy: 'bidders' });
    expect(JSON.parse(storage.getRaw('kaaliteeri.prefs')!)).toEqual({
      quick: false,
      countedBy: 'bidders',
    });
    storage.set(KEYS.ktPrefs, { quick: 'yes', countedBy: 'them' });
    expect(loadKtPrefs()).toEqual(DEFAULT_PREFS);
    storage.set(KEYS.ktPrefs, 7);
    expect(loadKtPrefs()).toEqual(DEFAULT_PREFS);
  });

  it('last group: kept as saved; a broken one is ignored', () => {
    expect(loadKtLastGroup()).toBe(null);
    const lg = {
      players: [{ name: 'Riya', emoji: '🐯', color: '#FF8A65', playerId: 'r' }],
      direction: 'cw' as const,
      minBid: 150,
      step: 5 as const,
      length: 'endless' as const,
      at: 1,
    };
    saveKtLastGroup(lg);
    expect(loadKtLastGroup()).toEqual(lg);
    storage.set(KEYS.ktLastGroup, { ...lg, direction: 'up' });
    expect(loadKtLastGroup()).toBe(null);
    storage.set(KEYS.ktLastGroup, { ...lg, players: [{}] });
    expect(loadKtLastGroup()).toBe(null);
  });

  it('uses the kaaliteeri.* keys, apart from every Kachuful key', () => {
    expect([
      KEYS.ktGame,
      KEYS.ktUndo,
      KEYS.ktScreen,
      KEYS.ktLastGroup,
      KEYS.ktPrefs,
      KEYS.ktBackup,
    ]).toEqual([
      'kaaliteeri.v1',
      'kaaliteeri.undo',
      'kaaliteeri.screen',
      'kaaliteeri.lastGroup',
      'kaaliteeri.prefs',
      'kaaliteeri.v1.backup',
    ]);
  });
});

describe('peek (the landing card)', () => {
  it('says the hand and who bid, or who deals while bidding', () => {
    saveKt(saved(), []);
    expect(peek()).toEqual({ line: 'Hand 2 · meera bid 400', updatedAt: saved().updatedAt });
    const g = saved();
    g.players[3].name = 'Meera';
    g.hands[1] = { ...g.hands[1], phase: 'bidding', bidder: null, bid: null };
    saveKt(g, []);
    expect(peek()!.line).toBe('Hand 2 · aarav deals');
  });

  it('a scored hand still shows its bid', () => {
    const g = saved();
    g.hands = [g.hands[0]];
    saveKt(g, []);
    expect(peek()!.line).toBe('Hand 1 · aarav bid 360');
  });

  it('nothing for no game, a finished one, or one it cannot read', () => {
    expect(peek()).toBe(null);
    saveKt({ ...saved(), status: 'finished' }, []);
    expect(peek()).toBe(null);
    for (const bad of [
      '{',
      '[]',
      JSON.stringify({ ...saved(), kind: 'kachuful' }),
      JSON.stringify({ ...saved(), hands: 'x' }),
      JSON.stringify({ ...saved(), hands: [] }),
      JSON.stringify({ ...saved(), updatedAt: 'now' }),
      JSON.stringify({
        ...saved(),
        hands: [{ ...saved().hands[1], bidder: null, dealerIndex: 40 }],
      }),
    ]) {
      storage.setRaw(KEYS.ktGame, bad);
      storage.clearMemory();
      expect(peek()).toBe(null);
    }
  });

  it('imports nothing but storage and its strings', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(`${import.meta.dirname}/peek.ts`, 'utf8');
    expect([...src.matchAll(/from '([^']+)'/g)].map((x) => x[1])).toEqual([
      '@/state/persistence',
      '@/games/kaali-teeri/strings/messages',
    ]);
  });
});
