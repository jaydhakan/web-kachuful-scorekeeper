import { expect, test } from '@playwright/test';

// A narrow window with a mouse and keyboard gets the phone UI; the large-screen UI has large-screen.desktop.spec.
test.use({ viewport: { width: 740, height: 900 } });

test('mouse and trackpad devices get a thin scrollbar on every scroll region', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByRole('dialog').getByRole('region')).toHaveCSS('scrollbar-width', 'thin');
  await page.getByRole('button', { name: 'Close' }).last().click();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  const region = page.getByRole('region', { name: 'Content' });
  await expect(region).toHaveCSS('scrollbar-width', 'thin');
});
