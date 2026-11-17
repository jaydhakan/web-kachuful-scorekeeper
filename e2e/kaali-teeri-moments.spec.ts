import { expect, test, type Page } from '@playwright/test';
import { callCards, ktStart, playedBy, quickBid } from './kt-helpers';

const P4 = ['Riya', 'Aarav', 'Meera', 'Kabir'];

/** Meera wins the auction and calls one card; Kabir turns out to hold it: the hand's last (and only) partner. */
async function lastPartner(page: Page) {
  await page.goto('/kaali-teeri');
  await ktStart(page, P4);
  await quickBid(page, 'Meera', 180);
  // The auction closing stamps SOLD over the bid (K2).
  await expect(page.locator('[data-kt-sold]')).toHaveText(/sold/i);
  await callCards(page, 'Hearts', [{ rank: 'A', suit: 'Spades' }]);
  await playedBy(page, /^Ace of spades/, 'Kabir');
}

test('the last partner is spotlit, still under reduced motion, and leaves on its own', async ({
  page,
}) => {
  await lastPartner(page);
  const spot = page.locator('[data-seat-spotlight]');
  await expect(spot.getByRole('status')).toContainText('Kabir is with Meera!');
  await expect(spot).toHaveCount(0, { timeout: 4000 });
});

test.describe('with motion on', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the light travels to the last partner, never blocking the scorer', async ({ page }) => {
    await lastPartner(page);
    const spot = page.locator('[data-seat-spotlight]');
    await expect(spot.getByRole('status')).toContainText('Kabir is with Meera!');
    await expect(spot).toHaveCSS('pointer-events', 'none');
    await expect(spot).toHaveCount(0, { timeout: 4000 });
  });
});
