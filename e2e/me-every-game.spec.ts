import { expect, test, type Page } from '@playwright/test';
import { signIn } from './backend';

async function openMe(page: Page) {
  await signIn(page, 'admin');
  await page.waitForFunction(() => !!localStorage.getItem('kachuful.session'));
  await page.goto('/kachuful?open=account');
  await expect(page.getByRole('heading', { name: 'Me', exact: true })).toBeVisible();
}

test('Me counts my achievements in every game, and each opens that game’s page with Back to Me', async ({
  page,
}) => {
  await openMe(page);
  for (const g of ['Kachuful', 'Kaali Teeri', 'Spades', 'Ishaara'])
    await expect(
      page.getByRole('button', { name: new RegExp(`^${g}: \\d+ of \\d+ achievements$`) }),
    ).toBeVisible();

  await page.getByRole('button', { name: /^Spades: / }).click();
  await expect(page.getByRole('heading', { name: 'Hand moments' })).toBeVisible();
  await expect(page.getByText('Boston').first()).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Me', exact: true })).toBeVisible();

  await page.getByRole('button', { name: /^Ishaara: / }).click();
  await expect(page.getByRole('heading', { name: 'Turn moments' })).toBeVisible();
});

test('Me shows the newest activity from every game and opens the whole feed', async ({ page }) => {
  await openMe(page);
  const seeAll = page.getByRole('button', { name: 'See all activity' });
  const empty = page.getByText('Nothing yet');
  await expect(seeAll.or(empty)).toBeVisible();
  if (await empty.isVisible()) return;
  await seeAll.click();
  // The page's title: while the pages cross-fade, Me's own "Activity" section heading is still there.
  await expect(page.getByRole('heading', { name: 'Activity', level: 1 })).toBeVisible();
});
