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
  test(`${w}×${h}: the round banner stays under the header and clear of the bar`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/');
    // The seeded summary leads into the peak round, which announces itself with a banner.
    await openSeeded(page, seedGame(5, 'summary'), 'round');
    await btn(page, 'Next round').click();
    await btn(page, 'Skip the deal animation').click();
    const banner = page.locator('[data-main-anchor] > div');
    await expect(banner).toBeVisible();
    await page.waitForTimeout(500);
    const b = (await banner.boundingBox())!,
      bar = (await page.locator('.chrome-bot').boundingBox())!;
    expect(b.y).toBeGreaterThan(40);
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(w);
    // The bar is under the controls pane in two panes, so only an actual overlap is wrong.
    const apart =
      b.x + b.width <= bar.x ||
      bar.x + bar.width <= b.x ||
      b.y + b.height <= bar.y ||
      bar.y + bar.height <= b.y;
    expect(apart, 'banner and bar do not overlap').toBe(true);
    // In two panes the bar is under the controls pane on the right, and the banner stays over the main pane.
    if (bar.x > w / 4)
      expect(b.x + b.width, 'banner stays in the main pane').toBeLessThanOrEqual(bar.x + 1);
  });
}
