import back from '@/assets/themes/emerald-gilt/back.webp';
import backMini from '@/assets/themes/emerald-gilt/back-mini.webp';
import kingClubs from '@/assets/themes/emerald-gilt/king-clubs.webp';
import queenHearts from '@/assets/themes/emerald-gilt/queen-hearts.webp';
import type { ThemeId } from './themes';

/**
 * A theme's deck art, the same hashed files themes.css points at. CSS backgrounds only download once something on
 * screen uses them, which is mid-deal, so the art is fetched and decoded as soon as the theme is shown.
 */
const ART: Partial<Record<ThemeId, string[]>> = {
  'emerald-gilt': [back, backMini, queenHearts, kingClubs],
};

const loads = new Map<ThemeId, Promise<boolean>>();

const decode = (src: string) =>
  new Promise<void>((ok, fail) => {
    const img = new Image();
    img.onload = () => void img.decode().then(ok, ok);
    img.onerror = fail;
    img.src = src;
  });

/** True once this theme has no art or its art is decoded. */
export const artReady = (id: ThemeId): boolean =>
  !ART[id] || document.documentElement.dataset.artReady?.split(' ').includes(id) === true;

/**
 * Fetches and decodes a theme's art once, then marks `<html data-art-ready>` so CSS can hide the suit symbol the
 * art replaces. Offline or failed, it resolves false and the symbol stays: a face is never blank.
 */
export function warmArt(id: ThemeId): Promise<boolean> {
  const urls = ART[id];
  if (!urls) return Promise.resolve(true);
  let p = loads.get(id);
  if (!p) {
    p = Promise.all(urls.map(decode)).then(
      () => {
        const root = document.documentElement;
        root.dataset.artReady = [root.dataset.artReady, id].filter(Boolean).join(' ');
        return true;
      },
      () => {
        loads.delete(id); // try again next time, e.g. back online
        return false;
      },
    );
    loads.set(id, p);
  }
  return p;
}

/** Waits for a theme's art, never longer than `ms`. */
export const artOrTimeout = (id: ThemeId, ms: number): Promise<unknown> =>
  Promise.race([warmArt(id), new Promise((ok) => setTimeout(ok, ms))]);
