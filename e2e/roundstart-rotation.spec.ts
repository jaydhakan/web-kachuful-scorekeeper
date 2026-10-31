import { expect, test } from '@playwright/test';
import { NAMES7, btn, toSetup3 } from './helpers';

const SKIP = 'Skip the deal animation';

test.describe('deal animation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await toSetup3(page, NAMES7.slice(0, 5));
    await btn(page, 'Deal!').click();
  });

  test('keeps running and completes when the device is rotated mid-deal', async ({ page }) => {
    const overlay = btn(page, SKIP);
    await expect(overlay).toBeVisible();
    // A marker that survives only if the overlay is never remounted.
    await overlay.evaluate((el) => el.setAttribute('data-marker', 'kept'));

    await page.setViewportSize({ width: 844, height: 390 });
    await expect(overlay).toHaveAttribute('data-marker', 'kept');
    const table = page.locator('[data-table="rs"]');
    await expect(table).toBeVisible();
    const box = await table.boundingBox();
    expect(box && box.x + box.width <= 844 && box.y + box.height <= 390).toBe(true);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(overlay).toHaveAttribute('data-marker', 'kept');

    // The timers were never reset: the deal finishes by itself and the round screen shows.
    await expect(overlay).toBeHidden({ timeout: 6000 });
    await expect(page.getByRole('button', { name: /^(Bid|Locked) \d+$/ }).first()).toBeVisible();
  });

  test('shows the touch hint on touch devices and skips with Space', async ({ page }) => {
    await expect(page.getByText('Tap to skip')).toBeVisible();
    await expect(page.getByText('Click or press Space to skip')).toBeHidden();
    await page.keyboard.press('Space');
    await expect(btn(page, SKIP)).toBeHidden();
  });
});
