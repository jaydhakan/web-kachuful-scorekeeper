import { expect, test } from '@playwright/test';
import { signIn } from './backend';

test('Me shows my Sikke and level, and the wallet opens the ledger', async ({ page }) => {
  await signIn(page, 'admin');
  await page.waitForFunction(() => !!localStorage.getItem('kachuful.session'));
  await page.goto('/kachuful?open=account');
  await expect(page.getByRole('heading', { name: 'Me', exact: true })).toBeVisible();
  const wallet = page.getByRole('button', { name: /^[\d,]+ Sikke, .+\. Open the ledger$/ });
  await expect(wallet).toBeVisible();
  await wallet.click();
  const ledger = page.getByRole('dialog', { name: 'Sikke ledger' });
  await expect(ledger).toBeVisible();
  await expect(
    ledger
      .getByText('Finished a game')
      .first()
      .or(ledger.getByText(/No Sikke yet/)),
  ).toBeVisible();
});
