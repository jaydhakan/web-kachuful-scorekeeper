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
    test.describe('the deal', () => {
      // Cards are only dealt with motion on; under reduced motion the deal shows the trump and closes.
      test.use({ reducedMotion: 'no-preference' });
      test('the deal cards land on the seats', async ({ page }) => {
        await page.goto('/kachuful');
        await toSetup3(page, NAMES);
        await btn(page, 'Deal!').click();
        await page.locator('[data-table="rs"]').waitFor();
        await scaleTable(page, 'rs', width);
        // Each card fades as it lands and then goes, so its last position and the seats are recorded every frame.
        await page.evaluate(() => {
          const w = window as unknown as { __cards?: DOMRect[]; __seats?: DOMRect[] };
          w.__cards = [];
          const loop = () => {
            const table = document.querySelector('[data-table="rs"]');
            if (!table) return;
            const cards = table.querySelectorAll('.z-\\[7\\] > div');
            cards.forEach((el, i) => (w.__cards![i] = el.getBoundingClientRect()));
            // The seats as they stand while cards are in the air; the table moves on once the deal closes.
            if (cards.length)
              w.__seats = [...table.querySelectorAll('[data-seat]')].map((el) =>
                el.getBoundingClientRect(),
              );
            requestAnimationFrame(loop);
          };
          loop();
        });
        await page.locator('[data-table="rs"]').waitFor({ state: 'detached' });
        const { cards, seats } = await page.evaluate(() => {
          const w = window as unknown as { __cards: DOMRect[]; __seats: DOMRect[] };
          const box = (r: DOMRect) => ({ x: r.x, y: r.y, width: r.width, height: r.height });
          return { cards: w.__cards.map(box), seats: w.__seats.map(box) };
        });
        expect(cards).toHaveLength(NAMES.length);
        const nearest = cards.map((c) =>
          seats.findIndex(
            (s) => Math.hypot(centre(s).x - centre(c).x, centre(s).y - centre(c).y) < 2,
          ),
        );
        expect(nearest.every((i) => i >= 0)).toBe(true);
        expect(new Set(nearest).size).toBe(NAMES.length);
      });
    });

    for (const players of [5, 7])
      test(`the spin token settles on the new dealer chip (${players} players)`, async ({
        page,
      }) => {
        await page.goto('/kachuful');
        await toSetup3(page, NAMES7.slice(0, players));
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
        await expect(page.locator('[data-table="su3"] .z-\\[6\\]')).toHaveCount(0, {
          timeout: 5000,
        });
        await expect(chip).toHaveCount(1);
        const tok = (await page.evaluate(() => (window as unknown as { __tok: DOMRect }).__tok))!,
          c = (await chip.boundingBox())!;
        expect(Math.abs(tok.x - c.x)).toBeLessThan(2.5);
        expect(Math.abs(tok.y - c.y)).toBeLessThan(2.5);
        expect(Math.abs(tok.width - c.width)).toBeLessThan(1);
      });
  });
}
