import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('desk: Spades home puts the hero beside the cards and passes axe', async ({ page }) => {
  await page.goto('/spades');
  const h1 = page.getByRole('heading', { level: 1, name: 'Spades' });
  const online = page.getByRole('heading', { level: 2, name: 'Play online' });
  await expect(h1).toBeVisible();
  const [a, b] = [(await h1.boundingBox())!, (await online.boundingBox())!];
  expect(a.x + a.width).toBeLessThan(b.x);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
  const r = await new AxeBuilder({ page }).analyze();
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${v.id}: ${v.nodes[0].target.join(' ')}`)).toEqual([]);
  // The rules open as a side panel with room to read.
  await page.getByRole('button', { name: 'Rules' }).click();
  await expect(page.getByRole('dialog', { name: 'How to play Spades' })).toBeVisible();
});
