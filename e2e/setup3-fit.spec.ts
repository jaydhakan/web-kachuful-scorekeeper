import { expect, test } from '@playwright/test';
import { LONG_NAMES } from './fixtures';
import { btn, NAMES7, toSetup3 } from './helpers';
import { fits, inView, toSetup1 } from './setup-helpers';

test.describe('setup 3 fits the screen', () => {
  test('360x640 with seven players does not scroll and Deal is visible', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await toSetup1(page, 7);
    await btn(page, '7 players').click();
    await btn(page, 'Next').click();
    const input = page.getByLabel('Player name');
    for (const name of LONG_NAMES) {
      await input.fill(name);
      await input.press('Enter');
    }
    await btn(page, 'Next').click();
    await page.waitForTimeout(500);
    expect(await fits(page)).toBe(true);
    expect(await inView(page, btn(page, 'Deal!'))).toBe(true);
    expect(await inView(page, page.getByRole('group', { name: 'Game length' }))).toBe(true);
  });

  test('game length is a labelled row that is visible without any tap', async ({ page }) => {
    await page.goto('/');
    await toSetup3(page, NAMES7.slice(0, 4));
    const group = page.getByRole('group', { name: 'Game length' });
    await expect(group).toBeVisible();
    await expect(group.getByRole('button')).toHaveCount(3);
    await group.getByRole('button', { name: /2 cycles/ }).click();
    await expect(group.getByRole('button', { name: /2 cycles/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('button', { name: /Game length/ })).toHaveCount(0);
  });

  test('on a scaled table the dealer moves by tap, seats swap by drag, Random spins', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/');
    await toSetup3(page, NAMES7);
    const table = page.locator('[data-table="su3"]');
    // Scaled down from the 340px design size.
    expect((await table.boundingBox())!.width).toBeLessThan(300);
    const names = () => table.locator('[data-seat-name]').allTextContents();
    const before = await names();

    await table.locator('[data-seat="3"]').click();
    await expect(table.locator('[data-seat="3"] [data-seat-chip]').first()).toBeVisible();

    const centre = async (k: number) => {
      const b = (await table.locator(`[data-seat="${k}"]`).boundingBox())!;
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    };
    const a = await centre(1),
      b = await centre(2);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.waitForTimeout(480);
    await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
    await page.mouse.move(b.x, b.y, { steps: 4 });
    await page.mouse.up();
    const after = await names();
    expect(after[1]).toBe(before[2]);
    expect(after[2]).toBe(before[1]);

    await btn(page, /Random/).click();
    await expect(page.locator('[data-table="su3"] .z-\\[6\\]')).toHaveCount(0, { timeout: 5000 });
    // The dealer chip (a pill with a label, or a bare icon on a crowded table); the first-player tag says 1st.
    await expect(table.locator('[data-seat-chip]').filter({ hasNotText: /1st/i })).toHaveCount(1);
  });
});
