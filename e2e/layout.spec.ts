import { expect, test } from '@playwright/test';
import { btn } from './helpers';

test('controls clear the status bar and home indicator of a notched phone', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--sat', '47px');
    document.documentElement.style.setProperty('--sab', '34px');
  });
  const vh = page.viewportSize()!.height;
  const newGame = (await btn(page, 'New Game').boundingBox())!;
  expect(newGame.y + newGame.height).toBeLessThanOrEqual(vh - 34);
  await page.getByText(/Resume game|Try the demo/).click();
  await page.waitForTimeout(600);
  const menu = (await btn(page, 'Menu').boundingBox())!;
  expect(menu.y).toBeGreaterThanOrEqual(47);
  const bar = (await page.getByRole('button', { name: /bids in|Start playing/ }).boundingBox())!;
  expect(bar.y + bar.height).toBeLessThanOrEqual(vh - 34);
  await btn(page, 'Scoreboard').click();
  await page.waitForTimeout(600);
  const sheet = (await page.getByRole('dialog').boundingBox())!;
  expect(sheet.y).toBeGreaterThanOrEqual(47);
});
