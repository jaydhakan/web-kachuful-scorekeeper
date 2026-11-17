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

// Signed out, the scorekeeper works its achievements out on the phone from the games it keeps.
test('a hand’s moments drop in once it is confirmed, the winner screen shows the reel, and Awards and Achievements list them', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto('/kaali-teeri');
  await ktStart(page, P4, { first1000: true });

  await sweep(page, 1);
  // The big ones first, one card each.
  await expect(page.getByText('Meera · All In')).toBeVisible();
  await expect(page.getByText('Meera · Lone Wolf')).toBeVisible();

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
