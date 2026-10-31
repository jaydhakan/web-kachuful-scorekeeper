import { expect, test } from '@playwright/test';
import { NAMES7, btn, toSetup3 } from './helpers';

test('the deal animation tells mouse users to click or press Space, and Space skips it', async ({
  page,
}) => {
  await page.goto('/');
  await toSetup3(page, NAMES7.slice(0, 4));
  await btn(page, 'Deal!').click();
  await expect(page.getByText('Click or press Space to skip')).toBeVisible();
  await expect(page.getByText('Tap to skip')).toBeHidden();
  await page.keyboard.press('Space');
  await expect(btn(page, 'Skip the deal animation')).toBeHidden();
});
