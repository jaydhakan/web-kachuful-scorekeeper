import { expect, test } from '@playwright/test';
import { openSeeded, seedGame } from './fixtures';
import { btn } from './helpers';

// "Last game of the night" (REWARDS-PLAN §7.1): the rematch toggle, the Final game deal and the long ceremony.

async function endSeeded(page: import('@playwright/test').Page, lastOfNight = false) {
  await page.goto('/kachuful');
  const g = seedGame(5, 'summary');
  await openSeeded(page, lastOfNight ? { ...g, lastOfNight: true } : g, 'round');
  await btn(page, 'End game').click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'End game' }).click();
}

test('the toggle on the winner screen makes the rematch the Final game', async ({ page }) => {
  await endSeeded(page);
  await expect(page.locator('[data-final-ceremony]')).toHaveCount(0);
  const last = page.getByRole('switch', { name: /Last game of the night/ });
  await expect(last).toHaveAttribute('aria-checked', 'false');
  await last.click();
  await expect(last).toHaveAttribute('aria-checked', 'true');
  await btn(page, 'Rematch').click();
  await expect(page.getByRole('status').filter({ hasText: 'Final game' })).toBeAttached();
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('kachuful.v1') ?? '{}').lastOfNight),
    )
    .toBe(true);
});

test('the last game of the night ends on the ceremony, and End the night opens the night', async ({
  page,
}) => {
  await endSeeded(page, true);
  const stage = page.locator('[data-final-ceremony]');
  await expect(stage).toBeVisible();
  await expect(stage.getByRole('heading')).toContainText(/the night/);
  await stage.getByRole('button', { name: 'End the night' }).click();
  await expect(page.getByRole('heading', { name: 'Tonight’s Wrapped' })).toBeVisible();
});
