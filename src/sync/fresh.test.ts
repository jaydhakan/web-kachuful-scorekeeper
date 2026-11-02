import { kitGame, rows } from '@/domain/__fixtures__/kit';
import { archive, archiveGame } from '@/state/archive';
import { ensurePlayer } from '@/state/registry';
import { KEYS, storage } from '@/state/persistence';
import { startFresh } from './fresh';
import { ep } from './endpoints';

async function seed() {
  await archive.ready;
  ensurePlayer({ name: 'Asha', emoji: '🙂', color: 'c' });
  const ids = ['Bo', 'Cy', 'Di'].map((n) => ensurePlayer({ name: n, emoji: '🙂', color: 'c' }).id);
  archiveGame(
    kitGame({
      id: 'f1',
      start: Date.now() - 3600e3,
      players: ids,
      names: ['Bo', 'Cy', 'Di'],
      rounds: rows(3, 12, [0]),
      finished: true,
    }),
  );
  storage.set(KEYS.game, { id: 'x' });
  storage.set(KEYS.lastGroup, { names: ['Asha'] });
  storage.set(KEYS.device, 'keep-me');
  storage.set(KEYS.theme, 'keep-theme');
}

afterEach(() => vi.restoreAllMocks());

describe('start fresh', () => {
  it('signed out clears games, players and saved play, and keeps the device id and theme', async () => {
    await seed();
    const del = vi.spyOn(ep, 'deleteMyData');

    await startFresh(false);

    expect(del).not.toHaveBeenCalled();
    expect(archive.all('games')).toEqual([]);
    expect(archive.all('players')).toEqual([]);
    expect(storage.getRaw(KEYS.game)).toBeNull();
    expect(storage.getRaw(KEYS.lastGroup)).toBeNull();
    expect(storage.get(KEYS.device, '')).toBe('keep-me');
    expect(storage.get(KEYS.theme, '')).toBe('keep-theme');
  });

  it('signed in deletes on the server first, then clears the players here too', async () => {
    await seed();
    const del = vi.spyOn(ep, 'deleteMyData').mockResolvedValue({ games: 1, players: 3 });

    await startFresh(true);

    expect(del).toHaveBeenCalledOnce();
    expect(archive.all('games')).toEqual([]);
    expect(archive.all('players')).toEqual([]);
    expect(storage.getRaw(KEYS.game)).toBeNull();
  });

  it('leaves everything as it was when the server call fails', async () => {
    await seed();
    vi.spyOn(ep, 'deleteMyData').mockRejectedValue(new Error('offline'));

    await expect(startFresh(true)).rejects.toThrow('offline');

    expect(archive.all('games').length).toBeGreaterThan(0);
    expect(storage.getRaw(KEYS.game)).not.toBeNull();
  });
});
