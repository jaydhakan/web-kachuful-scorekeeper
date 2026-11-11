import { expect, test } from '@playwright/test';
import { LONG_NAMES_14, openSeeded, seedGame } from './fixtures';
import { btn, openAdvanced, startGame } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/kachuful');
  await btn(page, 'New Game').click();
});

test('setup defaults to one deck, which seats 3 to 7', async ({ page }) => {
  await openAdvanced(page);
  await expect(btn(page, '1 deck')).toHaveAttribute('aria-pressed', 'true');
  for (const n of [3, 4, 5, 6, 7]) await expect(btn(page, `${n} players`)).toBeVisible();
  await expect(btn(page, '8 players')).toHaveCount(0);
  await btn(page, '7 players').click();
  await expect(page.getByText('Max 7 cards')).toBeVisible();
});

test('two decks seat 8 to 14: 10 cards up to 10 players, then fewer', async ({ page }) => {
  await openAdvanced(page);
  await btn(page, '2 decks').click();
  await expect(btn(page, '2 decks')).toHaveAttribute('aria-pressed', 'true');
  for (const n of [8, 9, 10, 11, 12, 13, 14]) await expect(btn(page, `${n} players`)).toBeVisible();
  await expect(btn(page, '15 players')).toHaveCount(0);
  for (const [n, max] of [
    [7, 10],
    [10, 10],
    [11, 9],
    [12, 8],
    [14, 7],
  ]) {
    await btn(page, `${n} players`).click();
    await expect(page.getByText(`Max ${max} cards`)).toBeVisible();
  }
});

test('going back to one deck drops a count it cannot seat', async ({ page }) => {
  await openAdvanced(page);
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

test('a fourteen-player two-deck game starts and its Rules explain the decks', async ({ page }) => {
  await page.goto('/kachuful');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await startGame(page, LONG_NAMES_14);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('kachuful.v1')!));
  expect(saved).toMatchObject({ decks: 2, maxCards: 7, schemaVersion: 4 });
  expect(saved.players).toHaveLength(14);
  expect(new Set(saved.players.map((p: { color: string }) => p.color)).size).toBe(14);
  expect(new Set(saved.players.map((p: { emoji: string }) => p.emoji)).size).toBe(14);
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
    LONG_NAMES_14.slice(0, 9),
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
    LONG_NAMES_14.slice(0, 9),
  );
  await page.reload();
  await btn(page, 'New Game').click();
  await expect(btn(page, /Use last group/)).toHaveCount(0);
});
