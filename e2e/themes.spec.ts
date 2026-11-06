import { expect, test, type Page } from '@playwright/test';
import { openSeeded, seedGame } from './fixtures';
import { NAMES7, btn, toSetup3 } from './helpers';

// DESIGN-SYSTEM.md, Switching themes: themes change paint, never geometry, and switching mid-game touches no state.
const THEMES = ['sunset-glass', 'yerba-sun', 'editorial-paper', 'emerald-gilt'] as const;
const NAMES = ['Aarav', 'Riya', 'Kabir', 'Meera', 'Dev'];

/** Every control and seat on screen, by its accessible name or seat index, with its box rounded to the pixel. */
const boxes = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('button, [role="button"], [data-seat], input')]
      .map((el) => {
        const r = el.getBoundingClientRect();
        const id =
          el.getAttribute('aria-label') ??
          el.getAttribute('data-seat') ??
          (el.textContent ?? '').trim().slice(0, 24);
        return `${id} ${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`;
      })
      .sort((a, b) => a.localeCompare(b)),
  );

const setTheme = (page: Page, id: string) =>
  page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), id);

test.use({ viewport: { width: 360, height: 780 } });

test('every theme lays the bidding screen out identically, and switching keeps the game', async ({
  page,
}) => {
  await page.goto('/');
  await openSeeded(page, seedGame(5, 'bidding', NAMES), 'round');
  await page.getByRole('button', { name: 'Bid 1' }).first().click();
  await page.waitForTimeout(600);
  const saved = await page.evaluate(() => localStorage.getItem('kachuful.v1'));
  const base = await boxes(page);
  expect(base.length).toBeGreaterThan(15);
  // Sizes must match exactly; positions within 2px (type metrics differ by a pixel between faces).
  const parse = (b: string[]) =>
    b.map((s) => {
      const m = /^(.*) (-?\d+),(-?\d+) (\d+)x(\d+)$/.exec(s)!;
      return { id: m[1], x: +m[2], y: +m[3], size: `${m[4]}x${m[5]}` };
    });
  const want = parse(base);
  for (const id of THEMES) {
    await setTheme(page, id);
    await page.waitForTimeout(300);
    const got = parse(await boxes(page));
    expect(
      got.map((g) => `${g.id} ${g.size}`),
      id,
    ).toEqual(want.map((w) => `${w.id} ${w.size}`));
    got.forEach((g, i) => {
      expect(Math.abs(g.x - want[i].x), `${id} ${g.id} x`).toBeLessThanOrEqual(2);
      expect(Math.abs(g.y - want[i].y), `${id} ${g.id} y`).toBeLessThanOrEqual(2);
    });
  }
  // The bid placed before switching is still saved, and switching rewrote nothing.
  expect(saved).toContain('"bids"');
  expect(await page.evaluate(() => localStorage.getItem('kachuful.v1'))).toBe(saved);
});

test('a cold start shows the cached theme before the app runs, and an unknown one falls back', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kf.theme', 'yerba-sun'));
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('yerba-sun');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#FBE7B5');
  await page.evaluate(() => localStorage.setItem('kf.theme', '<corrupt>'));
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('sunset-glass');
});

for (const id of THEMES)
  test(`${id}: only this theme's fonts are downloaded`, async ({ page }) => {
    const fonts: string[] = [];
    page.on('request', (r) => r.resourceType() === 'font' && fonts.push(r.url()));
    await page.goto('/');
    // The default theme's own fonts can still be arriving; they aren't this theme's.
    await page.waitForLoadState('networkidle');
    await page.evaluate((t) => localStorage.setItem('kf.theme', t), id);
    fonts.length = 0;
    await page.reload();
    await page.waitForLoadState('networkidle');
    const want = {
      'sunset-glass': ['instrument-sans'],
      'yerba-sun': ['bricolage', 'space-mono'],
      'editorial-paper': ['instrument-serif', 'instrument-sans', 'dm-mono'],
      'emerald-gilt': ['cinzel', 'instrument-sans'],
    }[id];
    for (const f of fonts)
      expect(
        want.some((w) => f.includes(w)),
        f,
      ).toBe(true);
    expect(fonts.length).toBeGreaterThan(0);
  });

test('emerald-gilt: the deck art is fetched when the theme is shown, before any deal', async ({
  page,
}) => {
  const art: string[] = [];
  page.on('request', (r) => r.url().endsWith('.webp') && art.push(r.url()));
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kf.theme', 'emerald-gilt'));
  await page.reload();
  await expect(page.locator('html[data-art-ready~="emerald-gilt"]')).toBeAttached();
  expect(art.length).toBe(6);
});

test('other themes never fetch deck art', async ({ page }) => {
  const art: string[] = [];
  page.on('request', (r) => r.url().endsWith('.webp') && art.push(r.url()));
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  expect(art).toEqual([]);
});

test('emerald-gilt without its art: the trump face keeps its symbol and the deal still runs', async ({
  page,
}) => {
  await page.route(/\.webp$/, (r) => r.abort());
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kf.theme', 'emerald-gilt'));
  await page.reload();
  const glyphOpacity = () =>
    page.evaluate(() => {
      const face = document.createElement('div');
      face.className = 'trump-face';
      face.dataset.suit = 'hearts';
      face.innerHTML = '<span class="trump-glyph">♥</span>';
      document.body.append(face);
      const o = getComputedStyle(face.firstElementChild!).opacity;
      face.remove();
      return o;
    });
  expect(await glyphOpacity()).toBe('1');
  await page.evaluate(() => (document.documentElement.dataset.artReady = 'emerald-gilt'));
  expect(await glyphOpacity()).toBe('0');
  await page.evaluate(() => delete document.documentElement.dataset.artReady);
  await toSetup3(page, NAMES7.slice(0, 4));
  await btn(page, 'Deal!').click();
  await expect(btn(page, 'Skip the deal animation')).toBeHidden({ timeout: 10_000 });
});

test('only the shown theme’s stylesheet is downloaded, linked before the first paint', async ({
  page,
}) => {
  const css: string[] = [];
  page.on('request', (r) => r.resourceType() === 'stylesheet' && css.push(r.url()));
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  // The default theme's rules are in the main stylesheet.
  expect(css.filter((u) => /yerba-sun|editorial-paper|emerald-gilt/.test(u))).toEqual([]);
  await page.evaluate(() => localStorage.setItem('kf.theme', 'yerba-sun'));
  css.length = 0;
  await page.reload();
  await page.waitForLoadState('networkidle');
  expect(css.filter((u) => /yerba-sun|editorial-paper|emerald-gilt/.test(u)).length).toBe(1);
  expect(css.some((u) => u.includes('yerba-sun'))).toBe(true);
  // Parser-inserted right after the main stylesheet, so its rules keep their place in the cascade.
  const order = await page.evaluate(() =>
    [...document.querySelectorAll('link[rel="stylesheet"]')].map(
      (l) => l.getAttribute('data-theme-css') ?? 'main',
    ),
  );
  expect(order.slice(0, 2)).toEqual(['main', 'yerba-sun']);
});
