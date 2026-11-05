import { expect, test } from '@playwright/test';
import { NAMES7, btn, openAdvanced, startGame } from './helpers';

const firstCards = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const g = JSON.parse(localStorage.getItem('kachuful.v1') ?? 'null');
    return { order: g?.order, cards: g?.rounds?.[0]?.cards };
  });

test('round order: up first by default, down first from Advanced with the table’s own max', async ({
  page,
}) => {
  await page.goto('/');
  await startGame(page, NAMES7.slice(0, 6), async (step) => {
    if (step !== 'setup 1') return;
    await openAdvanced(page);
    // Six players, one deck: max 8.
    await expect(btn(page, '3 → 8 → 3')).toHaveAttribute('aria-pressed', 'true');
    await btn(page, '8 → 3 → 8').click();
    await expect(page.getByText('Max 8 cards · 8 → 3 → 8, repeating')).toBeVisible();
    await expect(btn(page, /^Advanced/)).toContainText('Down first');
  });
  await expect.poll(() => firstCards(page)).toEqual({ order: 'down', cards: 8 });
});

test('round order: a game left on the default goes up first', async ({ page }) => {
  await page.goto('/');
  await startGame(page, NAMES7.slice(0, 4));
  await expect.poll(() => firstCards(page)).toEqual({ order: 'up', cards: 3 });
});
