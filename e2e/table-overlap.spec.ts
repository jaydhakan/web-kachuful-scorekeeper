import { expect, test, type Page } from '@playwright/test';
import { LONG_NAMES, openSeeded, seedGame } from './fixtures';
import { bidEveryone, btn, startGame, toSetup3 } from './helpers';

/** Requested box widths; a table never goes below its own minimum, so 245 means "as small as it gets". */
const WIDTHS = process.env.WIDTHS
  ? process.env.WIDTHS.split(',').map(Number)
  : [245, 270, 300, 340, 420, 510];

/** Stands in for a screen that fits its table to a slot: the same width and --s the CSS would give. */
const scaleTable = (page: Page, uid: string, width: number) =>
  page.locator(`[data-table="${uid}"]`).evaluate((el, w) => {
    const css = getComputedStyle(el),
      design = parseFloat(css.getPropertyValue('--tw')),
      min = parseFloat(css.getPropertyValue('--min'));
    const size = Math.max(w, design * min);
    (el as HTMLElement).style.width = `${size}px`;
    el.style.setProperty('--s', `${Math.min(size / design, 1.5)}px`);
  }, width);

/** Seat names, bid bubbles, chips (dealer, first, made/missed) and avatars that touch where they should not. */
const collisions = (page: Page, uid: string) =>
  page.evaluate((uid) => {
    type Part = { kind: string; seat: number; txt: string; r: DOMRect };
    const root = document.querySelector(`[data-table="${uid}"]`)!;
    const parts: Part[] = [];
    const add = (kind: string, sel: string) =>
      root.querySelectorAll(sel).forEach((el) => {
        const r = el.getBoundingClientRect();
        const seat = +(el.closest('[data-seat]') as HTMLElement).dataset.seat!;
        parts.push({ kind, seat, txt: (el.textContent || '').trim() || kind, r });
      });
    add('name', '[data-seat-name]');
    add('bid', '[data-seat-bid]');
    add('chip', '[data-seat-chip]');
    add('avatar', '[data-seat-avatar]');
    // The centre text, a line at a time (the spade and its caption), so only what is painted counts.
    root.querySelectorAll('[data-table-center] > *').forEach((el, i) => {
      const rg = document.createRange();
      rg.selectNodeContents(el);
      parts.push({
        kind: 'centre',
        seat: -1 - i,
        txt: (el.textContent || '').trim(),
        r: rg.getBoundingClientRect(),
      });
    });
    const hit = (a: DOMRect, b: DOMRect) =>
      a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
    const out: string[] = [];
    parts.forEach((a, i) =>
      parts.slice(i + 1).forEach((b) => {
        // Within one seat the chips and bubble sit on the avatar by design; only the name must stay clear.
        if (a.kind === 'centre' && b.kind === 'centre') return;
        if (a.seat === b.seat && a.kind !== 'name' && b.kind !== 'name') return;
        if (a.seat === b.seat && (a.kind === 'avatar' || b.kind === 'avatar')) return;
        if (hit(a.r, b.r))
          out.push(`seat ${a.seat} ${a.kind} "${a.txt}" × seat ${b.seat} ${b.kind} "${b.txt}"`);
      }),
    );
    return out;
  }, uid);

for (const n of [3, 5, 7]) {
  test(`nothing on a table overlaps at any size (${n} players)`, async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    await page.goto('/');
    await startGame(page, LONG_NAMES.slice(0, n));
    await bidEveryone(page);
    const found: string[] = [];
    for (const w of WIDTHS) {
      await scaleTable(page, 'bid', w);
      await page.waitForTimeout(150);
      found.push(...(await collisions(page, 'bid')).map((c) => `bidding ${w}px: ${c}`));
    }
    await btn(page, 'Start playing').click();
    await page.waitForTimeout(700);
    for (const w of WIDTHS) {
      await scaleTable(page, 'play', w);
      await page.waitForTimeout(150);
      found.push(...(await collisions(page, 'play')).map((c) => `play ${w}px: ${c}`));
    }
    expect(found).toEqual([]);
  });
}

for (const n of [3, 5, 7]) {
  test(`the deal screen's table has no overlaps at any size (${n} players)`, async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    await page.goto('/');
    await toSetup3(page, LONG_NAMES.slice(0, n));
    await btn(page, 'Deal!').click();
    await page.locator('[data-table="rs"]').waitFor();
    const found: string[] = [];
    for (const w of WIDTHS) {
      await scaleTable(page, 'rs', w);
      await page.waitForTimeout(150);
      found.push(...(await collisions(page, 'rs')).map((c) => `deal ${w}px: ${c}`));
    }
    expect(found).toEqual([]);
  });
}

for (const n of [3, 5, 7]) {
  test(`the made and missed marks stay clear of the names (${n} players)`, async ({ page }) => {
    // The Results table with its marks only shows beside the list on wide screens.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await openSeeded(page, seedGame(n, 'results'), 'round');
    const made = page.getByRole('button', { name: /Made/ });
    for (let k = 2; k < n; k++) await made.nth(k).click();
    await page.locator('[data-table="results"]').waitFor();
    const found: string[] = [];
    for (const w of WIDTHS) {
      await scaleTable(page, 'results', w);
      await page.waitForTimeout(150);
      found.push(...(await collisions(page, 'results')).map((c) => `results ${w}px: ${c}`));
    }
    expect(found).toEqual([]);
  });
}

for (const [w, h, what] of [
  [390, 1100, 'flat'],
  [1280, 800, 'full'],
] as const) {
  for (const n of [3, 5, 7]) {
    test(`the Next-up table has no overlaps at any size (${n} players, ${what})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/');
      await openSeeded(page, seedGame(n, 'summary'), 'round');
      await page.locator('[data-table="sum"]').waitFor({ state: 'visible' });
      const found: string[] = [];
      for (const width of WIDTHS) {
        await scaleTable(page, 'sum', width);
        await page.waitForTimeout(150);
        found.push(...(await collisions(page, 'sum')).map((c) => `summary ${width}px: ${c}`));
      }
      expect(found).toEqual([]);
    });
  }
}
