import { expect, test, type Page } from '@playwright/test';
import { auditScreen } from './audit';
import { ishBtn, openIshaara } from './ishaara-helpers';

// Ishaara's hub pages at a phone and on large screens: nothing clipped or broken mid-word, and on a laptop the Game
// page and How to play use the width in two columns (ISH-F20). SHOTS=<dir> also saves a screenshot of each.

const SIZES = [
  [360, 800],
  [1366, 768],
  [1920, 1080],
] as const;

async function clean(page: Page, screen: string, w: number, h: number) {
  await page.waitForTimeout(600);
  if (process.env.SHOTS)
    await page.screenshot({ path: `${process.env.SHOTS}/${screen}-${w}x${h}.png` });
  const r = await auditScreen(page, screen);
  expect(r.brokenWords, `${screen}: words broken`).toEqual([]);
  expect(r.clipped, `${screen}: clipped`).toEqual([]);
  expect(r.pageOverflow, `${screen}: sideways scroll`).toEqual([]);
}

const back = (page: Page) =>
  page.getByRole('button', { name: 'Back', exact: true }).first().click();

for (const [w, h] of SIZES) {
  const phone = w < 500;
  test.describe(`${w}×${h}`, () => {
    // Sign-in is driven through the phone UI; large screens grow once signed in.
    test.use({ viewport: phone ? { width: w, height: h } : { width: 390, height: 844 } });

    test('Ishaara hub pages fit the screen', async ({ page }) => {
      test.setTimeout(60_000);
      await openIshaara(page, 'admin');
      if (!phone) {
        await page.setViewportSize({ width: w, height: h });
        await expect(ishBtn(page, 'History')).toBeVisible();
      }

      await ishBtn(page, 'History').click();
      const row = page.getByRole('region', { name: 'History' }).getByRole('button').first();
      await expect(row).toBeVisible();
      await clean(page, 'history', w, h);

      await row.click();
      const key = page.getByRole('list', { name: 'The key' });
      await expect(key).toBeVisible();
      await clean(page, 'game', w, h);
      const log = page.getByRole('heading', { name: 'Clue log' });
      const kb = (await key.boundingBox())!,
        lb = (await log.boundingBox())!;
      if (phone) expect(lb.y, 'log under the key').toBeGreaterThan(kb.y + kb.height);
      else expect(lb.x, 'log beside the key').toBeGreaterThan(kb.x + kb.width);
      await back(page);
      await back(page);

      await ishBtn(page, 'How to play').click();
      await expect(page.getByRole('heading', { name: 'How to play' })).toBeVisible();
      await clean(page, 'rules', w, h);
      if (!phone) {
        const parts = page.locator('section[aria-label]');
        const xs = new Set(
          await parts.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x))),
        );
        expect(xs.size, 'rules in two columns').toBeGreaterThan(1);
      }
      await back(page);

      await ishBtn(page, 'Leaderboard').click();
      await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible();
      await clean(page, 'leaderboard', w, h);
    });
  });
}
