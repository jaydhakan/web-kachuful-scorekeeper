import { expect, test } from '@playwright/test';
import { LONG_NAMES } from './fixtures';
import { btn, nameField } from './helpers';
import { fits, inView, toSetup1 } from './setup-helpers';

test.describe('setup 2 fits the screen', () => {
  test('360x640 with seven players never scrolls, whatever the prompt length', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await toSetup1(page, 7);
    await btn(page, '7 players').click();
    await btn(page, 'Next').click();
    for (const [i, name] of LONG_NAMES.entries()) {
      await page.waitForTimeout(450);
      // The prompt wraps to a different number of lines on every seat, so check each one.
      expect(await fits(page), `seat ${i + 1}`).toBe(true);
      const input = await nameField(page);
      await input.fill(name);
      await input.press('Enter');
      if (i < LONG_NAMES.length - 1) await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
  });

  test('320x568: seven recent names stay in one row and never push Add player off screen', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await toSetup1(page, 7);
    await btn(page, '7 players').click();
    await btn(page, 'Next').click();
    const input = await nameField(page);
    await input.fill('Aarav');
    await input.press('Enter');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const row = page.getByRole('group', { name: 'Recent names' });
    const tops = await row
      .getByRole('button')
      .evaluateAll((els) => [
        ...new Set(els.map((e) => Math.round(e.getBoundingClientRect().top))),
      ]);
    expect(tops).toHaveLength(1);
    expect(await row.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    expect(await inView(page, btn(page, 'Add player'))).toBe(true);
    expect(await inView(page, btn(page, 'Next'))).toBe(true);
    // The page itself never scrolls sideways.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });

  test('844x390: Add player is in the controls pane, and the sheet opens with its field in view', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await toSetup1(page, 5);
    await btn(page, '5 players').click();
    await btn(page, 'Next').click();
    await page.waitForTimeout(500);
    expect(await inView(page, btn(page, 'Add player'))).toBe(true);
    const input = await nameField(page);
    await page.waitForTimeout(500);
    expect(await inView(page, input)).toBe(true);
    await expect(input).toBeFocused();
  });
});
