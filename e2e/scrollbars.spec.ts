import { expect, test } from '@playwright/test';

test('touch devices keep their scrollbars hidden', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByRole('dialog').getByRole('region')).toHaveCSS('scrollbar-width', 'none');
  await page.getByRole('button', { name: 'Close' }).last().click();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Content' })).toHaveCSS('scrollbar-width', 'none');
});
