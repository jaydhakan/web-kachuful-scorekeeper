import { GAMES, gameById } from '@/platform/catalog';
import { PAGES } from '@/platform/meta';
import { entryPath, gameFromPath, guessGame } from '@/platform/route';
import { KEYS, storage } from '@/state/persistence';
import { kitGame } from './domain/__fixtures__/kit';

describe('Spades on the platform', () => {
  it('is a game path of its own', () => {
    expect(gameFromPath('/spades')).toBe('spades');
    expect(gameFromPath('/Spades/')).toBe('spades');
    expect(entryPath('/spades', '?join=KQ7M')).toBeNull();
    expect(entryPath('/Spades', '?join=KQ7M')).toBe('/spades?join=KQ7M');
    expect(guessGame('/spade')).toBe('spades');
  });

  it('is listed last, live, open to everyone, online or at the table', () => {
    expect(GAMES.at(-1)?.id).toBe('spades');
    expect(gameById('spades')).toMatchObject({
      path: '/spades',
      name: 'Spades',
      kind: 'Online or at the table',
      players: '4 players',
      status: 'live',
      signedInOnly: false,
    });
  });

  it('peeks at the table-mode game for the landing resume line', () => {
    expect(gameById('spades').peek()).toBeNull();
    storage.set(KEYS.spGame, kitGame([{ bids: [3, 3, 3, 3], teamA: 7 }], { updatedAt: 5 }));
    expect(gameById('spades').peek()).toMatchObject({ line: 'Hand 1 · Riya deals', updatedAt: 5 });
  });

  it('loads its root lazily, and its sync speaks for table mode', async () => {
    const root = await gameById('spades').load();
    expect(typeof root.default).toBe('function');
    const sync = await gameById('spades').sync!();
    await expect(sync.syncNow()).resolves.toBeUndefined();
    expect(sync.pending('u1')).toBe(0);
  });

  it('has its own page, preview and icons', () => {
    expect(PAGES.find((p) => p.path === '/spades')).toMatchObject({
      file: 'spades/index.html',
      title: 'Spades · Baithak',
      image: '/games/spades/og-image.png',
      touchIcon: '/games/spades/apple-touch-icon.png',
    });
  });
});
