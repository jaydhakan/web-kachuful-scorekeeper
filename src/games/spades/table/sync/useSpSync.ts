import { useEffect, useSyncExternalStore, type Dispatch, type MutableRefObject } from 'react';
import { archive } from '@/state/archive';
import { getSession, onSession, signedInAs } from '@/sync/session';
import { setSyncStatus } from '@/sync/status';
import type { SpAction, SpTableState } from '../state/types';

// The engine is downloaded on the first sign-in; signed out, none of it loads and nothing touches the network.
let engine: Promise<typeof import('./engine')> | null = null;
const loadEngine = () => (engine ??= import('./engine'));

const userIdOf = () => signedInAs(getSession())?.user.id ?? null;

/**
 * Binds table mode's sync engine to its provider, as Kaali Teeri's does: a full sync on sign-in, then 1.5 s after a
 * change with work waiting, on coming online, on becoming visible and every minute.
 */
export function useSpSync(ref: MutableRefObject<SpTableState>, dispatch: Dispatch<SpAction>) {
  const userId = useSyncExternalStore(onSession, userIdOf, userIdOf);

  useEffect(() => {
    if (!userId) {
      setSyncStatus({ phase: 'signedOut', waiting: 0, attention: 0 });
      return;
    }
    let live = true;
    const withEngine = (f: (m: Awaited<ReturnType<typeof loadEngine>>) => void) =>
      void loadEngine().then((m) => live && signedInAs(getSession()) && f(m));
    void loadEngine().then((m) => {
      if (!live) return;
      m.bindSpEngine({
        session: getSession,
        game: () => ref.current.game,
        syncGame: (game, fresh) => dispatch({ type: 'syncGame', game, fresh }),
      });
      void m.syncSpNow({ full: true });
    });
    const kick = () => withEngine((m) => m.scheduleSpSync(300));
    const onVis = () => document.visibilityState === 'visible' && kick();
    const offArchive = archive.subscribe(() =>
      withEngine((m) => m.hasSpWork(userId) && m.scheduleSpSync(1500)),
    );
    const tick = setInterval(() => document.visibilityState === 'visible' && kick(), 60e3);
    window.addEventListener('online', kick);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      live = false;
      void loadEngine().then((m) => m.bindSpEngine(null));
      offArchive();
      clearInterval(tick);
      window.removeEventListener('online', kick);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [userId, ref, dispatch]);
}
