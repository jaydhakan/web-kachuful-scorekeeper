import { expect, test, type Page } from '@playwright/test';
import { NAMES7 } from './helpers';
import { LONG_NAMES, openSeeded, seedGame, type SeedView } from './fixtures';

const LARGE = [
  { width: 1440, height: 900, nav: 'rail' },
  { width: 1920, height: 1080, nav: 'rail' },
  { width: 1180, height: 820, nav: 'rail' },
  { width: 1024, height: 768, nav: 'rail' },
  { width: 768, height: 1024, nav: 'bar' },
] as const;

const sideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

/** The pane's main button: present, inside the window and not covered at its centre. */
async function reachable(page: Page, name: RegExp) {
  const b = page.getByRole('button', { name }).first();
  await expect(b).toBeVisible();
  const box = (await b.boundingBox())!;
  const vp = page.viewportSize()!;
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 1);
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1);
  const hit = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x, y)?.closest('button')?.textContent ?? '',
    [box.x + box.width / 2, box.y + box.height / 2],
  );
  expect(hit).toMatch(name);
}

const PRIMARY: Record<Exclude<SeedView, 'winner'>, RegExp> = {
  bidding: /Pick a bid|Lock in/,
  playing: /Enter results/,
  results: /Confirm round/,
  summary: /Next round/,
};

test.describe('large-screen layouts', () => {
  for (const vp of LARGE) {
    test(`${vp.width}×${vp.height}: every round screen fits, with the ${vp.nav}`, async ({
      page,
    }) => {
      await page.setViewportSize(vp);
      await page.goto('/');
      for (const view of ['bidding', 'playing', 'results', 'summary'] as const) {
        await openSeeded(page, seedGame(7, view, LONG_NAMES), 'round');
        await reachable(page, PRIMARY[view]);
        expect(await sideways(page), `${view} scrolls sideways`).toBeLessThanOrEqual(0);
        await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible({
          visible: vp.nav === 'rail',
        });
      }
      await openSeeded(page, seedGame(7, 'winner', LONG_NAMES), 'winner');
      await expect(page.getByText(/wins with|share the win/)).toBeVisible();
      expect(await sideways(page)).toBeLessThanOrEqual(0);
    });
  }

  test('a phone, upright or on its side, keeps the phone UI', async ({ page }) => {
    for (const vp of [
      { width: 390, height: 844 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(vp);
      await page.goto('/');
      await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
      await expect(page.locator('[data-desk]')).toHaveCount(0);
    }
  });
});

test.describe('the round workspace', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Bid, Play and Results never remount the table or the scores', async ({ page }) => {
    await page.goto('/');
    await openSeeded(page, seedGame(5, 'bidding', NAMES7), 'round');
    const mark = () =>
      page.evaluate(() => {
        const t = document.querySelector('[data-table="ws"]') as HTMLElement & { _id?: number };
        const s = document.querySelector('section[aria-label^="After round"]') as HTMLElement & {
          _id?: number;
        };
        t._id = 7;
        s._id = 7;
      });
    const same = () =>
      page.evaluate(() => {
        const t = document.querySelector('[data-table="ws"]') as HTMLElement & { _id?: number };
        const s = document.querySelector(
          'section[aria-label^="After round"], section[aria-label^="Projected"]',
        ) as HTMLElement & { _id?: number };
        return t?._id === 7 && s?._id === 7;
      });
    await mark();
    // Three bids to go: pick an allowed number for each and lock it in.
    for (let i = 0; i < 3; i++) {
      const group = page.getByRole('group', { name: /^Bid for / });
      const free = group.locator('[data-bid-key]:not([aria-disabled])').first();
      await page.keyboard.press((await free.getAttribute('data-bid-key'))!);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(350);
    }
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: /Enter results/ })).toBeVisible();
    expect(await same()).toBe(true);
    // E edits the bids, and only while playing.
    await page.keyboard.press('e');
    await expect(page.getByRole('button', { name: /Start playing/ })).toBeVisible();
    expect(await same()).toBe(true);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: /Enter results/ })).toBeVisible();
    // Keys are off while the outgoing pane animates out; under load that can outlast the button appearing.
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await expect(page.getByText('Who made their bid?')).toBeVisible();
    expect(await same()).toBe(true);
  });

  test('keyboard: pick, lock in, undo, shortcuts sheet, and a drawer that returns focus', async ({
    page,
  }) => {
    await page.goto('/');
    // The large-screen UI is its own chunk: wait for Home before typing.
    await expect(page.getByRole('button', { name: /Resume/ })).toBeVisible();
    await page.keyboard.press('Enter');
    const keys = page.getByRole('group', { name: 'Bid for Dev' });
    await expect(keys).toBeVisible();
    await page.keyboard.press('3');
    await expect(keys.getByRole('button', { name: 'Bid 3' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(keys.getByRole('button', { name: 'Bid 3' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Dev bid 3. Change it' })).toBeVisible();
    await page.keyboard.press('z');
    await expect(page.getByRole('button', { name: 'Dev bid 3. Change it' })).toHaveCount(0);

    await page.keyboard.press('?');
    await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const rules = page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'Rules' });
    await rules.focus();
    await page.keyboard.press('Enter');
    const drawer = page.getByRole('dialog', { name: 'Rules' });
    await expect(drawer).toBeVisible();
    // Tab stays inside the drawer.
    for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
    expect(await drawer.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
    await expect(rules).toBeFocused();
  });

  test('targets are at least 48px and focus is visible', async ({ page }) => {
    await page.goto('/');
    // The large-screen UI is its own chunk: wait for Home before typing.
    await expect(page.getByRole('button', { name: /Resume/ })).toBeVisible();
    await page.keyboard.press('Enter');
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('main button, nav button')]
        .filter((b) => b.offsetParent && !b.closest('[inert]'))
        .map((b) => ({ b, r: b.getBoundingClientRect() }))
        .filter(({ r }) => r.width < 47.5 || r.height < 47.5)
        .map(({ b }) => b.getAttribute('aria-label') || b.textContent?.trim()),
    );
    expect(small).toEqual([]);
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(
      () => getComputedStyle(document.activeElement as Element).outlineStyle,
    );
    expect(outline).not.toBe('none');
  });
});
