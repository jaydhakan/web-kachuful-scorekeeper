import { expect, test, type Page } from '@playwright/test';
import { btn } from './helpers';

// Runs against the in-memory mock API that the e2e server serves (tools/mock-api).
const ADMIN = { email: 'jaydhakan11@gmail.com', password: 'kachuful' };
const uniq = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/');
  await btn(page, 'Sign in').click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
}

const mock = (page: Page, path: string, data: unknown) =>
  page.request.post(`/api/__mock/${path}`, { data }).then((r) => r.json());

test('a wrong password says so; the right one signs in and shows the account', async ({ page }) => {
  await signIn(page, ADMIN.email, 'nope');
  await expect(page.getByText("That email and password don't match.")).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill(ADMIN.password);
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Signed in as Jay')).toBeVisible();
  await btn(page, 'Account').click();
  await expect(page.getByText(/Signed in as jaydhakan11@gmail.com/i)).toBeVisible();
  await expect(btn(page, '🛡️ Admin')).toBeVisible();
});

test('admin invites someone, who opens the link, makes a player and sets a password', async ({
  page,
  browser,
}) => {
  const email = `${uniq()}@example.com`;
  const name = uniq().slice(0, 10);
  await signIn(page, ADMIN.email, ADMIN.password);
  await btn(page, 'Account').click();
  await btn(page, '🛡️ Admin').click();
  await btn(page, '✉️ Invite someone').click();
  await page.getByLabel('Their email').fill(email);
  await btn(page, 'Create invite link').click();
  const url = (await page.locator('code').innerText()).replace('https://play.vectanix.com', '');

  const other = await browser.newPage();
  await other.goto(url);
  await expect(other.getByText(`Set up the account for ${email}.`)).toBeVisible();
  expect(new URL(other.url()).search).toBe('');
  await other.getByLabel('Password', { exact: true }).fill('a b');
  await expect(other.getByText('Use at least 3 characters and no spaces.')).toBeVisible();
  await other.getByLabel('Password', { exact: true }).fill('abc');
  await other.getByLabel('Password again').fill('abc');
  // A taken name comes back from the server as the same-person question.
  await other.getByLabel('Name at the table').fill('Kabir');
  await btn(other, 'Set password and start').click();
  await expect(other.getByText('Is this you?')).toBeVisible();
  await btn(other, "No, I'm someone else").click();
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
  const { token } = await mock(page, 'invite', { email });
  await page.goto(`/?invite=${token}`);
  await page.getByLabel('Name at the table').fill(uniq().slice(0, 10));
  await page.getByLabel('Password', { exact: true }).fill('first');
  await page.getByLabel('Password again').fill('first');
  await btn(page, 'Set password and start').click();
  await expect(page.getByText(/Signed in as/)).toBeVisible();
  const r = await mock(page, 'reset-link', { email });
  await page.goto(`/?reset=${r.token}`);
  await page.getByLabel('Password', { exact: true }).fill('second');
  await page.getByLabel('Password again').fill('second');
  await btn(page, 'Choose a new password').click();
  await expect(page.getByText('Password changed')).toBeVisible();
});

test('signing out asks what to keep, then shows Sign in again', async ({ page }) => {
  await signIn(page, 'riya@example.com', 'riya');
  await btn(page, 'Account').click();
  await btn(page, 'Sign out').click();
  await btn(page, 'Keep games on this phone').click();
  await expect(page.getByText('Signed out')).toBeVisible();
  await expect(page.getByLabel('Sign in', { exact: true })).toBeVisible();
});
