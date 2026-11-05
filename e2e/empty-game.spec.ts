import { expect, test } from '@playwright/test';
import { bidEveryone, btn, startGame } from './helpers';

// A game with no round done leaves no trace: ending it discards it, and History never lists it.
test('ending a game before any round is confirmed discards it', async ({ page }) => {
  await page.goto('/');
  await startGame(page, ['Aarav', 'Riya', 'Kabir', 'Meera']);
  await bidEveryone(page);
  await btn(page, 'Menu').click();
  await btn(page, 'End game').click();
  await expect(page.getByText('No rounds were played. Discard this game?')).toBeVisible();
  await btn(page, 'Discard game').click();
  await expect(btn(page, 'New Game')).toBeVisible();
  // Home shows the demo again, not a finished game with nobody scoring.
  await expect(page.getByText('Game finished')).toHaveCount(0);

  await page.reload();
  await page
    .getByRole('button', { name: /History/ })
    .first()
    .click();
  await expect(page.getByText('No games yet')).toBeVisible();
});
