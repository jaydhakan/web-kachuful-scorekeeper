import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { signIn } from './backend';

/** Signs Jay in on Kachuful and waits until the session is saved, so Kaali Teeri starts signed in. */
async function signedIn(page: Page) {
  await signIn(page, 'admin');
  await page.waitForFunction(() => !!localStorage.getItem('kachuful.session'));
}

// KT-F04: Kaali Teeri shows who is signed in and the sync state, and leads to the account or to sign-in.

test('signed out, Home offers Sign in, which opens Kachuful’s sign-in', async ({ page }) => {
  await page.goto('/kaali-teeri');
  const chip = page.getByRole('link', { name: 'Sign in', exact: true });
  await expect(chip).toBeVisible();
  await expect(page.getByRole('img', { name: /synced|syncing|waiting/i })).toHaveCount(0);
  await chip.click();
  await expect(page).toHaveURL(/\/kachuful/);
  await expect(page.getByLabel('Email')).toBeVisible();
});

test('signed in, Home shows the account with its sync mark', async ({ page }) => {
  await signedIn(page);
  await page.goto('/kaali-teeri');
  const chip = page.getByRole('link', { name: /^Me: / });
  await expect(chip).toBeVisible();
  await expect(chip).toContainText('Jay');
  await expect(chip.getByRole('img')).toHaveAttribute('aria-label', /.+/);
});

test.describe('large screen', () => {
  test.use({ viewport: { width: 1366, height: 768 } });
  test('the rail carries the account with its sync mark', async ({ page }) => {
    await signedIn(page);
    await page.goto('/kaali-teeri');
    const nav = page.getByRole('navigation').first();
    const item = nav.getByRole('button', { name: /\bMe$/ });
    await expect(item).toBeVisible();
    await expect(item.locator('[role="img"][title]')).toBeVisible();
    // The phone chip stays out of the desk, which has the rail.
    await expect(page.getByRole('link', { name: /^Me: / })).toBeHidden();
  });
});
