import { expect, test } from '@playwright/test';
import { ACCOUNTS, addPlayer, freshBackend, makeInvite, makeResetLink, signIn } from './backend';
import { btn } from './helpers';

// Accounts against the mock API, or a real backend with E2E_API=local (e2e/backend.ts).
freshBackend();
const uniq = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const path = (url: string) => url.replace(/^https?:\/\/[^/]+/, '');

test('a wrong password says so; the right one signs in and shows the account', async ({ page }) => {
  await signIn(page, { email: ACCOUNTS.admin.email, password: 'nope' });
  await expect(page.getByText("That email and password don't match.")).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill(ACCOUNTS.admin.password);
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Signed in as Jay')).toBeVisible();
  await btn(page, 'Account').click();
  await expect(page.getByText(/Signed in as admin@kachuful.test/i)).toBeVisible();
  await expect(btn(page, '🛡️ Admin')).toBeVisible();
});

test('admin invites someone, who opens the link, makes a player and sets a password', async ({
  page,
  browser,
}) => {
  const email = `${uniq()}@example.com`;
  const name = uniq().slice(0, 10);
  await signIn(page, 'admin');
  await btn(page, 'Account').click();
  await btn(page, '🛡️ Admin').click();
  await btn(page, '✉️ Invite someone').click();
  await page.getByLabel('Their email').fill(email);
  await btn(page, 'Create invite link').click();
  const url = path(await page.locator('code').innerText());

  const other = await browser.newPage();
  await other.goto(url);
  await expect(other.getByText(`Set up the account for ${email}.`)).toBeVisible();
  expect(new URL(other.url()).search).toBe('');
  await other.getByLabel('Password', { exact: true }).fill('a b');
  await expect(other.getByText('Use at least 3 characters and no spaces.')).toBeVisible();
  await other.getByLabel('Password', { exact: true }).fill('abc');
  await other.getByLabel('Password again').fill('abc');
  // A taken name is refused without saying whose it is.
  await other.getByLabel('Name at the table').fill('Kabir');
  await btn(other, 'Set password and start').click();
  await expect(other.getByText(/That name is taken/)).toBeVisible();
  await expect(other.getByText('Is this you?')).toBeHidden();
  await other.getByLabel('Name at the table').fill(name);
  await btn(other, 'Set password and start').click();
  await expect(other.getByText(`Signed in as ${name}`)).toBeVisible();
  // The link works once.
  await other.goto(url);
  await expect(other.getByText(/used or has expired/)).toBeVisible();
  await other.close();
});

test('a reset link sets a new password', async ({ page }) => {
  const email = `${uniq()}@example.com`;
  await page.goto(`/?invite=${await makeInvite(page, email)}`);
  await page.getByLabel('Name at the table').fill(uniq().slice(0, 10));
  await page.getByLabel('Password', { exact: true }).fill('first');
  await page.getByLabel('Password again').fill('first');
  await btn(page, 'Set password and start').click();
  // The account chip stays on screen; the toast saying so may be gone under load.
  await expect(page.getByLabel('Account', { exact: true })).toBeVisible();
  await page.goto(`/?reset=${await makeResetLink(page, email)}`);
  await page.getByLabel('Password', { exact: true }).fill('second');
  await page.getByLabel('Password again').fill('second');
  await btn(page, 'Choose a new password').click();
  await expect(page.getByText('Password changed')).toBeVisible();
});

test('signing out asks what to keep, then shows Sign in again', async ({ page }) => {
  await signIn(page, 'riya');
  await expect(page.getByText(/Signed in as/)).toBeVisible();
  await btn(page, 'Account').click();
  await btn(page, 'Sign out').click();
  await btn(page, 'Keep games on this phone').click();
  await expect(page.getByText('Signed out')).toBeVisible();
  await expect(page.getByLabel('Sign in', { exact: true })).toBeVisible();
});

test("an invite to a player's email offers that player, who claims their history", async ({
  page,
}) => {
  // A player Riya added, with an email and no account yet.
  const name = 'Ivy' + uniq().slice(-5);
  const email = `${name.toLowerCase()}@example.com`;
  await addPlayer('riya', name, email);
  await page.goto(`/?invite=${await makeInvite(page, email)}`);
  await expect(page.getByText('Is this you?')).toBeVisible();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  await btn(page, "Yes, that's me").click();
  await page.getByLabel('Password', { exact: true }).fill('ivy1');
  await page.getByLabel('Password again').fill('ivy1');
  await btn(page, 'Set password and start').click();
  await expect(page.getByText(`Signed in as ${name}`)).toBeVisible();
});

test('the admin list shows a pending invite, and a new link replaces it', async ({ page }) => {
  await signIn(page, 'admin');
  await btn(page, 'Account').click();
  await btn(page, '🛡️ Admin').click();
  // seed-demo leaves an invite for new.player@kachuful.test pending.
  const row = page.locator('li').filter({ hasText: 'new.player@kachuful.test' });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'New link' }).click();
  await expect(page.locator('code')).toContainText('?invite=');
});

test("the admin edits a player's email, and players who sat at one table are never merged", async ({
  page,
}) => {
  const email = `zoya.${uniq()}@kachuful.test`;
  await signIn(page, 'admin');
  await btn(page, 'Account').click();
  await btn(page, '🛡️ Admin').click();
  await page.getByRole('button', { name: 'Players', exact: true }).click();
  const zoya = page
    .locator('li')
    .filter({ hasText: /^.*Zoya/ })
    .first();
  await zoya.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Email').fill(email);
  await btn(page, 'Save').click();
  await expect(zoya).toContainText(email);
  // Zoya and Ishan have played together in the demo games.
  await zoya.getByRole('button', { name: 'Merge into…' }).click();
  await page.getByRole('button', { name: 'Ishan', exact: true }).click();
  await btn(page, 'Merge into').click();
  await expect(
    page.getByText('They played at the same table, so they are two people. Not merged.'),
  ).toBeVisible();
});
