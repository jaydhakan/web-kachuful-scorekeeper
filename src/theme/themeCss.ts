import editorialPaper from '@/styles/themes/editorial-paper.css?url';
import emeraldGilt from '@/styles/themes/emerald-gilt.css?url';
import yerbaSun from '@/styles/themes/yerba-sun.css?url';
import { THEME_IDS, type ThemeId } from './themes';

/**
 * Each theme but the default has its own stylesheet, so a device downloads the one theme it shows, not all four
 * (the default's rules stay in themes.css). The boot script links the cached theme's before the first paint
 * (vite.config.ts, themeBoot); switching or previewing a theme loads its sheet first.
 */
export const THEME_CSS: Partial<Record<ThemeId, string>> = {
  'yerba-sun': yerbaSun,
  'editorial-paper': editorialPaper,
  'emerald-gilt': emeraldGilt,
};

const loads = new Map<ThemeId, Promise<boolean>>();

/**
 * True once this theme's rules apply: at once for the default, or when the sheet is already linked. False when it
 * could not load, so the caller keeps the current theme rather than show one without its colours. Offline the app
 * comes from the service worker, which precaches every stylesheet.
 */
export function loadThemeCss(id: ThemeId): Promise<boolean> {
  const href = THEME_CSS[id];
  if (!href) return Promise.resolve(true);
  let p = loads.get(id);
  if (p) return p;
  const linked = document.querySelector<HTMLLinkElement>(`link[data-theme-css="${id}"]`);
  // The boot script's link has loaded by the time the app runs: its stylesheet blocked the first paint.
  if (linked?.sheet) p = Promise.resolve(true);
  else {
    const link = linked ?? document.createElement('link');
    p = new Promise<boolean>((ok) => {
      link.addEventListener('load', () => ok(true), { once: true });
      // Removed so a later attempt tries again.
      link.addEventListener('error', () => (loads.delete(id), link.remove(), ok(false)), {
        once: true,
      });
    });
    if (!linked) {
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.themeCss = id;
      document.head.append(link);
    }
  }
  loads.set(id, p);
  return p;
}

/** Every theme's rules, for screens that draw all of them side by side. */
export const loadAllThemeCss = () => Promise.all(THEME_IDS.map(loadThemeCss)).then(() => {});
