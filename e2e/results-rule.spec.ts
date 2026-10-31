import { expect, test, type Page } from '@playwright/test';
import { openSeeded, seedGame } from './fixtures';
import { btn } from './helpers';

// A round has as many tricks as cards, and Made means exactly the bid: the Made bids can never add up to more.
// Five cards, five players, bids 4, 2, 2, 2 and 1 (the players are in bidding order, so the order is fixed).
async function fiveCardResults(page: Page) {
  const g = seedGame(5, 'results');
  const r = g.rounds[g.rounds.length - 1];
  r.cards = 5;
  r.bids = { p0: 4, p1: 2, p2: 2, p3: 2, p4: 1 };
  r.results = {};
  await page.goto('/');
  await openSeeded(page, g, 'round');
  await left(page, 5);
}
/** The prominent card above the list: how many of the 5 tricks no Made bid has claimed. */
const left = (page: Page, n: number) =>
  expect(
    page.getByRole('status').filter({ hasText: new RegExp(`Tricks left\\s*${n} of 5`) }),
  ).toBeVisible();
const made = (page: Page, name: string) =>
  page.getByRole('group', { name: `Result for ${name}` }).getByRole('button', { name: /Made/ });
const missed = (page: Page, name: string) =>
  page.getByRole('group', { name: `Result for ${name}` }).getByRole('button', { name: /Missed/ });

test('a Made that no longer fits in the tricks left is greyed out with the reason', async ({
  page,
}) => {
  await fiveCardResults(page);
  await made(page, 'Bartholomew Jr').click(); // bid 4
  await left(page, 1);

  // Bid 2 needs two tricks and only one is left; the row says so and the button is not offered.
  await expect(made(page, 'Maximilian Ray')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByText('Only 1 trick left').first()).toBeVisible();
  await made(page, 'Maximilian Ray').click({ force: true });
  await expect(made(page, 'Maximilian Ray')).toHaveAttribute('aria-pressed', 'false');

  // Missed is always possible, and the 1-bidder can still make it as the last trick.
  await expect(missed(page, 'Maximilian Ray')).not.toHaveAttribute('aria-disabled', 'true');
  await expect(made(page, 'Guadalupe Mora')).not.toHaveAttribute('aria-disabled', 'true');
});

test('the bid-1 player can take the last trick, and the round then confirms', async ({ page }) => {
  await fiveCardResults(page);
  await made(page, 'Bartholomew Jr').click();
  // The seeded names run in order; the fifth player (bid 1) is Guadalupe Mora.
  await made(page, 'Guadalupe Mora').click();
  await left(page, 0);
  for (const name of ['Maximilian Ray', 'Annapurna Devi', 'Christopher Lo'])
    await missed(page, name).click();
  await expect(btn(page, 'Confirm round')).toBeEnabled();
  await btn(page, 'Confirm round').click();
  await expect(page.getByText('After Round 8').first()).toBeVisible();
});

test('changing a mark frees the tricks again', async ({ page }) => {
  await fiveCardResults(page);
  await made(page, 'Bartholomew Jr').click();
  await expect(made(page, 'Maximilian Ray')).toHaveAttribute('aria-disabled', 'true');
  await missed(page, 'Bartholomew Jr').click();
  await left(page, 5);
  await expect(made(page, 'Maximilian Ray')).not.toHaveAttribute('aria-disabled', 'true');
});

test('the last player is filled in when only one result is possible, and says so', async ({
  page,
}) => {
  await fiveCardResults(page);
  await made(page, 'Bartholomew Jr').click(); // 4
  await made(page, 'Guadalupe Mora').click(); // 1: all five tricks are claimed
  await missed(page, 'Maximilian Ray').click();
  await missed(page, 'Annapurna Devi').click();
  // Christopher Lo bid 2 and nothing is left, so Missed is the only result; it is set without a tap.
  await expect(missed(page, 'Christopher Lo')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Only option')).toBeVisible();
  await expect(btn(page, 'Confirm round')).toBeEnabled();
});

test('nothing is filled in while either result would work', async ({ page }) => {
  await fiveCardResults(page);
  await made(page, 'Bartholomew Jr').click();
  for (const name of ['Maximilian Ray', 'Annapurna Devi', 'Christopher Lo'])
    await missed(page, name).click();
  // Guadalupe Mora (bid 1) can still be Made or Missed, so it is left for the user.
  await expect(made(page, 'Guadalupe Mora')).toHaveAttribute('aria-pressed', 'false');
  await expect(missed(page, 'Guadalupe Mora')).toHaveAttribute('aria-pressed', 'false');
  await expect(btn(page, 'Confirm round')).toBeDisabled();
});
