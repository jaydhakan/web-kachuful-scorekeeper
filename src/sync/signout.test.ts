import { archive, type GameRec, type KtGameRec } from '@/state/archive';
import { pendingUploads } from './signout';

const rec = (
  syncId: string,
  o: { rev: number; synced?: number; account?: string; id?: string },
) => ({
  syncId,
  game: { id: o.id ?? syncId, rev: o.rev },
  updatedAt: 1,
  endedAt: null,
  origin: 'local' as const,
  syncedRev: o.synced,
  account: o.account ?? 'u1',
});

describe('pendingUploads', () => {
  beforeEach(() => archive.clear('games', 'ktGames', 'outbox'));

  it('counts unsynced games of this account in Kachuful and Kaali Teeri', () => {
    archive.put(
      'games',
      rec('kf-1', { rev: 3, synced: 2 }) as unknown as GameRec,
      rec('kf-2', { rev: 2, synced: 2 }) as unknown as GameRec,
      rec('kf-3', { rev: 2, account: 'someone' }) as unknown as GameRec,
      rec('kf-demo', { rev: 2, id: 'demo' }) as unknown as GameRec,
    );
    archive.put('ktGames', rec('kt-1', { rev: 1 }) as unknown as KtGameRec);
    expect(pendingUploads('u1')).toBe(2);
  });

  it('leaves out an upload the server refused for good, and is 0 signed out', () => {
    archive.put('ktGames', rec('kt-1', { rev: 1 }) as unknown as KtGameRec);
    archive.put('outbox', {
      id: 'ktput:kt-1',
      kind: 'putKtGame',
      key: 'kt-1',
      attempts: 1,
      nextAt: 0,
      createdAt: 0,
      blocked: 'forbidden',
    });
    expect(pendingUploads('u1')).toBe(0);
    expect(pendingUploads(undefined)).toBe(0);
  });
});
