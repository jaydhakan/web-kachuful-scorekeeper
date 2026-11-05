import { useSyncExternalStore } from 'react';
import { ApiError } from '@/sync/api';
import { ep, type AppearanceDto } from '@/sync/endpoints';
import { applyTheme, shownTheme } from '@/theme/applyTheme';
import { warmArt } from '@/theme/art';
import {
  DEFAULT_THEME,
  isThemeId,
  resolveTheme,
  THEMES,
  type Appearance,
  type ThemeId,
} from '@/theme/themes';
import { loadThemeState, saveAppearance, saveUserTheme, userThemeUnsent } from './persistence';
import { keepPrefs } from './prefs';

/**
 * Which theme is on screen and why (DESIGN-SYSTEM.md, Switching themes). Local-first: the device's cached setting applies before
 * the app draws, the server's (when signed in and when it exists) refreshes it, and a theme change never touches game
 * state.
 */
export interface ThemeState {
  shown: ThemeId;
  /** An admin trying a theme on this device only; cleared by Stop or by applying. */
  preview: ThemeId | null;
  appearance: Appearance | null;
  /** This player's own pick, used only while the admin allows it. */
  user: ThemeId | null;
  /** Whether the server stores appearance settings: `missing` while it answers 404 (not deployed yet). */
  remote: 'unknown' | 'ok' | 'missing' | 'offline';
  etag: string | null;
}

const fromStore = (): ThemeState => {
  const l = loadThemeState();
  const a = l.appearance;
  const shown = shownTheme();
  return {
    shown: isThemeId(shown) ? shown : DEFAULT_THEME,
    preview: null,
    appearance:
      a && isThemeId(a.theme)
        ? {
            theme: a.theme,
            allowUserOverride: !!a.allowUserOverride,
            updatedAt: a.updatedAt,
            updatedBy: a.updatedBy,
            source: a.source === 'server' ? 'server' : 'device',
          }
        : null,
    user: isThemeId(l.user) ? l.user : null,
    remote: 'unknown',
    etag: null,
  };
};

let st: ThemeState | null = null;
const subs = new Set<() => void>();
const state = () => (st ??= fromStore());
const set = (p: Partial<ThemeState>) => {
  st = { ...state(), ...p };
  subs.forEach((f) => f());
};

export const themeStore = {
  get: state,
  subscribe(f: () => void) {
    subs.add(f);
    return () => void subs.delete(f);
  },
};
export const useThemeState = () => useSyncExternalStore(themeStore.subscribe, themeStore.get);

/** The theme this device should show now, by the resolution order. */
export const resolved = (s = state()) =>
  resolveTheme({ user: s.user, appearance: s.appearance, cached: s.shown });

async function show(id: ThemeId, o: { persist?: boolean; animate?: boolean } = {}) {
  void warmArt(id);
  if (state().shown === id && shownTheme() === id) return;
  await applyTheme(id, o);
  set({ shown: id });
}

/** Puts the resolved theme on screen unless an admin is previewing another. */
const settle = (animate = true) => {
  const s = state();
  if (!s.preview) void show(resolved(s), { animate });
};

/** Only a 404 means the server doesn't store the setting yet; other failures leave what was known. */
const remoteAfter = (e: unknown): Pick<ThemeState, 'remote'> | null =>
  e instanceof ApiError
    ? e.offline
      ? { remote: 'offline' }
      : e.status === 404
        ? { remote: 'missing' }
        : null
    : null;

// The server sends epoch ms; the device keeps the ISO string it has always saved in `kf.theme.appearance`.
const fromServer = (d: AppearanceDto, fallback: Partial<Appearance> = {}): Appearance => ({
  theme: isThemeId(d.theme) ? d.theme : (fallback.theme ?? DEFAULT_THEME),
  allowUserOverride: !!d.allowUserOverride,
  updatedAt: d.updatedAt != null ? new Date(d.updatedAt).toISOString() : fallback.updatedAt,
  updatedBy: d.updatedBy ?? fallback.updatedBy,
  source: 'server',
});
const msOf = (iso?: string) => (iso ? Date.parse(iso) : 0) || 0;

