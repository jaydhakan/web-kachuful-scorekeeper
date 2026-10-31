import { expect, test, type Page } from '@playwright/test';
import { openSeeded, seedGame } from './fixtures';
import { btn } from './helpers';

// 1280×800 with a mouse and keyboard: the large-screen UI. Sheets are centred modals, Rules and Upcoming are drawers,
// and the Scoreboard is a screen over the game.
const VW = 1280,
  VH = 800,
  RULES = 'Rules';

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

test('Rules is a right-hand drawer the full height of the window', async ({ page }) => {
  await open(page);
  await btn(page, 'Menu').click();
  await dialog(page).getByRole('button', { name: /Rules/ }).click();
  await expect(dialog(page).locator('h2').first()).toHaveText(RULES);
  await page.waitForTimeout(700);
  const b = await box(page);
  expect(b.width).toBeCloseTo(520, 0);
  expect(b.x + b.width).toBeCloseTo(VW, 0);
  expect(b.y).toBeCloseTo(0, 0);
  expect(b.height).toBeCloseTo(VH, 0);
});

test('the Scoreboard opens over the game, which stays mounted, and Esc returns to it', async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() =>
    Object.assign(document.querySelector('[data-table="ws"]')!, { marker: 'kept' }),
  );
  const opener = page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('button', { name: 'Scores' });
  await opener.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: 'Rounds by player' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: 'Rounds by player' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Enter results/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => (document.querySelector('[data-table="ws"]') as { marker?: string }).marker,
    ),
  ).toBe('kept');
});

for (const name of ['Menu']) {
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
  await dialog(page).getByRole('button', { name: /Rules/ }).click();
  await expect(dialog(page).locator('h2').first()).toHaveText(RULES);
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  await expect(menu).toBeFocused();
});
