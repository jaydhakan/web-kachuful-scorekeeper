import { expect, test, type Page } from '@playwright/test';
import { bidOrder, curRound } from '@/domain';
import { openSeeded, seedGame } from './fixtures';

const PHONE = { width: 390, height: 844 },
  SIDE = { width: 844, height: 390 };

/** What a bidder sees: every bid bubble, who is bidding, which pill is pressed, which marked nodes survive. */
const snapshot = (page: Page) =>
  page.evaluate(() => {
    const group = document.querySelector('[role="group"][aria-label^="Bid for"]')!;
    return {
      bubbles: [...document.querySelectorAll('[data-table="bid"] [data-seat-bid]')]
        .map((el) => el.textContent)
        .join(','),
      bidder: group.getAttribute('aria-label'),
      pressed: [...group.querySelectorAll('[aria-pressed="true"]')].map((el) =>
        el.getAttribute('aria-label'),
      ),
      markers: ['table', 'group', 'card'].filter((k) =>
        document.querySelector(`[data-mark="${k}"]`),
      ),
    };
  });

test('rotating mid-bidding keeps the bids, the bidder and the selected pill, and remounts nothing', async ({
  page,
}) => {
  await page.setViewportSize(PHONE);
  await page.goto('/');
  const game = seedGame(5, 'bidding');
  // The second bidder has already picked 1, so a pill is selected for the bidder on screen.
  game.ui.bidIdx = 1;
  const r = curRound(game);
  expect(game.players[bidOrder(game, r)[1]].id in r.bids).toBe(true);
  await openSeeded(page, game, 'round');
  await expect(page.getByRole('group', { name: /^Bid for/ })).toBeVisible();
  await page.waitForTimeout(500);

  // Nodes marked now must be the very same nodes after every rotation.
  await page.evaluate(() => {
    document.querySelector('[data-table="bid"]')!.setAttribute('data-mark', 'table');
    document
      .querySelector('[role="group"][aria-label^="Bid for"]')!
      .setAttribute('data-mark', 'group');
    document
      .querySelector('[data-table="bid"]')!
      .closest('.glass')!
      .setAttribute('data-mark', 'card');
  });
  const before = await snapshot(page);
  expect(before.pressed).toEqual(['Bid 1']);
  expect(before.markers).toEqual(['table', 'group', 'card']);

  for (const size of [SIDE, PHONE, SIDE, PHONE]) {
    await page.setViewportSize(size);
    await page.waitForTimeout(450);
    expect(await snapshot(page), `${size.width}×${size.height}`).toEqual(before);
  }
});
