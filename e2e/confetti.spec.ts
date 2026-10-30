import { expect, test } from '@playwright/test';
import { openSeeded, seedGame } from './fixtures';
import { btn } from './helpers';

// The suite runs with reduced motion, which skips confetti on purpose; this needs it on.
test.use({ reducedMotion: 'no-preference' });

test('the confetti canvas follows the viewport when it is resized mid-burst', async ({ page }) => {
  await page.goto('/');
  await openSeeded(page, seedGame(5, 'summary'), 'round');
  await btn(page, 'End game').click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'End game' }).click();
  const canvas = page.locator('canvas[aria-hidden]');
  await expect(canvas).toHaveCount(1);
  const fits = () =>
    page.evaluate(() => {
      const c = document.querySelector('canvas[aria-hidden]') as HTMLCanvasElement;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      return {
        w: c.width === Math.round(innerWidth * dpr),
        h: c.height === Math.round(innerHeight * dpr),
      };
    });
  expect(await fits()).toEqual({ w: true, h: true });
  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(fits).toEqual({ w: true, h: true });
  // It must still be drawing after the resize, not frozen or cleared for good.
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveCSS('pointer-events', 'none');
});
