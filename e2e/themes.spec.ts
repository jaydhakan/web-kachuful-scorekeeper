import { expect, test, type Page } from '@playwright/test';
import { openSeeded, seedGame } from './fixtures';
import { NAMES7, btn, toSetup3 } from './helpers';
import {
  boardWaitsFor,
  GIVER,
  ishBtn,
  openFromHome,
  openIshaara,
  other,
  readyGame,
  showKey,
  TEAM,
} from './ishaara-helpers';

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
  await page.goto('/kachuful');
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
  await page.goto('/kachuful');
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
    await page.goto('/kachuful');
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
  await page.goto('/kachuful');
  await page.evaluate(() => localStorage.setItem('kf.theme', 'emerald-gilt'));
  await page.reload();
  await expect(page.locator('html[data-art-ready~="emerald-gilt"]')).toBeAttached();
  expect(art.length).toBe(6);
});

test('other themes never fetch deck art', async ({ page }) => {
  const art: string[] = [];
  page.on('request', (r) => r.url().endsWith('.webp') && art.push(r.url()));
  await page.goto('/kachuful');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  expect(art).toEqual([]);
});

test('emerald-gilt without its art: the trump face keeps its symbol and the deal still runs', async ({
  page,
}) => {
  await page.route(/\.webp$/, (r) => r.abort());
  await page.goto('/kachuful');
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
  await page.goto('/kachuful');
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

/**
 * Shows a theme the way the app does: the cached choice plus a reload, so the boot script links the theme's own
 * stylesheet (setting data-theme alone leaves its rules out). Signed in, the server's appearance would override
 * the cache, so it answers with the same theme.
 */
const themeHref = new Map<string, string>();
async function showTheme(page: Page, id: string) {
  await page.route('**/api/settings/appearance', (r) =>
    r.fulfill({ json: { theme: id, allowUserOverride: false, updatedAt: null, updatedBy: null } }),
  );
  await page.evaluate((t) => localStorage.setItem('kf.theme', t), id);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', id);
  if (id !== 'sunset-glass')
    await page.waitForFunction(
      (t) => !!document.querySelector<HTMLLinkElement>(`link[data-theme-css="${t}"]`)?.sheet,
      id,
    );
  const href = await page.evaluate(
    (t) => document.querySelector(`link[data-theme-css="${t}"]`)?.getAttribute('href'),
    id,
  );
  if (href) themeHref.set(id, href);
  await page.waitForTimeout(400);
}

/** Switches theme in place, as the app's switcher does: the theme's stylesheet first, then data-theme. */
async function switchTheme(page: Page, id: string) {
  await page.evaluate(
    async ([t, href]) => {
      if (href && !document.querySelector(`link[data-theme-css="${t}"]`)) {
        const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href });
        link.dataset.themeCss = t;
        await new Promise((ok) => {
          link.onload = ok;
          document.head.append(link);
        });
      }
      document.documentElement.setAttribute('data-theme', t);
    },
    [id, themeHref.get(id) ?? ''] as const,
  );
  await page.waitForTimeout(400);
}

/** Lowest contrast between an element's text and any colour in its background (a gradient's stops included). */
const labelContrast = (page: Page, sel: string) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel)!;
    const cs = getComputedStyle(el);
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
    const rgb = (c: string) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data];
    };
    const lum = ([r, g, b]: number[]) =>
      [r, g, b]
        .map((v) => v / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
        .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const stops =
      cs.backgroundImage.match(/(rgba?|color|oklch|oklab|hsla?)\([^)]*\)|#[0-9a-f]{3,8}/gi) ?? [];
    const bgs = [cs.backgroundColor, ...stops].map(rgb).filter((c) => c[3] > 0);
    const fg = lum(rgb(cs.color));
    return Math.min(
      ...bgs.map((b) => {
        const [hi, lo] = [Math.max(fg, lum(b)), Math.min(fg, lum(b))];
        return (hi + 0.05) / (lo + 0.05);
      }),
    );
  }, sel);

