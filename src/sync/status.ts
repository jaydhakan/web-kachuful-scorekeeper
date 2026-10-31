import { useSyncExternalStore } from 'react';

/** What the sync engine is doing, for the dot in the header and the rail. */
export interface SyncStatus {
  phase: 'idle' | 'syncing' | 'offline' | 'attention' | 'signedOut';
  /** Uploads waiting. */
  waiting: number;
  /** Things that need a person (inbox). */
  attention: number;
  lastSyncAt: number | null;
}

let cur: SyncStatus = { phase: 'signedOut', waiting: 0, attention: 0, lastSyncAt: null };
const subs = new Set<() => void>();

export const syncStatus = () => cur;
export function setSyncStatus(p: Partial<SyncStatus>) {
  const next = { ...cur, ...p };
  if (JSON.stringify(next) === JSON.stringify(cur)) return;
  cur = next;
  subs.forEach((f) => f());
}
const subscribe = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};

export const useSyncStatus = () => useSyncExternalStore(subscribe, syncStatus);
