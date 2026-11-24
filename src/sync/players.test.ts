import { archive } from '@/state/archive';
import { upsertPlayers } from './players';
import type { Player } from './types';

const DEV: Player = {
  id: '5b9c1d2e-0000-4000-8000-000000000007',
  displayName: 'Dev',
  email: null,
  photoUrl: null,
  firstName: null,
  lastName: null,
  emoji: '🐵',
  color: '#f87171',
  createdBy: null,
  linkedUserId: null,
  mergedInto: null,
  createdAt: 1,
  updatedAt: 1,
};

describe('the registry carries a player’s look from the server', () => {
  it('saves it like the photo, keeps it from an older server, and clears it on null', async () => {
    await archive.ready;
    const look = { outfit: { id: 'jersey', v: 1, number: 10 }, aura: { id: 'smoke', v: 0 } };
    upsertPlayers([{ ...DEV, look }]);
    expect(archive.get('players', DEV.id)?.look).toEqual(look);
    // A server older than the wardrobe sends no `look` at all: what this device knew stays.
    upsertPlayers([{ ...DEV, updatedAt: 2 }]);
    expect(archive.get('players', DEV.id)?.look).toEqual(look);
    upsertPlayers([{ ...DEV, look: null, updatedAt: 3 }]);
    expect(archive.get('players', DEV.id)?.look).toBeNull();
  });
});
