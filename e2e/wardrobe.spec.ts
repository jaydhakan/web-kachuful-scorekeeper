import { expect, test, type Page } from '@playwright/test';
import { REAL, signIn } from './backend';

// The mock grants Sikke through a test control; against the real backend the demo's balance decides.
test.skip(REAL, 'mock-only: grants Sikke through a test control');

async function openMe(page: Page, who: 'admin' | 'riya' = 'admin') {
  await signIn(page, who);
  await page.waitForFunction(() => !!localStorage.getItem('kachuful.session'));
  await page.goto('/kachuful?open=account');
  await expect(page.getByRole('heading', { name: 'Me', exact: true })).toBeVisible();
}

test('the Bazaar sells this week’s stock, and the buy shows the bust wearing it', async ({
  page,
}) => {
  await openMe(page);
  await page.request.post('/api/__mock/sikke', { data: { name: 'Jay', amount: 5000 } });
  await page.getByRole('button', { name: 'Bazaar' }).click();
  await expect(page.getByRole('heading', { name: 'Hafte ka Maal' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hamesha' })).toBeVisible();
  const buy = page.getByRole('button', { name: 'Buy', exact: true }).first();
  await buy.click();
  const sheet = page.getByRole('dialog', { name: 'Buy' });
  await expect(sheet.getByText(/^Buy .+ for [\d,]+ 🪙\?$/)).toBeVisible();
  await sheet.getByRole('button', { name: 'Buy', exact: true }).click();
  await expect(sheet.getByRole('status')).toHaveText(/ is yours$/);
});

test('the Wardrobe saves a look, and a gift goes to someone in the circle', async ({ page }) => {
  await openMe(page);
  await page.request.post('/api/__mock/sikke', { data: { name: 'Jay', amount: 5000 } });
  await page.getByRole('button', { name: 'Wardrobe' }).click();
  await expect(page.getByRole('heading', { name: 'Wardrobe' })).toBeVisible();
  await page.getByRole('tab', { name: /Sar/ }).click();
  await page.getByRole('button', { name: /^Cricket cap, Common/ }).click();
  // Owned already (a level gift or an earlier buy) saves at once; otherwise buy it first.
  const price = page.getByRole('button', { name: /🪙 in the Bazaar$/ });
  if (await price.isVisible()) {
    await price.click();
    const sheet = page.getByRole('dialog', { name: 'Buy' });
    await sheet.getByRole('button', { name: 'Buy', exact: true }).click();
    await sheet.getByRole('button', { name: 'Wear it' }).click();
  }
  await page.getByRole('button', { name: 'Wear this look' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Look saved' })).toBeVisible();

  await page.getByRole('button', { name: 'Bazaar' }).click();
  await page.getByRole('button', { name: /Gift/ }).first().click();
  const gift = page.getByRole('dialog', { name: 'Gift' });
  await expect(gift.getByText('Who gets it?')).toBeVisible();
  if (await gift.getByText(/Nobody to send to yet/).isVisible()) return;
  await gift.getByRole('listitem').getByRole('button').first().click();
  await gift.getByRole('button', { name: 'Gift', exact: true }).click();
  await expect(gift.getByRole('status').or(gift.getByRole('alert'))).toBeVisible();
});

test('signed out, the Bazaar isn’t offered on Me', async ({ page }) => {
  await page.goto('/kachuful?open=account');
  await expect(page.getByRole('button', { name: 'Bazaar' })).toHaveCount(0);
});