for (const id of THEMES)
  test(`${id}: Ishaara's sign-in gate shows its Sign in label`, async ({ page }) => {
    test.fail(id === 'editorial-paper', 'PL-F02: ink label on an ink pill in Editorial Paper');
    await page.goto('/ishaara');
    await showTheme(page, id);
    const link = page.getByRole('link', { name: 'Sign in' });
    await expect(link).toBeVisible();
    await link.evaluate((el) => el.setAttribute('data-probe', ''));
    expect(await labelContrast(page, '[data-probe]')).toBeGreaterThanOrEqual(3);
  });

test('every theme lays out Ishaara’s setup, board, key and win identically', async ({
  page,
  browser,
}) => {
  test.setTimeout(150_000);
  const phone = { viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true };
  await openIshaara(page, 'admin');
  const { phones, t, close } = await readyGame(page, browser, {
    phone: { ...phone, reducedMotion: 'reduce' },
  });
  const key = phones[t];
  const layouts: Record<string, string[]> = {};
  const each = async (screen: string, open: (theme: string) => Promise<void>) => {
    for (const id of THEMES) {
      await open(id);
      const on = screen === 'key' ? key : page;
      await on.waitForTimeout(500);
      // Measured in the theme's own faces: a fallback font lays text out differently.
      await on.evaluate(() => document.fonts.ready.then(() => {}));
      layouts[`${id} ${screen}`] = await boxes(on);
    }
  };

  await each('setup', async (id) => {
    await page.goto('/ishaara');
    await showTheme(page, id);
    await ishBtn(page, 'New game').click();
    await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible();
  });
  await each('board', async (id) => {
    await page.goto('/ishaara');
    await showTheme(page, id);
    await openFromHome(page);
    await boardWaitsFor(page, t, GIVER[t]);
  });
  await each('key', async (id) => {
    await showTheme(key, id);
    await showKey(key);
  });
  await ishBtn(page, 'Menu').click();
  await ishBtn(page, `${TEAM[t]} resigns`).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Resign' }).click();
  await expect(page.getByText(`${TEAM[t]} resigned.`)).toBeVisible({ timeout: 10_000 });
  // A finished game leaves Home, so the win is themed in place rather than reopened.
  await each('win', async (id) => {
    await switchTheme(page, id);
    await expect(page.getByRole('heading', { name: `${TEAM[other(t)]} wins` })).toBeVisible();
  });
  await close();

  // Each theme loads its own faces, so a pill sized by its label may differ in width (within 15%); heights match
  // exactly, and positions stay within 2px plus what a wider neighbour pushes sideways.
  const parse = (b: string[]) =>
    b.map((s) => {
      const m = /^(.*) (-?\d+),(-?\d+) (\d+)x(\d+)$/.exec(s)!;
      return { id: m[1], x: +m[2], y: +m[3], w: +m[4], h: +m[5] };
    });
  const moved: string[] = [];
  for (const screen of ['setup', 'board', 'key', 'win']) {
    const want = parse(layouts[`${THEMES[0]} ${screen}`]);
    expect(want.length, screen).toBeGreaterThan(2);
    for (const id of THEMES.slice(1)) {
      const got = parse(layouts[`${id} ${screen}`]);
      expect(
        got.map((g) => g.id),
        `${id} ${screen}`,
      ).toEqual(want.map((w) => w.id));
      got.forEach((g, i) => {
        const w = want[i];
        const at = `${id} ${screen} ${g.id}`;
        if (g.h !== w.h) moved.push(`${at} height ${w.h}→${g.h}`);
        if (Math.abs(g.w - w.w) > w.w * 0.15) moved.push(`${at} width ${w.w}→${g.w}`);
        if (Math.abs(g.y - w.y) > 2) moved.push(`${at} y ${w.y}→${g.y}`);
        if (Math.abs(g.x - w.x) > 2 + w.w * 0.15) moved.push(`${at} x ${w.x}→${g.x}`);
      });
    }
  }
  // Open finding (ISH-F17): the clue phone's status line can wrap in Yerba Sun's wider face and push the key down.
  // It depends on which team starts, so it is excused here, not required; delete this once the line is fixed.
  const known = /^yerba-sun key .* y \d+→\d+$/;
  expect(moved.filter((m) => !known.test(m))).toEqual([]);
});
