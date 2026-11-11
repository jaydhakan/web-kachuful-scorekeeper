import { beforeEach, describe, expect, it, vi } from 'vitest';
import { archive } from '@/state/archive';
import { ishEp } from '@/games/ishaara/sync/endpoints';
import { pullIshaaraMet } from './lists';

const summary = (ids: string[]) => ({ players: ids.map((playerId) => ({ playerId })) });

describe('pullIshaaraMet', () => {
  beforeEach(() => archive.put('cache', { key: 'met', value: ['old'], fetchedAt: 0 }));

  it('adds everyone sat with across every page, never the account itself', async () => {
    const games = vi
      .spyOn(ishEp, 'games')
      .mockResolvedValueOnce({ items: [summary(['me', 'riya'])], nextCursor: 'c2' } as never)
      .mockResolvedValueOnce({
        items: [summary(['me', 'kabir', 'riya'])],
        nextCursor: null,
      } as never);
    await pullIshaaraMet('me');
    expect(games).toHaveBeenLastCalledWith({ cursor: 'c2' });
    expect(archive.get('cache', 'met')!.value).toEqual(['old', 'riya', 'kabir']);
  });
});
