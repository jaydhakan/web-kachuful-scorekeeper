import { expect, test } from '@playwright/test';
import { LONG_NAMES_10, openSeeded, seedGame } from './fixtures';
import { btn, startGame } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await btn(page, 'New Game').click();
});

test('setup asks for the decks first: one deck seats 3 to 7', async ({ page }) => {
  await expect(btn(page, '1 deck')).toHaveAttribute('aria-pressed', 'true');
  for (const n of [3, 4, 5, 6, 7]) await expect(btn(page, `${n} players`)).toBeVisible();
  await expect(btn(page, '8 players')).toHaveCount(0);
  await btn(page, '7 players').click();
  await expect(page.getByText('Max 7 cards')).toBeVisible();
});

test('two decks seat 8 to 10 and keep 10 cards up to 10 players', async ({ page }) => {
  await btn(page, '2 decks').click();
  await expect(btn(page, '2 decks')).toHaveAttribute('aria-pressed', 'true');
  for (const n of [8, 9, 10]) await expect(btn(page, `${n} players`)).toBeVisible();
  await btn(page, '7 players').click();
  await expect(page.getByText('Max 10 cards')).toBeVisible();
  await btn(page, '10 players').click();
  await expect(page.getByText('Max 10 cards')).toBeVisible();
});

test('going back to one deck drops a count it cannot seat', async ({ page }) => {
  await btn(page, '2 decks').click();
  await btn(page, '9 players').click();
  await btn(page, '1 deck').click();
  await expect(btn(page, '9 players')).toHaveCount(0);
  await expect(btn(page, 'Next')).toBeDisabled();
  // A count both can seat stays picked.
  await btn(page, '5 players').click();
  await btn(page, '2 decks').click();
  await expect(btn(page, '5 players')).toHaveAttribute('aria-pressed', 'true');
});

test('a ten-player two-deck game starts and its Rules explain the decks', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await startGame(page, LONG_NAMES_10);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('kachuful.v1')!));
  expect(saved).toMatchObject({ decks: 2, maxCards: 10, schemaVersion: 2 });
  expect(saved.players).toHaveLength(10);
  await btn(page, 'Menu').click();
  await btn(page, 'Rules').click();
  await expect(page.getByText(/With two decks, two identical cards/)).toBeVisible();
});

test('a saved group of nine reopens as a two-deck game, and is hidden for one deck', async ({
  page,
}) => {
  await openSeeded(page, seedGame(9, 'bidding'), 'home');
  await page.evaluate(
    (names) => {
      localStorage.setItem(
        'kachuful.lastGroup',
        JSON.stringify({ names, emojis: [], colors: [], direction: 'cw', decks: 2 }),
      );
    },
    LONG_NAMES_10.slice(0, 9),
  );
  await page.reload();
  await btn(page, 'New Game').click();
  await btn(page, /Use last group/).click();
  await expect(btn(page, 'Deal!')).toBeVisible();
  // The same nine without a deck count is an old save: one deck cannot seat them.
  await page.evaluate(
    (names) => {
      localStorage.setItem(
        'kachuful.lastGroup',
        JSON.stringify({ names, emojis: [], colors: [], direction: 'cw' }),
      );
    },
    LONG_NAMES_10.slice(0, 9),
  );
  await page.reload();
  await btn(page, 'New Game').click();
  await expect(btn(page, /Use last group/)).toHaveCount(0);
});
