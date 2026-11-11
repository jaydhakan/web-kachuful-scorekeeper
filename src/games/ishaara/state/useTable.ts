import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { Action, Identity, Team } from '@/games/ishaara/domain';
import { ishEp, reasonOf } from '@/games/ishaara/sync/endpoints';
import { ApiError } from '@/sync/api';
import { GameLink, type LinkState, type SendResult } from './link';

export interface IshaaraTable extends LinkState {
  send(action: Action): Promise<SendResult>;
  reload(): void;
}

/** Follows one game for as long as the component is mounted; a new id starts a new link. */
function useLink(id: string): IshaaraTable {
  const link = useMemo(() => new GameLink(id), [id]);
  useEffect(() => {
    link.start();
    return () => link.stop();
  }, [link]);
  const snap = useSyncExternalStore(link.subscribe, link.get);
  return useMemo(() => ({ ...snap, send: link.send, reload: link.reload }), [snap, link]);
}

/**
 * The table device's view of a game: the server's public state over the live stream, and `send` for the table's
 * actions (guess, endTurn, timeout, undoLast, resign, skip). It never asks for the key.
 */
export function useTable(id: string): IshaaraTable {
  return useLink(id);
}

export type KeyStatus = 'idle' | 'loading' | 'ready' | 'forbidden' | 'gone' | 'error';

export interface IshaaraClue extends IshaaraTable {
  /** The 25 identities, held in memory only (never stored or logged); null until `openKey`. */
  key: Identity[] | null;
  /** The team this phone gives clues for, once the key is open. */
  team: Team | null;
  keyStatus: KeyStatus;
  /** Asks for the key once (the first open marks this clue-giver joined); later calls do nothing. */
  openKey(): void;
}

/** A clue-giver's phone: the same public state, plus the key once the person chooses to show it. */
export function useClue(id: string): IshaaraClue {
  const t = useTable(id);
  type K = { id: string; key: Identity[] | null; team: Team | null; status: KeyStatus };
  const [k, setK] = useState<K>({ id, key: null, team: null, status: 'idle' });
  const asked = useRef<string | null>(null);
  const openKey = useCallback(() => {
    if (asked.current === id) return;
    asked.current = id;
    setK({ id, key: null, team: null, status: 'loading' });
    ishEp.key(id).then(
      (r) => asked.current === id && setK({ id, key: r.key, team: r.team, status: 'ready' }),
      (e: unknown) => {
        if (asked.current !== id) return;
        const st = e instanceof ApiError ? e.status : 0;
        // Only a refusal sticks; anything else may be asked again.
        if (st !== 403 && st !== 404) asked.current = null;
        const status = st === 403 ? 'forbidden' : st === 404 ? 'gone' : 'error';
        setK({ id, key: null, team: null, status });
      },
    );
  }, [id]);
  // Another game's key is never shown, even for the render before the reset.
  const mine: K = k.id === id ? k : { id, key: null, team: null, status: 'idle' };
  return { ...t, key: mine.key, team: mine.team, keyStatus: mine.status, openKey };
}

/** How long after a refused `timeout` (the server's clock not there yet) it is sent again. */
export const TIMEOUT_RETRY_MS = 1000;

/**
 * On the table: sends `timeout` when the turn's deadline passes on the server's clock, and again every second while
 * the server says too-early (or the send was refused for being busy or offline). Stops once the deadline changes.
 */
export function useAutoTimeout(
  t: Pick<IshaaraTable, 'game' | 'me' | 'clockOffset' | 'send'>,
  enabled = true,
) {
  const send = useRef(t.send);
  send.current = t.send;
  const offset = useRef(t.clockOffset);
  offset.current = t.clockOffset;
  const deadline = t.game?.status === 'active' ? t.game.deadline : null;
  const host = !!t.me?.host;
  useEffect(() => {
    if (!enabled || !host || deadline === null) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let live = true;
    const fire = async () => {
      const r = await send.current({ type: 'timeout' });
      if (!live || r.ok) return;
      const again = 'refused' in r ? r.refused !== 'not-ready' : reasonOf(r.error) === 'too-early';
      if (again) timer = setTimeout(fire, TIMEOUT_RETRY_MS);
    };
    timer = setTimeout(fire, Math.max(0, deadline - offset.current - Date.now()));
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, host, deadline]);
}

/** navigator.onLine, kept current. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (f) => {
      window.addEventListener('online', f);
      window.addEventListener('offline', f);
      return () => {
        window.removeEventListener('online', f);
        window.removeEventListener('offline', f);
      };
    },
    () => navigator.onLine !== false,
    () => true,
  );
}
