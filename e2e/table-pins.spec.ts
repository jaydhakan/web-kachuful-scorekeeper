import { expect, test, type Page } from '@playwright/test';
import { btn, NAMES7, toSetup3 } from './helpers';

const NAMES = NAMES7.slice(0, 5);

/** Stands in for a screen that fits its table to a slot: resizes the box and sets the same --s the CSS would. */
const scaleTable = (page: Page, uid: string, width: number) =>
  page.locator(`[data-table="${uid}"]`).evaluate((el, w) => {
    (el as HTMLElement).style.width = `${w}px`;
    el.style.setProperty('--s', `${Math.min(w / 340, 1.5)}px`);
  }, width);

const centre = (b: { x: number; y: number; width: number; height: number }) => ({
  x: b.x + b.width / 2,
  y: b.y + b.height / 2,
});

for (const width of [240, 340, 510]) {
  test.describe(`table drawn ${width}px wide`, () => {
    test('the deal cards land on the seats', async ({ page }) => {
      await page.goto('/');
      await toSetup3(page, NAMES);
      await btn(page, 'Deal!').click();
      const table = page.locator('[data-table="rs"]');
      await table.waitFor();
      await scaleTable(page, 'rs', width);
      const cards = page.locator('[data-table="rs"] .z-\\[7\\] > div');
      await expect(cards).toHaveCount(NAMES.length);
      // Reduced motion (the suite default) puts each card on its seat at once, so this is the landing spot.
      const seats = await Promise.all(
        (await page.locator('[data-table="rs"] [data-seat]').all()).map(async (s) =>
          centre((await s.boundingBox())!),
        ),
      );
      const landed = await Promise.all(
        (await cards.all()).map(async (c) => centre((await c.boundingBox())!)),
      );
      const nearest = landed.map((c) =>
        seats.findIndex((s) => Math.hypot(s.x - c.x, s.y - c.y) < 2),
      );
      expect(nearest.every((i) => i >= 0)).toBe(true);
      expect(new Set(nearest).size).toBe(NAMES.length);
    });

    test('the spin token settles on the new dealer chip', async ({ page }) => {
      await page.goto('/');
      await toSetup3(page, NAMES);
      await scaleTable(page, 'su3', width);
      await page.evaluate(() => {
        const w = window as unknown as { __tok?: DOMRect };
        const loop = () => {
          const el = document.querySelector('[data-table="su3"] .z-\\[6\\] > div');
          if (el) w.__tok = el.getBoundingClientRect();
          requestAnimationFrame(loop);
        };
        loop();
      });
      await btn(page, /Random/).click();
      const chip = page.locator('[data-table="su3"] .z-\\[4\\]');
      // The token unmounts when the spin ends; the chip takes over on the dealer's seat.
      await expect(page.locator('[data-table="su3"] .z-\\[6\\]')).toHaveCount(0, { timeout: 5000 });
      await expect(chip).toHaveCount(1);
      const tok = (await page.evaluate(() => (window as unknown as { __tok: DOMRect }).__tok))!,
        c = (await chip.boundingBox())!;
      expect(Math.abs(tok.x - c.x)).toBeLessThan(2.5);
      expect(Math.abs(tok.y - c.y)).toBeLessThan(2.5);
      expect(Math.abs(tok.width - c.width)).toBeLessThan(1);
    });
  });
}
