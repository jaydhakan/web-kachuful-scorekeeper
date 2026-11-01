import { useSyncExternalStore } from 'react';
import { ApiError } from '@/sync/api';
import { ep } from '@/sync/endpoints';
import { applyTheme, shownTheme } from '@/theme/applyTheme';
import {
  DEFAULT_THEME,
  isThemeId,
  resolveTheme,
  THEMES,
  type Appearance,
  type ThemeId,
} from '@/theme/themes';
import { loadThemeState, saveAppearance, saveUserTheme } from './persistence';

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
  /** Whether the server stores appearance settings: `missing` until the backend builds request 1. */
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
  if (state().shown === id && shownTheme() === id) return;
  await applyTheme(id, o);
  set({ shown: id });
}

/** Puts the resolved theme on screen unless an admin is previewing another. */
const settle = (animate = true) => {
  const s = state();
  if (!s.preview) void show(resolved(s), { animate });
};

/** Reads the server's setting when signed in (start, back to the front, every 5 minutes). Never throws. */
export async function refreshAppearance(): Promise<void> {
  try {
    const r = await ep.appearance({ etag: state().etag });
    if (r.status === 304 || !r.data) return set({ remote: 'ok' });
    const d = r.data;
    const theme = isThemeId(d.theme) ? d.theme : DEFAULT_THEME;
    const a: Appearance = {
      theme,
      allowUserOverride: !!d.allowUserOverride,
      updatedAt: d.updatedAt ?? undefined,
      updatedBy: d.updatedBy ?? undefined,
      source: 'server',
    };
    saveAppearance(a);
    set({ appearance: a, remote: 'ok', etag: r.etag });
    settle();
  } catch (e) {
    set({ remote: e instanceof ApiError && e.offline ? 'offline' : 'missing' });
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
    const d = await ep.setAppearance({ theme, allowUserOverride });
    const a: Appearance = {
      theme: isThemeId(d.theme) ? d.theme : theme,
      allowUserOverride: !!d.allowUserOverride,
      updatedAt: d.updatedAt ?? local.updatedAt,
      updatedBy: d.updatedBy ?? who,
      source: 'server',
    };
    saveAppearance(a);
    set({ appearance: a, remote: 'ok' });
    return { saved: 'everyone', previous };
  } catch (e) {
    set({ remote: e instanceof ApiError && e.offline ? 'offline' : 'missing' });
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
  saveUserTheme(id);
  set({ user: id });
  settle();
  // Sent for other devices when the server supports it (backend-requests.md, request 2); the device keeps it anyway.
  if (signedIn) ep.setMyTheme(id).catch(() => {});
}

export const themeLabel = (id: ThemeId) => THEMES[id].label;
