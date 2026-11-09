import { useSyncExternalStore } from 'react';
import { loadSession, saveSession, type Session } from '@/state/persistence';
import { onUnauthenticated } from './api';

/**
 * Who is signed in, for every game and the landing page. Kachuful's store still signs people in and out (its account
 * pages); it publishes each change here, and every other reader subscribes. Saved under the same key as before.
 */
let current: Session | null | undefined;
const subs = new Set<() => void>();

const read = () => (current === undefined ? (current = loadSession()) : current);

export const getSession = (): Session | null => read();

export function setSession(s: Session | null) {
  if (s === read()) return;
  current = s;
  saveSession(s);
  subs.forEach((f) => f());
}

/** Signed in with a session the server still accepts. */
export const signedInAs = (s: Session | null = read()) => (s && !s.stale ? s : null);

// A 401 anywhere: keep the account on screen, but syncing waits until a fresh sign-in.
onUnauthenticated(() => {
  const s = read();
  if (s && !s.stale) setSession({ ...s, stale: true });
});

function subscribe(f: () => void) {
  subs.add(f);
  return () => void subs.delete(f);
}

export const onSession = subscribe;

export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, read, read);
}

/** Tests start each case signed out unless they seed a session first. */
export function resetSessionForTests() {
  current = undefined;
}
