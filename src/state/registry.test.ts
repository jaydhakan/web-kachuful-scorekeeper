import { demoGame } from '@/domain';
import { lookFor } from '@/screens/setup/seatLook';
import { archive, archiveGame } from './archive';
import { KEYS, storage } from './persistence';
import {
  backfillRegistry,
  circle,
  ensurePlayer,
  mayEdit,
  rememberSame,
  findByName,
  identify,
  mergeLocal,
  patchLocal,
  people,
  resolveId,
} from './registry';
import { initialState, reducer } from './reducer';

const server = (id: string, name: string, createdBy: string | null = null) => ({
  id,
  displayName: name,
  nameKey: name.toLowerCase(),
  emoji: '🙂',
  color: 'c',
  createdAt: 0,
  updatedAt: 0,
  local: false,
  createdBy,
});

describe("an account's circle (setup suggestions, HANDOFF §5.7)", () => {
  it('is the players it added, people it played with, ones it confirmed, its own and local ones', async () => {
    await archive.ready;
    archive.put(
      'players',
      server('mine', 'Mine'),
      server('added', 'Added', 'u1'),
      server('met', 'Met'),
      server('table', 'Table'),
      server('ok', 'Confirmed'),
      server('stranger', 'Stranger', 'u2'),
      { ...server('here', 'Here'), local: true },
    );
    archive.put('cache', { key: 'met', value: ['met'], fetchedAt: 0 });
    rememberSame('ok');
    archiveGame(
      {
        ...demoGame(),
        id: 'g1',
        syncId: 'g1',
        players: demoGame()
          .players.slice(0, 3)
          .map((p, i) => ({
            ...p,
            playerId: ['mine', 'table', 'met'][i],
          })),
      },
      { account: 'u1' },
    );
    expect(
      circle('u1', 'mine')
        .map((p) => p.id)
        .sort(),
    ).toEqual(['added', 'here', 'met', 'mine', 'ok', 'table']);
  });

  it('only the admin, the creator and the linked user may change a photo or email', () => {
    const p = { createdBy: 'c', linkedUserId: 'l' };
    expect(mayEdit(p, { id: 'x', role: 'admin' })).toBe(true);
    expect(mayEdit(p, { id: 'c', role: 'member' })).toBe(true);
    expect(mayEdit(p, { id: 'l', role: 'member' })).toBe(true);
    expect(mayEdit(p, { id: 'x', role: 'member' })).toBe(false);
    expect(mayEdit(p, null)).toBe(false);
  });
});

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
