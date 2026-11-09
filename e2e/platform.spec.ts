import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { seedGame } from './fixtures';

const heading = (page: Page) => page.getByRole('heading', { level: 1, name: 'Pick a game' });

test('landing → Kachuful in place → system Back returns to the landing page', async ({ page }) => {
  await page.goto('/');
  await expect(heading(page)).toBeVisible();
  // A marker on window survives only if the move happens without a reload.
  await page.evaluate(() => ((window as unknown as { stay: number }).stay = 1));
  await page.getByRole('link', { name: /^Kachuful.*Play$/ }).click();
  await expect(page).toHaveURL(/\/kachuful$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Kachuful' })).toBeFocused();
  expect(await page.evaluate(() => (window as unknown as { stay?: number }).stay)).toBe(1);
  await page.goBack();
  await expect(heading(page)).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('Kachuful’s menu leads back to all games', async ({ page }) => {
  await page.goto('/kachuful');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^All games/ })
    .click();
  await expect(heading(page)).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('a cold deep link to /kachuful opens the game, not the landing page', async ({ page }) => {
  await page.goto('/kachuful');
  await expect(page.getByRole('heading', { level: 1, name: 'Kachuful' })).toBeVisible();
  await expect(heading(page)).toHaveCount(0);
});

test('an old /?live= link still opens in Kachuful', async ({ page }) => {
  await page.goto('/?live=nope0000000000000000000');
  await expect(page).toHaveURL(/\/kachuful/);
  await expect(page.getByText('No live game at this link')).toBeVisible();
});

test('a game in progress gets a resume row, and coming soon is not a control', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(
    (g) => {
      localStorage.setItem('kachuful.v1', JSON.stringify(g));
    },
    seedGame(4, 'bidding'),
  );
  await page.reload();
  const resume = page.getByRole('link', { name: 'Resume Kachuful' });
  await expect(resume).toBeVisible();
  await expect(page.getByText(/saved \d+ min ago/)).toBeVisible();
  await expect(page.getByRole('article', { name: 'Ishaara, coming soon' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Ishaara/ })).toHaveCount(0);
  await resume.click();
  await expect(page).toHaveURL(/\/kachuful$/);
});

for (const theme of ['sunset-glass', 'yerba-sun', 'editorial-paper', 'emerald-gilt']) {
  test(`${theme}: the landing page passes axe and every control is at least 44px`, async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate((t) => localStorage.setItem('kf.theme', t), theme);
    await page.reload();
    await expect(heading(page)).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const r = await new AxeBuilder({ page }).analyze();
    const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(bad.map((v) => `${v.id}: ${v.nodes[0].target.join(' ')}`)).toEqual([]);
    for (const el of await page.locator('a, button').all()) {
      const b = await el.boundingBox();
      if (b) expect(Math.min(b.width, b.height), await el.innerText()).toBeGreaterThanOrEqual(44);
    }
  });
}