/** Reads the server's setting when signed in (start, back to the front, every 5 minutes). Never throws. */
export async function refreshAppearance(): Promise<void> {
  try {
    const r = await ep.appearance({ etag: state().etag });
    if (r.status === 304 || !r.data) return set({ remote: 'ok' });
    const a = fromServer(r.data);
    // The browser may answer from its 60-second cache with the copy from before this admin's own save.
    const known = state().appearance;
    if (known?.source === 'server' && msOf(a.updatedAt) < msOf(known.updatedAt))
      return set({ remote: 'ok' });
    saveAppearance(a);
    set({ appearance: a, remote: 'ok', etag: r.etag });
    settle();
  } catch (e) {
    const r = remoteAfter(e);
    if (r) set(r);
  }
}

/** Once at start: the cached resolution is applied at once (the boot script showed the last theme). */
export function initTheme() {
  settle(false);
}

/** Admin: try a theme on this device only, or `null` to stop. Not saved; a reload shows the real theme. */
export function previewTheme(id: ThemeId | null) {
  set({ preview: id });
  void show(id ?? resolved(), { persist: false });
}

/**
 * Admin: the theme everyone gets. Saved on the device at once; sent to the server when signed in. Resolves with what
 * happened, and the previous setting so the caller can offer Undo.
 */
export async function applyToEveryone(
  theme: ThemeId,
  allowUserOverride: boolean,
  who: string,
): Promise<{ saved: 'everyone' | 'device'; previous: Appearance | null }> {
  const previous = state().appearance;
  const local: Appearance = {
    theme,
    allowUserOverride,
    updatedAt: new Date().toISOString(),
    updatedBy: who,
    source: 'device',
  };
  saveAppearance(local);
  set({ appearance: local, preview: null });
  settle();
  try {
    // The PUT's answer is the stored setting; a GET now could come from the browser's cache.
    const a = fromServer(await ep.setAppearance({ theme, allowUserOverride }), local);
    saveAppearance(a);
    set({ appearance: a, remote: 'ok' });
    settle();
    return { saved: 'everyone', previous };
  } catch (e) {
    const r = remoteAfter(e);
    if (r) set(r);
    return { saved: 'device', previous };
  }
}

/** Puts a previous setting back (Undo); `null` goes back to the built-in default. */
export async function restoreAppearance(prev: Appearance | null, who: string) {
  if (prev) return applyToEveryone(prev.theme, prev.allowUserOverride, who);
  return applyToEveryone(DEFAULT_THEME, false, who);
}

/** A player's own theme (only offered while the admin allows it); `null` follows the admin's choice again. */
export function chooseOwnTheme(id: ThemeId | null, signedIn: boolean) {
  saveUserTheme(id, signedIn);
  set({ user: id });
  settle();
  if (signedIn) void sendOwnTheme();
}

/** Sends this device's pick. On failure it stays marked unsent and goes next time. */
async function sendOwnTheme() {
  const id = state().user;
  try {
    const p = await ep.setPrefs({ theme: id });
    keepPrefs(p);
    if (state().user === id) saveUserTheme(id);
  } catch {
    /* kept on this device; a 404 means the server doesn't store it yet */
  }
}

/**
 * The account's pick, from an auth answer or `/auth/me`. A pick made here that hasn't reached the server goes first;
 * otherwise the server's wins. It is kept even while the admin doesn't let players choose; `resolved` ignores it then.
 */
export async function syncUserTheme(server: string | null): Promise<void> {
  if (userThemeUnsent()) return sendOwnTheme();
  // A theme this version doesn't know (a newer app set it) leaves the device's as it is.
  if (server !== null && !isThemeId(server)) return;
  if (server === state().user) return;
  saveUserTheme(server);
  set({ user: server });
  settle();
}

export const themeLabel = (id: ThemeId) => THEMES[id].label;
