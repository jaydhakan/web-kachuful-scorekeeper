import { expect, test } from '@playwright/test';
import { openSeeded, seedGame } from './fixtures';
import { btn } from './helpers';

/** A game just ended, on its winner screen. */
async function endGame(page: import('@playwright/test').Page) {
  await page.goto('/kachuful');
  await openSeeded(page, seedGame(5, 'summary'), 'round');
  await btn(page, 'End game').click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'End game' }).click();
}

test.describe('with motion on', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the winner’s podium lands its light on first place and drops the crown on the winner', async ({
    page,
  }) => {
    await endGame(page);
    const podium = page.locator('[data-steps]');
    await expect(podium.locator('[data-spotlight]')).toHaveCount(1);
    // One crown per winner (this seed ends in a tie for first); each drops in once its winner has landed.
    const crowns = podium.locator('[data-crown]');
    await expect(crowns).toHaveCount(2);
    for (const c of await crowns.all())
      await expect(c).toHaveCSS('opacity', '1', { timeout: 6000 });
    // The reveal never blocks the screen: the buttons work while it plays.
    await expect(btn(page, 'Rematch')).toBeEnabled();
  });
});

test('under reduced motion the crown and the light are simply there', async ({ page }) => {
  await endGame(page);
  const podium = page.locator('[data-steps]');
  await expect(podium.locator('[data-crown]')).toHaveCount(2);
  for (const c of await podium.locator('[data-crown]').all())
    await expect(c).toHaveCSS('opacity', '1');
  await expect(podium.locator('[data-spotlight]')).toBeVisible();
});
