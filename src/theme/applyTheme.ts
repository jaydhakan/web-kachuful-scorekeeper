import { saveShownTheme } from '@/state/persistence';
import { loadThemeCss } from './themeCss';
import { THEMES, type ThemeId } from './themes';

/** The theme on screen right now (the boot script set it before the app ran). */
export const shownTheme = (): string | null => document.documentElement.getAttribute('data-theme');

/** Starts the new theme's fonts so the switch doesn't show fallback type; never waits more than `ms`. */
export function loadThemeFonts(id: ThemeId, ms = 600): Promise<void> {
  if (!('fonts' in document)) return Promise.resolve();
  const all = Promise.all(THEMES[id].fonts.map((f) => document.fonts.load(f).catch(() => [])));
  return Promise.race([all.then(() => {}), new Promise<void>((ok) => setTimeout(ok, ms))]);
}

/**
 * Puts a theme on screen (DESIGN-SYSTEM.md, Switching themes). Only `data-theme`, the colour scheme and the browser chrome
 * colour change; layout is identical in every theme, so nothing moves and no state is touched. A 250ms cross-fade
 * where View Transitions exist and motion is welcome; instant otherwise. `persist: false` is a preview.
 */
export async function applyTheme(id: ThemeId, { animate = true, persist = true } = {}) {
  if (persist) saveShownTheme(id);
  if (shownTheme() === id) return;
  // Its stylesheet first: switching before it loads would show the theme without its colours.
  const [ready] = await Promise.all([loadThemeCss(id), loadThemeFonts(id)]);
  if (!ready) return;
  const run = () => {
    const root = document.documentElement;
    root.setAttribute('data-theme', id);
    root.style.colorScheme = THEMES[id].scheme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEMES[id].themeColor);
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (animate && !reduce && typeof doc.startViewTransition === 'function') {
    try {
      doc.startViewTransition(run);
      return;
    } catch {
      /* a transition already running: switch at once */
    }
  }
  run();
}
