import { expect, test, type Page } from '@playwright/test';
import { btn } from './helpers';

// Live and recap links against the in-memory mock API (tools/mock-api).
const uniq = () => Math.random().toString(36).slice(2, 7);

async function signedInGame(page: Page) {
  await page.goto('/');
  await btn(page, 'Sign in').click();
  await page.getByLabel('Email').fill('riya@example.com');
  await page.getByLabel('Password', { exact: true }).fill('riya');
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText(/Signed in as/)).toBeVisible();
  await btn(page, 'New Game').click();
  await btn(page, '3 players').click();
  await btn(page, 'Next').click();
  for (const n of ['Lu' + uniq(), 'Mo' + uniq(), 'Ny' + uniq()]) {
    await page.getByLabel('Player name').fill(n);
    await page.getByLabel('Player name').press('Enter');
    await page.waitForTimeout(150);
  }
  await btn(page, 'Next').click();
  await btn(page, 'Deal!').click();
  await btn(page, 'Skip the deal animation').click();
  await btn(page, 'Bid 1').click();
  // Wait for the game to reach the server.
  const id = await page.evaluate(
    () => JSON.parse(localStorage.getItem('kachuful.v1')!).syncId as string,
  );
  await expect
    .poll(async () => (await page.request.get(`/api/games/${id}`)).status(), { timeout: 15_000 })
    .toBe(200);
}

test('a live link follows the table on another phone until it is turned off', async ({
  page,
  browser,
}) => {
  await signedInGame(page);
  await btn(page, 'Menu').click();
  await btn(page, 'Links').click();
  const live = page.locator('section[aria-label="Links"] .glass').filter({ hasText: 'Live link' });
  await live.getByRole('button', { name: 'Make link' }).click();
  await expect(page.getByRole('img', { name: 'QR code for the Live link' })).toBeVisible();
  const url = await live.locator('code').innerText();

  const viewer = await browser.newPage();
  await viewer.goto(url.replace(/^https?:\/\/[^/]+/, ''));
  await expect(viewer.getByRole('heading', { name: 'Live table' })).toBeVisible();
  await expect(viewer.getByText('bid 1')).toBeVisible();
  // The scorer bids again; the viewer sees it without reloading.
  await page.keyboard.press('Escape');
  await btn(page, 'Bid 1').click();
  await expect.poll(async () => viewer.getByText('bid 1').count(), { timeout: 15_000 }).toBe(2);
  await btn(page, 'Menu').click();
  await btn(page, 'Links').click();
  await live.getByRole('button', { name: 'Turn off' }).click();
  await expect(viewer.getByText('This live link was turned off')).toBeVisible();
  await viewer.close();
});

test('a recap link opens the game for anyone, signed out', async ({ page, browser }) => {
  await signedInGame(page);
  await btn(page, 'Menu').click();
  await btn(page, 'Links').click();
  const recap = page
    .locator('section[aria-label="Links"] .glass')
    .filter({ hasText: 'Recap link' });
  await recap.getByRole('button', { name: 'Make link' }).click();
  const url = await recap.locator('code').innerText();
  const viewer = await browser.newPage();
  await viewer.goto(url.replace(/^https?:\/\/[^/]+/, ''));
  await expect(viewer.getByText('Game recap')).toBeVisible();
  await expect(viewer.getByText('Standings')).toBeVisible();
  await btn(viewer, 'Open Kachuful').click();
  await expect(viewer.getByLabel('Sign in', { exact: true })).toBeVisible();
  await viewer.close();
});
