import { demoGame } from '@/domain';
import { lookFor } from '@/screens/setup/seatLook';
import { archive, archiveGame } from './archive';
import { KEYS, storage } from './persistence';
import {
  backfillRegistry,
  ensurePlayer,
  findByName,
  identify,
  mergeLocal,
  patchLocal,
  people,
  resolveId,
} from './registry';
import { initialState, reducer } from './reducer';

describe('local player registry', () => {
  it('finds a player by name whatever the case or spacing, and creates one only once', () => {
    const a = ensurePlayer({ name: 'Riya', emoji: '🦊', color: 'c' });
    expect(ensurePlayer({ name: '  riya ', emoji: 'x', color: 'y' }).id).toBe(a.id);
    expect(findByName('RIYA')?.emoji).toBe('🦊');
    expect(archive.all('players')).toHaveLength(1);
  });

  it('gives names from older games and recent names a row, once', async () => {
    await archive.ready;
    archiveGame({ ...demoGame(), id: 'g', syncId: 's' });
    storage.set(KEYS.recentNames, ['Zed', 'Aarav']);
    backfillRegistry();
    backfillRegistry();
    expect(
      people()
        .map((p) => p.displayName)
        .sort(),
    ).toEqual(['Aarav', 'Dev', 'Kabir', 'Meera', 'Riya', 'Zed'].sort());
    expect(people().find((p) => p.displayName === 'Riya')!.games).toBe(1);
  });

  it('a merged player counts as the one it was merged into', () => {
    const a = ensurePlayer({ name: 'Riya', emoji: 'a', color: 'a' });
    const b = ensurePlayer({ name: 'Riya S', emoji: 'b', color: 'b' });
    mergeLocal(b.id, a.id);
    expect(resolveId(b.id)).toBe(a.id);
    const g = {
      ...demoGame(),
      players: demoGame().players.map((p, i) => (i ? p : { ...p, playerId: b.id })),
    };
    expect(identify([g])[0].players[0].playerId).toBe(a.id);
    expect(people().map((p) => p.id)).not.toContain(b.id);
  });

  it('refuses a rename onto someone else', () => {
    const a = ensurePlayer({ name: 'Riya', emoji: 'a', color: 'a' });
    ensurePlayer({ name: 'Kabir', emoji: 'b', color: 'b' });
    expect(patchLocal(a.id, { displayName: 'kabir' })).toBe(false);
    expect(patchLocal(a.id, { displayName: 'riya k' })).toBe(true);
    expect(archive.get('players', a.id)!.displayName).toBe('Riya k');
  });

  it('a known player keeps their look unless someone at the table has it', () => {
    const p = {
      ...ensurePlayer({ name: 'Riya', emoji: '🦊', color: 'red' }),
      games: 0,
      lastPlayedAt: null,
    };
    expect(lookFor(p, [null, null, null], 1)).toMatchObject({
      emoji: '🦊',
      color: 'red',
      playerId: p.id,
    });
    expect(lookFor(p, [{ name: 'X', emoji: '🦊', color: 'red' }, null], 1).emoji).not.toBe('🦊');
  });

  it('a new game records the registry id of every seat', () => {
    const seats = ['A', 'B', 'C'].map((name) => ({ name, emoji: 'x', color: 'c' }));
    const ids = seats.map((s) => ensurePlayer(s).id);
    let st = initialState(demoGame(), 'home', []);
    st = reducer(st, { type: 'startSetup', lg: null });
    st = reducer(st, { type: 'setupPatch', patch: { n: 3, seats } });
    st = reducer(st, { type: 'beginGame', id: 'g', syncId: 's', now: 1, playerIds: ids });
    expect(st.game.players.map((p) => p.playerId)).toEqual(ids);
  });
});
