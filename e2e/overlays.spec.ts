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
  test(`${w}×${h}: the toast sits in the top bar, between its buttons`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/');
    await openSeeded(page, seedGame(5, 'playing'), 'round');
    await btn(page, 'Menu').click();
    await page.getByRole('button', { name: /Undo last action/ }).click();
    const toast = page.getByRole('status').filter({ hasText: 'Nothing to undo' }).locator('> div');
    await expect(toast).toBeVisible();
    await page.waitForTimeout(500);
    const t = (await toast.boundingBox())!,
      menu = (await btn(page, 'Menu').boundingBox())!,
      // The open menu sheet has a Scoreboard button too; the top bar's comes first.
      board = (await btn(page, 'Scoreboard').first().boundingBox())!;
    expect(t.y, 'on screen').toBeGreaterThanOrEqual(0);
    expect(t.y + t.height, 'in the bar, not over the content').toBeLessThanOrEqual(
      menu.y + menu.height + 6,
    );
    expect(t.x, 'clear of the menu button').toBeGreaterThanOrEqual(menu.x + menu.width);
    expect(t.x + t.width, 'clear of the scoreboard button').toBeLessThanOrEqual(board.x);
  });
}
