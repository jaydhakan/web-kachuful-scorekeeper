import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('desk: the landing page lays games out in a row and passes axe', async ({ page }) => {
  await page.goto('/');
  const cards = page.getByRole('list').last().getByRole('listitem');
  await expect(cards).toHaveCount(3);
  const [a, b] = [await cards.nth(0).boundingBox(), await cards.nth(1).boundingBox()];
  expect(a!.y).toBe(b!.y);
  const r = await new AxeBuilder({ page }).analyze();
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${v.id}: ${v.nodes[0].target.join(' ')}`)).toEqual([]);
});

test('desk: the rail’s Baithak mark leads back to all games', async ({ page }) => {
  await page.goto('/kachuful');
  await page.getByRole('navigation').getByRole('button', { name: 'All games' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Pick a game' })).toBeFocused();
  await expect(page).toHaveURL(/\/$/);
});
