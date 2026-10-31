import { expect, test } from '@playwright/test';
import { btn } from './helpers';
import { fits, inView, toSetup1 } from './setup-helpers';

test.describe('setup 1 fits the screen', () => {
  test('360x640 with seven players and a saved group does not scroll', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await toSetup1(page, 7);
    await btn(page, '7 players').click();
    await page.waitForTimeout(500);
    expect(await fits(page)).toBe(true);
    expect(await inView(page, btn(page, 'Next'))).toBe(true);
  });

  test('320x568: the last-group chip wraps instead of being clipped', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await toSetup1(page, 7);
    const chip = page.getByRole('button', { name: /Use last group/ });
    expect(await inView(page, chip)).toBe(true);
    expect(await chip.evaluate((el) => el.scrollWidth > el.clientWidth + 1)).toBe(false);
    // The text takes two lines or more: the names are not cut to fit one.
    const lines = await chip.evaluate((el) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return r.getClientRects().length;
    });
    expect(lines).toBeGreaterThan(1);
  });

  test('a laptop gets the whole setup on one page, with the table beside the controls', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.getByRole('button', { name: /New game/ }).click();
    await btn(page, '5 players').click();
    await page.waitForTimeout(500);
    const t = (await page.locator('[data-table="dsu"]').boundingBox())!;
    const pills = (await btn(page, '5 players').boundingBox())!;
    expect(t.x).toBeGreaterThan(pills.x + pills.width);
    await expect(page.getByLabel('Seat 1 name')).toBeVisible();
    expect(await inView(page, btn(page, 'Deal!'))).toBe(true);
  });
});
