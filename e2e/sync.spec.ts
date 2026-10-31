import { expect, test, type Page } from '@playwright/test';
import { openSeeded, seedGame } from './fixtures';
import { bidEveryone, btn, giveEmail } from './helpers';

// Signed-in play against the in-memory mock API (tools/mock-api).
const uniq = () => Math.random().toString(36).slice(2, 7);

async function signIn(page: Page, email = 'riya@example.com', password = 'riya') {
  if (!page.url().startsWith('http')) await page.goto('/');
  await btn(page, 'Sign in').click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText(/Signed in as/)).toBeVisible();
}

const syncIdOf = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('kachuful.v1')!).syncId as string);

async function seat(page: Page, names: string[]) {
  await btn(page, 'New Game').click();
  await btn(page, `${names.length} players`).click();
  await btn(page, 'Next').click();
  const input = page.getByLabel('Player name');
  for (const n of names) {
    await input.fill(n);
    await input.press('Enter');
    if (n === 'Kabir') {
      // Kabir is already on the server: same person?
      await expect(page.getByText('Is this the same Kabir?')).toBeVisible();
      await btn(page, 'Yes, same person').click();
    } else await giveEmail(page, n);
    await page.waitForTimeout(150);
  }
  await btn(page, 'Next').click();
  await expect(page.getByText('Signed in: this game counts on the global board.')).toBeVisible();
  await btn(page, 'Deal!').click();
  await btn(page, 'Skip the deal animation').click();
}

test('a game scored offline uploads when the connection comes back', async ({ page, context }) => {
  await signIn(page);
  await seat(page, ['Kabir', 'Ann' + uniq(), 'Bo' + uniq()]);
  await context.setOffline(true);
  await bidEveryone(page);
  const id = await syncIdOf(page);
  await page.waitForTimeout(2500);
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect
    .poll(async () => (await page.request.get(`/api/games/${id}`)).status(), { timeout: 15_000 })
    .toBe(200);
  const body = await (await page.request.get(`/api/games/${id}`)).json();
  expect(body.game.players.map((p: { name: string }) => p.name)).toContain('Kabir');
  expect(Object.keys(body.game.rounds[0].bids).length).toBeGreaterThan(0);
});

test('first sign-in offers to add the games already on this phone', async ({ page }) => {
  await page.goto('/');
  // A game scored here while signed out, with finished rounds.
  await openSeeded(
    page,
    seedGame(3, 'bidding', ['Xa' + uniq(), 'Ye' + uniq(), 'Zo' + uniq()]),
    'home',
  );
  await signIn(page);
  await expect(page.getByText(/on this phone\. Add them to your account\?/)).toBeVisible();
  await btn(page, 'Not now').click();
  await expect(page.getByText(/Add them to your account/)).toBeHidden();
});

test("an email that already belongs to a player asks whether it's the same person", async ({
  page,
}) => {
  await signIn(page);
  await btn(page, 'New Game').click();
  await btn(page, '3 players').click();
  await btn(page, 'Next').click();
  const input = page.getByLabel('Player name');
  const nick = 'Kb' + uniq();
  await input.fill(nick);
  await input.press('Enter');
  await giveEmail(page, nick, 'kabir@example.com');
  await expect(page.getByText("That email is Kabir's. Same person?")).toBeVisible();
  await btn(page, 'Yes, same person').click();
  await expect(page.getByText('1 of 3 seated')).toBeVisible();
  await expect(page.getByRole('button', { name: /Kabir/ }).first()).toBeVisible();
  // A bad email is caught before asking the server.
  const other = 'Zz' + uniq();
  await input.fill(other);
  await input.press('Enter');
  await giveEmail(page, other, 'not-an-email');
  await expect(page.getByText('That doesn’t look like an email.')).toBeVisible();
});
