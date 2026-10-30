import { expect, test, type Page } from '@playwright/test';
import { openSeeded, seedGame } from './fixtures';
import { btn } from './helpers';

// 1280×800 with a mouse and keyboard: from tablet width a sheet is a centred modal or a side panel.
const VW = 1280,
  VH = 800,
  RULES = 'How to play';

async function open(page: Page, n = 7) {
  await page.goto('/');
  await openSeeded(page, seedGame(n, 'playing'), 'round');
  await expect(btn(page, 'Menu')).toBeVisible();
}
const dialog = (page: Page) => page.getByRole('dialog');
const box = async (page: Page) => (await dialog(page).boundingBox())!;

test('the menu is a centred modal, not a bottom sheet', async ({ page }) => {
  await open(page);
  await btn(page, 'Menu').click();
  const b = await box(page);
  expect(b.width).toBeCloseTo(448, 0);
  expect(b.x + b.width / 2).toBeCloseTo(VW / 2, 0);
  expect(b.y + b.height / 2).toBeCloseTo(VH / 2, -1);
  expect(b.y + b.height).toBeLessThan(VH - 16);
  // There is no drag handle to grab with a mouse.
  await expect(dialog(page).locator('.h-\\[5px\\]')).toBeHidden();
});

test('Rules is a right-hand panel the full height of the window', async ({ page }) => {
  await open(page);
  await btn(page, 'Menu').click();
  await page.getByRole('button', { name: /Rules/ }).click();
  await expect(dialog(page).locator('h2').first()).toHaveText(RULES);
  await page.waitForTimeout(700);
  const b = await box(page);
  expect(b.width).toBeCloseTo(448, 0);
  expect(b.x + b.width).toBeCloseTo(VW, 0);
  expect(b.y).toBeCloseTo(0, 0);
  expect(b.height).toBeCloseTo(VH, 0);
});

test('the Scoreboard is a wide centred modal', async ({ page }) => {
  await open(page);
  await btn(page, 'Scoreboard').click();
  await page.waitForTimeout(700);
  const b = await box(page);
  expect(b.width).toBeCloseTo(Math.min(VW * 0.92, 1024), 0);
  expect(b.x + b.width / 2).toBeCloseTo(VW / 2, 0);
  expect(b.height).toBeLessThanOrEqual(VH * 0.86 + 1);
});

for (const name of ['Menu', 'Scoreboard']) {
  test(`${name}: Esc and a click outside close it and focus returns to the opener`, async ({
    page,
  }) => {
    await open(page);
    const opener = btn(page, name);
    await opener.focus();
    await opener.click();
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toHaveCount(0);
    await expect(opener).toBeFocused();

    await opener.click();
    await expect(dialog(page)).toBeVisible();
    await page.mouse.click(8, 8);
    await expect(dialog(page)).toHaveCount(0);
    await expect(opener).toBeFocused();
  });

  test(`${name}: Tab stays inside the dialog in both directions`, async ({ page }) => {
    await open(page);
    await btn(page, name).click();
    await expect(dialog(page)).toBeVisible();
    const inside = () => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      expect(await inside()).toBe(true);
    }
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Shift+Tab');
      expect(await inside()).toBe(true);
    }
  });
}

test('a panel opened from the menu replaces it and Esc still returns to the first opener', async ({
  page,
}) => {
  await open(page);
  const menu = btn(page, 'Menu');
  await menu.focus();
  await menu.click();
  await page.getByRole('button', { name: /Rules/ }).click();
  await expect(dialog(page).locator('h2').first()).toHaveText(RULES);
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  await expect(menu).toBeFocused();
});
