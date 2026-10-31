import { expect, test } from '@playwright/test';
import { openSeeded, seedGame } from './fixtures';
import { btn } from './helpers';

// The phone project is touch at 390×844: sheets stay bottom sheets, as before the modal layouts existed.
test('on a phone the menu is a bottom sheet and the Scoreboard fills the height under the status bar', async ({
  page,
}) => {
  await page.goto('/');
  await openSeeded(page, seedGame(5, 'playing'), 'round');
  await btn(page, 'Menu').click();
  await page.waitForTimeout(700);
  let b = (await page.getByRole('dialog').boundingBox())!;
  expect(b.x).toBeCloseTo(0, 0);
  expect(b.width).toBeCloseTo(390, 0);
  expect(b.y + b.height).toBeCloseTo(844, 0);
  await expect(page.getByRole('dialog').locator('.cursor-grab')).toHaveCount(1);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await btn(page, 'Scoreboard').click();
  await page.waitForTimeout(700);
  b = (await page.getByRole('dialog').boundingBox())!;
  expect(b.width).toBeCloseTo(390, 0);
  expect(b.y).toBeCloseTo(36, 0);
  expect(b.y + b.height).toBeCloseTo(844, 0);
});

test('turning a tablet on its side keeps the open dialog and its state', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto('/');
  await openSeeded(page, seedGame(5, 'playing'), 'round');
  await btn(page, 'Menu').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.evaluate((el) => el.setAttribute('data-marker', 'same-node'));
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.waitForTimeout(300);
  await page.setViewportSize({ width: 820, height: 1180 });
  await expect(page.locator('[role="dialog"][data-marker="same-node"]')).toBeVisible();
});
