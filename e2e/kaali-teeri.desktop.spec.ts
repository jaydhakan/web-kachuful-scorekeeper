import { expect, test } from '@playwright/test';
import { ktBtn, ktStart } from './kt-helpers';

test('a hand by keyboard on a large screen: seat, amount, trump, call, play and points', async ({
  page,
}) => {
  await page.goto('/kaali-teeri');
  await ktStart(page, ['Riya', 'Aarav', 'Meera', 'Kabir']);
  const title = page.getByRole('heading', { level: 1 }).first();
  // → twice: the third seat (Meera); 1 7 5 typed is 175; Enter confirms.
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.type('175');
  await expect(title).toHaveText('Meera · 175');
  await page.keyboard.press('Enter');
  await expect(title).toHaveText('Meera won at 175');
  await page.keyboard.press('h');
  await page.keyboard.press('Enter');
  await ktBtn(page, 'A').click();
  await ktBtn(page, 'Spades').click();
  await page.keyboard.press('Enter');
  // 1 opens "Who played it?" for the first called card.
  await expect(ktBtn(page, /^Hand over/)).toBeVisible();
  await page.keyboard.press('1');
  await page.getByRole('dialog').getByRole('button', { name: /Kabir/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await page.keyboard.type('60');
  await expect(page.getByText(/made/i).first()).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'After hand 1' })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(title).toContainText(/Who won|Pick/i);
  // Z undoes back into the summary of hand 1.
  await page.keyboard.press('z');
  await expect(page.getByRole('heading', { name: 'After hand 1' })).toBeVisible();
});
