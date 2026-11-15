import { expect, test, type Page } from '@playwright/test';
import { auditScreen } from './audit';
import { ishBtn, openIshaara } from './ishaara-helpers';

// Ishaara's setup at every device class: stacked teams on a phone, two panes from a phone on its side up, and the
// whole width used on a laptop (ISH-F10, ISH-F20). SHOTS=<dir> also saves a screenshot of each step.

const SIZES = [
  [360, 800],
  [390, 844],
  [768, 1024],
  [1366, 768],
  [1920, 1080],
  [844, 390],
] as const;

async function seat(page: Page, name: string) {
  const field = page.getByRole('dialog').getByLabel('Player name');
  await field.fill(name);
  await expect(
    page.getByText(`${name} is already in your games, so no email is needed.`),
  ).toBeVisible();
  await field.press('Enter');
  await expect(
    page.getByRole('dialog').getByRole('button', { name: `Remove ${name}`, exact: true }),
  ).toBeVisible();
}

const box = async (_page: Page, sel: ReturnType<Page['locator']>) => (await sel.boundingBox())!;

for (const [w, h] of SIZES) {
  const phone = Math.min(w, h) < 500;
  test.describe(`${w}×${h}`, () => {
    // Sign-in is driven through the phone UI, so large screens start at phone size and grow once signed in.
    test.use({
      viewport: phone ? { width: w, height: h } : { width: 390, height: 844 },
      isMobile: phone,
      hasTouch: phone,
    });

    test('Ishaara setup lays out teams and rules for the screen', async ({ page }) => {
      test.setTimeout(60_000);
      await openIshaara(page, 'admin', { circle: true });
      if (!phone) {
        await page.setViewportSize({ width: w, height: h });
        await expect(ishBtn(page, 'New game')).toBeVisible();
        await page.waitForTimeout(300);
      }
      await ishBtn(page, 'New game').click();
      await ishBtn(page, 'Add player').click();
      for (const n of ['Riya', 'Kabir', 'Asha', 'Om', 'Neha']) await seat(page, n);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.waitForTimeout(500);
      if (process.env.SHOTS)
        await page.screenshot({ path: `${process.env.SHOTS}/teams-${w}x${h}.png` });

      // Names whole, chips at least 44px, nothing clipped.
      const r = await auditScreen(page, 'teams');
      expect(r.brokenWords, 'names broken mid-word').toEqual([]);
      expect(r.clipped).toEqual([]);
      expect(r.smallTargets).toEqual([]);
      expect(r.pageOverflow).toEqual([]);

      const sun = await box(page, page.locator('fieldset').filter({ hasText: 'Sun' }).first());
      const moon = await box(page, page.locator('fieldset').filter({ hasText: 'Moon' }).first());
      const shuffle = await box(page, ishBtn(page, 'Shuffle teams'));
      if (w < 500)
        expect(moon.y, 'teams stacked on a phone').toBeGreaterThan(sun.y + sun.height - 1);
      if (w >= 1366) {
        expect(Math.abs(moon.y - sun.y), 'teams side by side').toBeLessThan(2);
        // The step reaches across the screen: teams in the main pane, the rest beside them.
        expect(shuffle.x).toBeGreaterThan(moon.x + moon.width);
        // Scaffold caps two panes at 72rem, which the 1920 step (X-F01) scales with the type.
        expect(shuffle.x + shuffle.width - sun.x).toBeGreaterThan(
          Math.min(w * 0.6, w >= 1600 ? 1000 : 900),
        );
      }
      if (phone && w > h)
        expect(shuffle.x, 'two panes on its side').toBeGreaterThan(sun.x + sun.width);

      await ishBtn(page, 'Next: words').click();
      await expect(ishBtn(page, 'Start game')).toBeVisible();
      await page.waitForTimeout(500);
      if (process.env.SHOTS)
        await page.screenshot({ path: `${process.env.SHOTS}/words-${w}x${h}.png` });
      const words = await auditScreen(page, 'words');
      expect(words.clipped).toEqual([]);
      expect(words.smallTargets).toEqual([]);
      const packs = await box(page, page.getByRole('region', { name: /word packs/i }));
      const timer = await box(page, page.getByRole('button', { name: '2 min' }));
      if (w >= 1366 || (phone && w > h))
        expect(timer.x, 'rules beside the words').toBeGreaterThan(packs.x + packs.width);
      else expect(timer.y, 'rules under the words').toBeGreaterThan(packs.y + packs.height);
    });
  });
}
