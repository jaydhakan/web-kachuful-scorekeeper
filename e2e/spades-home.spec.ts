import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { signIn } from './backend';

const home = (page: Page) => page.getByRole('heading', { level: 1, name: 'Spades' });

async function axeAndTargets(page: Page) {
  const r = await new AxeBuilder({ page }).analyze();
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${v.id}: ${v.nodes[0].target.join(' ')}`)).toEqual([]);
  for (const el of await page.locator('main a, main button, header button').all()) {
    const b = await el.boundingBox();
    if (b) expect(Math.min(b.width, b.height), await el.innerText()).toBeGreaterThanOrEqual(44);
  }
}

test('the landing tile opens Spades in place; its back button returns to all games', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => ((window as unknown as { stay: number }).stay = 1));
  await page.getByRole('link', { name: /^Spades.*Online or at the table.*Play$/ }).click();
  await expect(page).toHaveURL(/\/spades$/);
  await expect(home(page)).toBeFocused();
  expect(await page.evaluate(() => (window as unknown as { stay?: number }).stay)).toBe(1);
  await page.getByRole('button', { name: 'All games' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Pick a game' })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('signed out, Play online asks for sign-in and the scorekeeper still opens', async ({
  page,
}) => {
  await page.goto('/spades');
  await expect(home(page)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in to play online' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start a table' })).toHaveCount(0);
  // No horizontal scroll at 390 wide.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await axeAndTargets(page);
  await page.getByRole('button', { name: 'Open the scorekeeper' }).click();
  await expect(page).toHaveURL(/\/spades\?keep$/);
  await page.goBack();
  await expect(home(page)).toBeVisible();
});

test('a join link opened signed out comes back to its table after sign-in', async ({ page }) => {
  // The mock is shared: other specs' invites to Riya must not put a banner over this one.
  await page.route('**/api/me/events', (r) => r.abort());
  await page.goto('/spades?join=kq7m');
  const link = page.getByRole('link', { name: 'Sign in to join table KQ7M' });
  await expect(link).toBeVisible();
  await link.click();
  await page.getByLabel('Email').fill('riya@kachuful.test');
  await page.getByLabel('Password', { exact: true }).fill('riya-demo');
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/spades\?join=KQ7M$/);
  await expect(page.getByRole('heading', { name: 'Online tables are coming' })).toBeVisible();
});

test('signed in: join with a code, the rules sheet, and Back closes each sheet', async ({
  page,
}) => {
  await signIn(page, 'riya');
  await expect(page.getByRole('button', { name: 'Me' }).first()).toBeVisible();
  await page.goto('/spades');
  await page.getByRole('button', { name: 'Join with code' }).click();
  const sheet = page.getByRole('dialog', { name: 'Join a table' });
  const field = sheet.getByLabel('Table code');
  await expect(field).toBeFocused();
  await page.keyboard.type('kq0');
  await expect(sheet.getByText('0 is never in a table code.')).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Join table' })).toBeDisabled();
  // System Back closes the sheet and stays on Home.
  await page.goBack();
  await expect(sheet).toHaveCount(0);
  await expect(page).toHaveURL(/\/spades$/);
  await page.getByRole('button', { name: 'Join with code' }).click();
  await page.keyboard.type('zx9p');
  await expect(field).toHaveValue('ZX9P');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/spades\?join=ZX9P$/);
  await expect(page.getByRole('heading', { name: 'Online tables are coming' })).toBeVisible();
  await page.goBack();
  await expect(home(page)).toBeVisible();

  await page.getByRole('button', { name: 'Rules' }).click();
  const rules = page.getByRole('dialog', { name: 'How to play Spades' });
  await expect(rules.getByRole('heading', { name: 'What “spades broken” means' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(rules).toHaveCount(0);
});
