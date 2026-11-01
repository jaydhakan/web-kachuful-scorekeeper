import { kitGame, rows } from '@/domain/__fixtures__/kit';
import { archive } from '@/state/archive';
import { resumeElsewhere } from './elsewhere';
import type { GameSummary } from './types';

/** Home's Continue card (request 4): the server's answer when it has one, the synced copies when it can't say. */
const here = kitGame({
  id: 'here',
  players: ['a', 'b', 'c'],
  names: ['Ann', 'Ben', 'Cat'],
  start: Date.now() - 3600e3,
  rounds: rows(3, 2, [0]),
});
const sum = (o: Partial<GameSummary> = {}) =>
  ({
    id: 'other',
    status: 'active',
    endedAt: null,
    rounds: 4,
    updatedAt: here.updatedAt + 1,
    ...o,
  }) as GameSummary;

describe('resume elsewhere', () => {
  beforeEach(() => archive.ready);

  it('offline or signed out shows nothing', () => {
    expect(resumeElsewhere(here, 'u1', 'offline')).toBeNull();
    expect(resumeElsewhere(here, undefined, sum())).toBeNull();
  });

  it('a newer game from the server shows its next round; an older one or this one does not', () => {
    expect(resumeElsewhere(here, 'u1', sum())).toMatchObject({ round: 5, rec: null });
    expect(resumeElsewhere(here, 'u1', sum({ updatedAt: here.updatedAt - 1 }))).toBeNull();
    expect(resumeElsewhere(here, 'u1', sum({ id: here.syncId }))).toBeNull();
  });

  it('the server saying none hides a stale synced copy; unknown falls back to the synced copies', () => {
    archive.put('games', {
      syncId: 'old',
      game: { ...here, syncId: 'old', updatedAt: here.updatedAt + 5 },
      updatedAt: here.updatedAt + 5,
      endedAt: null,
      origin: 'remote',
      account: 'u1',
    });
    expect(resumeElsewhere(here, 'u1', null)).toBeNull();
    expect(resumeElsewhere(here, 'u1', 'unknown')).toMatchObject({
      sum: null,
      rec: { syncId: 'old' },
    });
  });
});
