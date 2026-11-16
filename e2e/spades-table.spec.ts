import { expect, test, type Page } from '@playwright/test';

// The last four seated on this device, read at setup (never the game itself, which the app writes on every change).
const GROUP = {
  players: [
    { name: 'Riya', emoji: '🐯', color: '#60a5fa' },
    { name: 'Arjun', emoji: '🦊', color: '#ff8a65' },
    { name: 'Dev', emoji: '🐵', color: '#f87171' },
    { name: 'Meera', emoji: '🦉', color: '#2dd4bf' },
  ],
  direction: 'cw',
  rules: { target: 200, timerSec: null, nil: true, blindNil: false, minTeamBid: null, mercy: null },
  at: 1,
};

async function setUp(page: Page) {
  await page.addInitScript((g) => {
    if (!localStorage.getItem('spades.lastGroup'))
      localStorage.setItem('spades.lastGroup', JSON.stringify(g));
  }, GROUP);
  await page.goto('/spades?keep');
  await tap(page, /Same four as last time/);
}

const start = async (page: Page) => {
  await tap(page, 'Next');
  await tap(page, 'Start the game');
};

/** Bids by name in bidding order. */
async function bid(page: Page, bids: [string, string][]) {
  for (const [who, v] of bids)
    await page
      .getByRole('group', { name: `Bid for ${who}` })
      .getByRole('button', { name: v, exact: true })
      .click();
}

async function tricks(page: Page, teamA: number) {
  await tap(page, 'Play the hand');
  await page
    .getByRole('group', { name: 'Tricks taken by Team A' })
    .getByRole('button', { name: `${teamA} tricks` })
    .click();
  await tap(page, 'Save hand');
}

/** Clicks the one control by that role and name, once a screen fading out has left. */
async function tap(page: Page, name: string | RegExp) {
  const el = page.getByRole('button', { name, exact: typeof name === 'string' });
  await expect(el).toHaveCount(1);
  await el.click();
}

async function noSideScroll(page: Page) {
  const w = page.viewportSize()!.width;
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
}

test('a whole game to 200 on a phone: bids, tricks, the summary and the winner', async ({
  page,
}) => {
  await setUp(page);
  await start(page);
  // Riya deals: Arjun, Dev, Meera and Riya bid in turn. Team A (Riya, Dev) bids 12 and takes all 13.
  await bid(page, [
    ['Arjun', '1'],
    ['Dev', '6'],
    ['Meera', '1'],
    ['Riya', '6'],
  ]);
  await noSideScroll(page);
  await tricks(page, 13);
  const a = page.getByRole('region', { name: 'Team A' });
  await expect(a.getByText('+121')).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Team B' }).getByText('SET', { exact: true }),
  ).toBeVisible();
  await noSideScroll(page);
  await tap(page, /Next hand/);
  // Arjun deals: Dev, Meera, Riya, Arjun.
  await bid(page, [
    ['Dev', '6'],
    ['Meera', '1'],
    ['Riya', '6'],
    ['Arjun', '1'],
  ]);
  await tricks(page, 13);
  await expect(page.getByText('Team A win the game!')).toBeVisible();
  await tap(page, 'See the winner');
  await expect(page.getByRole('heading', { name: 'Riya & Dev win!' })).toBeVisible();
  // The summary's own 242 fades out behind the winner screen.
  await expect(page.getByRole('definition').filter({ hasText: /^242$/ })).toHaveCount(1);
  await noSideScroll(page);
  // It is in History as a finished game.
  await page.goto('/spades?keep&page=history');
  await expect(page.getByRole('button', { name: /Riya & Dev won 242–/ })).toBeVisible();
});

test('an Endless game ends when the scorer taps End game', async ({ page }) => {
  await setUp(page);
  await tap(page, /^Rules: .*Edit rules$/);
  await tap(page, 'Endless');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /^Rules: Endless/ })).toBeVisible();
  await start(page);
  await expect(page.getByText(/endless game/)).toBeVisible();
  await bid(page, [
    ['Arjun', '3'],
    ['Dev', '4'],
    ['Meera', '3'],
    ['Riya', '4'],
  ]);
  await tricks(page, 9);
  await expect(page.getByText(/Endless game: End game in the menu/)).toBeVisible();
  await tap(page, 'Menu');
  await tap(page, 'End game');
  await page.getByRole('alertdialog').getByRole('button', { name: 'End game' }).click();
  await expect(page.getByRole('heading', { name: 'Riya & Dev win!' })).toBeVisible();
  await expect(page.getByText('Ended by the scorer · 1 hand')).toBeVisible();
});

test('a cancelled game shows in History as Cancelled', async ({ page }) => {
  await setUp(page);
  await start(page);
  await bid(page, [
    ['Arjun', '3'],
    ['Dev', '3'],
    ['Meera', '3'],
    ['Riya', '3'],
  ]);
  await tricks(page, 6);
  await tap(page, /Next hand/);
  await tap(page, 'Menu');
  await tap(page, 'Cancel game');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel game' }).click();
  await expect(page.getByText(/shows in History as Cancelled/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
  await page.goto('/spades?keep&page=history');
  const row = page.getByRole('button', { name: /Cancelled at/ });
  await expect(row).toBeVisible();
  await expect(row.getByText('Cancelled', { exact: true })).toBeVisible();
  await row.click();
  await expect(page.getByRole('heading', { name: 'Game recap' })).toBeVisible();
});
