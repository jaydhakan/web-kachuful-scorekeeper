import { expect, test, type Page } from '@playwright/test';
import { freshBackend, signIn as signInAs } from './backend';
import { btn } from './helpers';

// Signed in, boards and player pages read the seeded games (mock API, or a real backend with E2E_API=local).
freshBackend();
async function signIn(page: Page) {
  await signInAs(page, 'admin');
  await expect(page.getByText(/Signed in as/)).toBeVisible();
}

test('the global board ranks everyone, and a row opens the server player page', async ({
  page,
}) => {
  await signIn(page);
  await page
    .getByRole('button', { name: /Boards/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: '🌍 Global' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await btn(page, 'All time').click();
  const row = page.getByRole('button', { name: /^#1 / });
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.getByText(/of \d+ all time/)).toBeVisible();
  await expect(page.getByText('Accuracy by trump')).toBeVisible();
});

test('awards, seasons and the activity feed come from the server', async ({ page }) => {
  await signIn(page);
  await page
    .getByRole('button', { name: /Awards/ })
    .first()
    .click();
  await btn(page, '👑 Season').click();
  await expect(page.getByText('Standings')).toBeVisible();
  await expect(page.getByRole('button', { name: /^#1 / })).toBeVisible();
  await btn(page, '📰 Activity').click();
  await expect(page.getByRole('heading', { name: 'Activity' })).toBeVisible();
  await expect(page.getByText(/won a game|earned|joined/).first()).toBeVisible();
  // System Back walks back to Awards.
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Awards' })).toBeVisible();
});

test('a player page leads to head-to-head, and Wrapped comes from the server', async ({ page }) => {
  await signIn(page);
  await page
    .getByRole('button', { name: /Boards/ })
    .first()
    .click();
  await btn(page, 'All time').click();
  await page.getByRole('button', { name: /^#1 / }).click();
  const vs = page.getByRole('button', { name: /^Head to head: / }).first();
  await expect(vs).toBeVisible();
  await vs.click();
  await expect(page.getByText('Games together')).toBeVisible();
  await page.goto('/');
  await page
    .getByRole('button', { name: /Awards/ })
    .first()
    .click();
  await page.getByRole('button', { name: /Wrapped/ }).click();
  await expect(page.getByText(/You played \d+ rounds?/)).toBeVisible();
});
