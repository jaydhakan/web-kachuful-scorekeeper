import { expect, test, type Page } from '@playwright/test';
import { ACCOUNTS, addPlayer, freshBackend, makeInvite, makeResetLink, signIn } from './backend';
import { btn } from './helpers';

// Accounts against the mock API, or a real backend with E2E_API=local (e2e/backend.ts).
freshBackend();
/** A tab of the Admin page; scoped, as Home's own Players tile can still be on screen while the page slides in. */
const adminTab = (page: Page, name: string) =>
  page
    .getByRole('group', { name: 'Admin section' })
    .getByRole('button', { name, exact: true })
    .click();

const uniq = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const path = (url: string) => url.replace(/^https?:\/\/[^/]+/, '');

test('a wrong password says so; the right one signs in and shows the account', async ({ page }) => {
  await signIn(page, { email: ACCOUNTS.admin.email, password: 'nope' });
  await expect(page.getByText("That email and password don't match.")).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill(ACCOUNTS.admin.password);
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
  await expect(btn(page, 'Me')).toContainText('Jay');
  await btn(page, 'Me').click();
  await expect(page.getByRole('heading', { name: 'Me' })).toBeVisible();
  await expect(page.getByText(/admin@kachuful\.test/)).toBeVisible();
  await expect(btn(page, 'Admin')).toBeVisible();
});

test('admin invites someone, who opens the link, makes a player and sets a password', async ({
  page,
  browser,
}) => {
  const email = `${uniq()}@example.com`;
  const name = uniq().slice(0, 10);
  await signIn(page, 'admin');
  await btn(page, 'Me').click();
  await btn(page, 'Admin').click();
  await adminTab(page, 'People');
  await btn(page, 'Invite someone').click();
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
  await expect(btn(other, 'Me')).toContainText(name);
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
  await expect(page.getByLabel('Me', { exact: true })).toBeVisible();
  await page.goto(`/?reset=${await makeResetLink(page, email)}`);
  await page.getByLabel('Password', { exact: true }).fill('second');
  await page.getByLabel('Password again').fill('second');
  await btn(page, 'Choose a new password').click();
  await expect(page.getByText('Password changed')).toBeVisible();
});

test('signing out asks what to keep, then shows Sign in again', async ({ page }) => {
  await signIn(page, 'riya');
  await expect(btn(page, 'Me')).toBeVisible();
  await btn(page, 'Me').click();
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
  await expect(btn(page, 'Me')).toContainText(name);
});

test('the admin list shows a pending invite, and a new link replaces it', async ({ page }) => {
  await signIn(page, 'admin');
  await btn(page, 'Me').click();
  await btn(page, 'Admin').click();
  await adminTab(page, 'People');
  // seed-demo leaves an invite for new.player@kachuful.test pending; the row opens its actions.
  const row = page.getByRole('button', { name: /new\.player@kachuful\.test/ });
  await expect(row).toBeVisible();
  await row.click();
  await btn(page, 'New link').click();
  await expect(page.locator('code')).toContainText('?invite=');
});

test("the admin edits a player's email, and players who sat at one table are never merged", async ({
  page,
}) => {
  const email = `zoya.${uniq()}@kachuful.test`;
  await signIn(page, 'admin');
  await btn(page, 'Me').click();
  await btn(page, 'Admin').click();
  await adminTab(page, 'Players');
  const zoya = page.getByRole('button', { name: /^Open Zoya/ }).first();
  await zoya.click();
  await page.getByRole('dialog').getByLabel('Email', { exact: true }).fill(email);
  await btn(page, 'Save').click();
  await expect(zoya).toContainText(email);
  // Zoya and Ishan have played together in the demo games.
  await zoya.click();
  await btn(page, 'Merge with another player…').click();
  await page.getByRole('button', { name: 'Ishan', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Main name' })).toBeVisible();
  await btn(page, 'Merge').click();
  await expect(
    page.getByText('They played at the same table, so they are two people. Not merged.'),
  ).toBeVisible();
});

test('the admin opens on what needs attention, and compares a likely duplicate side by side', async ({
  page,
}) => {
  const base = 'Lena' + uniq().slice(-4);
  await addPlayer('riya', base, `${base.toLowerCase()}@example.com`);
  await addPlayer('kabir', base + 'a', `${base.toLowerCase()}a@example.com`);
  await signIn(page, 'admin');
  await btn(page, 'Me').click();
  await btn(page, 'Admin').click();
  await expect(page.getByRole('heading', { name: 'Needs attention' })).toBeVisible();
  // Either order: the real backend sorts the pair its own way.
  const pair = page.getByRole('button', {
    name: new RegExp(`(${base} and ${base}a|${base}a and ${base}) might be one person`),
  });
  await pair.click();
  // Keep the second name; the first becomes one of theirs.
  await page
    .getByRole('group', { name: 'Main name' })
    .getByRole('button', { name: `Keep Main name: ${base}a` })
    .click();
  await expect(
    page.getByText(`One player, ${base}a, with 0 games. ${base} becomes another name for them.`),
  ).toBeVisible();
  await btn(page, 'Merge').click();
  await expect(page.getByText('Players merged')).toBeVisible();
  await adminTab(page, 'Players');
  await page.getByLabel('Search names and emails').fill(base);
  await expect(page.getByRole('button', { name: new RegExp(`^Open ${base}a`) })).toContainText(
    `also ${base}`,
  );
});
