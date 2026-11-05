import { test } from '@playwright/test';
import { ACCOUNTS, signIn } from '../../e2e/backend';

// Signed-in screens against the mock API (`npm run dev:mock`): Account, Admin users and Appearance, per theme.
const OUT = process.env.SHOT_DIR ?? 'screenshots/after';
test.use({
  viewport: { width: 360, height: 780 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
for (const theme of ['sunset-glass', 'yerba-sun', 'editorial-paper', 'emerald-gilt'])
  test(`signed in: ${theme}`, async ({ page, context }) => {
    await context.addInitScript((t) => localStorage.setItem('kf.theme', t), theme);
    await signIn(page, ACCOUNTS.admin);
    await page.getByRole('button', { name: 'Me', exact: true }).waitFor();
    await page.waitForTimeout(4500);
    const dir = `${OUT}/${theme}/p360`;
    await page.screenshot({ path: `${dir}/3-01-home-signed-in.png` });
    await page.getByRole('button', { name: 'Account' }).first().click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${dir}/3-11-account.png` });
    await page.getByRole('button', { name: 'Admin', exact: true }).first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${dir}/3-12-admin.png` });
    await page.getByRole('button', { name: 'Appearance' }).click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${dir}/3-15-admin-appearance.png`, fullPage: true });
  });
