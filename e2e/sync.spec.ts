import { expect, test, type Page } from '@playwright/test';
import { addPlayer, freshBackend, signIn } from './backend';
import { openSeeded, seedGame } from './fixtures';
import { bidEveryone, btn, giveEmail } from './helpers';

// Signed-in play against the mock API, or a real backend with E2E_API=local (e2e/backend.ts).
freshBackend();
const uniq = () => Math.random().toString(36).slice(2, 7);

const syncIdOf = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('kachuful.v1')!).syncId as string);

async function newGameStep2(page: Page, n: number) {
  await btn(page, 'New Game').click();
  await btn(page, `${n} players`).click();
  await btn(page, 'Next').click();
}

const typeName = async (page: Page, n: string) => {
  const input = page.getByLabel('Player name');
  await input.fill(n);
  await input.press('Enter');
};

test('a game scored offline uploads when the connection comes back', async ({ page, context }) => {
  await signIn(page, 'riya');
  await expect(page.getByText(/Signed in as/)).toBeVisible();
  await newGameStep2(page, 3);
  // Kabir is in Riya's circle (she added him): seated straight away. Newcomers need an email.
  await typeName(page, 'Kabir');
  await expect(page.getByText('1 of 3 seated')).toBeVisible();
  for (const n of ['Ann' + uniq(), 'Bo' + uniq()]) {
    await typeName(page, n);
    await giveEmail(page, n);
    await page.waitForTimeout(150);
  }
  await btn(page, 'Next').click();
  await expect(page.getByText('Signed in: this game counts on the global board.')).toBeVisible();
  await btn(page, 'Deal!').click();
  await btn(page, 'Skip the deal animation').click();
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
  expect(body.game.syncId).toBe(id);
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
  await signIn(page, 'riya');
  await expect(page.getByText(/on this phone\. Add them to your account\?/)).toBeVisible();
  await btn(page, 'Not now').click();
  await expect(page.getByText(/Add them to your account/)).toBeHidden();
});

test('someone outside your circle: name and email together find them, and nothing less does', async ({
  page,
}) => {
  // Riya adds Pia; Kabir has never played with her, so she is not suggested to him.
  const pia = 'Pia' + uniq();
  const email = `${pia.toLowerCase()}@example.com`;
  await addPlayer('riya', pia, email);
  await signIn(page, 'kabir');
  await expect(page.getByText(/Signed in as/)).toBeVisible();
  await newGameStep2(page, 3);
  await expect(page.getByRole('group', { name: 'Recent names' }).getByText(pia)).toBeHidden();

  // Her name with another email: taken, and nothing about her is shown.
  await typeName(page, pia);
  await giveEmail(page, pia, `someone.${uniq()}@example.com`);
  await expect(page.getByText(`“${pia}” is someone else’s name. Pick another.`)).toBeVisible();
  await expect(page.getByText(`Is this ${pia}?`)).toBeHidden();
  // Another name with her email: taken too.
  await page.getByLabel('Player name').fill('');
  const other = 'Qu' + uniq();
  await typeName(page, other);
  await giveEmail(page, other, email);
  await expect(
    page.getByText('That email belongs to another player. Check it and try again.'),
  ).toBeVisible();
  // Both: that's her.
  await typeName(page, pia);
  await giveEmail(page, pia, email);
  await expect(page.getByText(`Is this ${pia}?`)).toBeVisible();
  await btn(page, 'Yes, same person').click();
  await expect(page.getByText('1 of 3 seated')).toBeVisible();
  // A bad email is caught before asking the server.
  const zz = 'Zz' + uniq();
  await typeName(page, zz);
  await giveEmail(page, zz, 'not-an-email');
  await expect(page.getByText('That doesn’t look like an email.')).toBeVisible();
});
