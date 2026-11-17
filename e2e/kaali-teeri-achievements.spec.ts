import { expect, test } from '@playwright/test';
import { callCards, confirmHand, ktBtn, ktStart, playedBy, points, quickBid } from './kt-helpers';

const P4 = ['Riya', 'Aarav', 'Meera', 'Kabir'];

/** Meera bids the whole deck, holds the one card she calls and takes every point. */
async function sweep(page: import('@playwright/test').Page, n: number) {
  await quickBid(page, 'Meera', 250);
  await callCards(page, 'Clubs', [{ rank: 'A', suit: 'Spades' }]);
  await playedBy(page, /^Ace of spades/, 'Meera');
  await points(page, 0, { bid: 250 });
  await confirmHand(page, n);
}

/** The unlock card shows this achievement for Meera; a tap anywhere skips it. */
async function unlocked(page: import('@playwright/test').Page, what: string) {
  const card = page.locator('[data-unlock-card]');
  await expect(card.getByRole('status')).toContainText(`Meera unlocked ${what}`);
  await card.getByRole('button', { name: 'Skip' }).click();
  await expect(card.filter({ hasText: `Meera unlocked ${what}` })).toHaveCount(0);
}

// Signed out, the scorekeeper works its achievements out on the phone from the games it keeps.
test('a hand’s moments drop in once it is confirmed, the winner screen shows the reel, and Awards and Achievements list them', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto('/kaali-teeri');
  await ktStart(page, P4, { first1000: true });

  await sweep(page, 1);
  // The big ones are dealt first as the unlock card, one at a time (here still, under reduced motion); a tap skips.
  await unlocked(page, 'All In');
  await unlocked(page, 'Lone Wolf');

  for (let n = 2; n <= 4; n++) {
    await ktBtn(page, 'Next hand').click();
    await sweep(page, n);
  }
  // The last hand's moments go to the winner screen's reel, with the game's.
  const reel = page.getByRole('list', { name: 'Achievements' });
  await expect(reel.getByText('Thousandaire').first()).toBeVisible();

  await page.goto('/kaali-teeri');
  await ktBtn(page, 'Awards').click();
  await expect(page.getByRole('heading', { name: 'Awards' })).toBeVisible();
  await page
    .getByRole('button', { name: /Achievements/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'Hand moments' })).toBeVisible();
  await expect(page.getByText('Lone Wolf').first()).toBeVisible();
});

test.describe('with motion on', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('a big moment is dealt as the unlock card, turns, and leaves on its own', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto('/kaali-teeri');
    await ktStart(page, P4, { first1000: true });
    await sweep(page, 1);
    const card = page.locator('[data-unlock-card]');
    await expect(card.getByRole('status')).toContainText('Meera unlocked All In');
    await expect(card.locator('[data-unlock-face]')).toBeVisible();
    // Nothing waits on it: it has gone within its 2.5s ceiling, and the second one follows.
    await expect(card.getByRole('status')).toContainText('Meera unlocked Lone Wolf', {
      timeout: 4000,
    });
    await expect(card).toHaveCount(0, { timeout: 4000 });
  });
});
