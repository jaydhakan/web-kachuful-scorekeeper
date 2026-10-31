import { expect, test } from '@playwright/test';
import { openSeeded, seedGame } from './fixtures';
import { btn } from './helpers';

// The phone UI's layouts; the large-screen UI places these in large-screen.desktop.spec.
const VIEWPORTS = [
  [390, 844],
  [320, 568],
  [844, 390],
  [568, 320],
  [740, 900],
] as const;

for (const [w, h] of VIEWPORTS) {
  test(`${w}×${h}: the toast sits just above the bar and over its width`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/');
    await openSeeded(page, seedGame(5, 'playing'), 'round');
    await btn(page, 'Menu').click();
    await page.getByRole('button', { name: /Undo last action/ }).click();
    const toast = page.getByRole('status').filter({ hasText: 'Nothing to undo' }).locator('> div');
    await expect(toast).toBeVisible();
    await page.waitForTimeout(500);
    const t = (await toast.boundingBox())!,
      bar = (await page.locator('.chrome-bot').boundingBox())!,
      primary = (await btn(page, 'Enter results').boundingBox())!;
    expect(t.y + t.height, 'clear of the primary action').toBeLessThanOrEqual(primary.y);
    expect(t.y + t.height, 'close above the bar, not floating away').toBeGreaterThan(bar.y - 40);
    // Over the bar's own width: the controls pane in two panes, the column otherwise.
    expect(t.x).toBeGreaterThanOrEqual(bar.x - 1);
    expect(t.x + t.width).toBeLessThanOrEqual(bar.x + bar.width + 1);
  });
}
