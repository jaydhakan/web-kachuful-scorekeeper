import { expect, test } from '@playwright/test';
import { openSeeded, seedGame } from './fixtures';

// Design grid of the full table (src/lib/tableGeometry.ts); seven players shrink it no further than 0.8×.
const W = 340,
  H = 300,
  MIN = 0.8;

test('a fitted table fills its slot both ways, keeps its shape and stops shrinking at its minimum', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.goto('/');
  await openSeeded(page, seedGame(7, 'playing'), 'round');
  const table = page.locator('[data-table="play"]');
  await table.waitFor();
  // The slot the table fits itself to; any size a screen could give it can be set here.
  const slot = table.locator('xpath=..');
  for (const [w, h] of [
    [390, 300],
    [390, 200],
    [200, 300],
    [700, 500],
    [900, 380],
    [120, 120],
  ]) {
    await slot.evaluate(
      (el, [w, h]) =>
        Object.assign(el.style, {
          flex: 'none',
          width: `${w}px`,
          height: `${h}px`,
          minHeight: '0',
        }),
      [w, h],
    );
    const box = (await table.boundingBox())!;
    const want = Math.max(W * MIN, Math.min(w, (h * W) / H));
    expect(box.width, `${w}×${h}`).toBeCloseTo(want, 0);
    expect(box.height / box.width, `${w}×${h} ratio`).toBeCloseTo(H / W, 2);
    if (want > W * MIN) {
      expect(box.width).toBeLessThanOrEqual(w + 1);
      expect(box.height).toBeLessThanOrEqual(h + 1);
    }
    // Every seat stays on the table whatever its size.
    for (const seat of await page.locator('[data-table="play"] [data-seat]').all()) {
      const s = (await seat.boundingBox())!,
        cx = s.x + s.width / 2 - box.x,
        cy = s.y + s.height / 2 - box.y;
      expect(cx).toBeGreaterThan(0);
      expect(cx).toBeLessThan(box.width);
      expect(cy).toBeGreaterThan(0);
      expect(cy).toBeLessThan(box.height);
    }
  }
});

test('a table that does not opt in keeps its fixed design size', async ({ page }) => {
  await page.goto('/');
  await openSeeded(page, seedGame(5, 'bidding'), 'round');
  const box = (await page.locator('[data-table="bid"]').boundingBox())!;
  expect(box.width).toBeCloseTo(320, 0);
  expect(box.height).toBeCloseTo(170, 0);
});
