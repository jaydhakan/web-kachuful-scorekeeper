import { useEffect, useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

interface SwState {
  /** A new version is installed and waiting for the player to reload. */
  needRefresh: boolean;
  /** The first install finished: the app now works offline. Cleared once announced. */
  offlineReady: boolean;
}

/** How often an open app asks for a new version, and the least time between two asks. */
export const CHECK_EVERY = 60 * 60e3;
export const CHECK_GAP = 10 * 60e3;

let state: SwState = { needRefresh: false, offlineReady: false };
const subs = new Set<() => void>();
const set = (p: Partial<SwState>) => {
  state = { ...state, ...p };
  subs.forEach((f) => f());
};
let apply: (() => Promise<void>) | null = null;

/**
 * Asks the server for a new service worker when the app comes back to the front and hourly while it stays open, so
 * an installed app left open for days still learns of a deploy. Only ever prompts; the player chooses when to reload.
 */
export function watchForUpdates(reg: ServiceWorkerRegistration): void {
  let last = Date.now();
  const check = () => {
    if (document.visibilityState !== 'visible' || !navigator.onLine || reg.installing) return;
    if (Date.now() - last < CHECK_GAP) return;
    last = Date.now();
    reg.update().catch(() => {});
  };
  document.addEventListener('visibilitychange', check);
  setInterval(check, CHECK_EVERY);
}

/** Registers the service worker once per page, however often the shell holding the prompt remounts. */
function start() {
  apply ??= registerSW({
    immediate: true,
    onNeedRefresh: () => set({ needRefresh: true }),
    onOfflineReady: () => set({ offlineReady: true }),
    onRegisteredSW: (_url, reg) => reg && watchForUpdates(reg),
  });
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};

const actions = {
  /** Activates the waiting version; the page reloads once it takes control. */
  reload: () => void apply?.(),
  dismiss: () => set({ needRefresh: false }),
  announced: () => set({ offlineReady: false }),
};

/** The service worker's update and offline-ready state, and the (stable) actions on it. */
export function useServiceWorker() {
  useEffect(start, []);
  return { ...useSyncExternalStore(subscribe, () => state), ...actions };
}
