import { expect, test } from '@playwright/test';
import { openSeeded, seedGame } from './fixtures';

// Design grids (src/lib/tableGeometry.ts): the phone's full table, whose seven seats shrink no further than 0.8×, and
// the large-screen workspace table, which may go to 0.62×.
const CASES = [
  { what: 'phone', uid: 'play', vp: { width: 740, height: 900 }, W: 340, H: 300, MIN: 0.8 },
  { what: 'large screen', uid: 'ws', vp: { width: 1440, height: 900 }, W: 560, H: 380, MIN: 0.62 },
] as const;

for (const { what, uid, vp, W, H, MIN } of CASES) {
  test(`${what}: a fitted table fills its slot both ways, keeps its shape and stops shrinking at its minimum`, async ({
    page,
  }) => {
    await page.setViewportSize(vp);
    await page.goto('/');
    await openSeeded(page, seedGame(7, 'playing'), 'round');
    const table = page.locator(`[data-table="${uid}"]`);
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
      for (const seat of await page.locator(`[data-table="${uid}"] [data-seat]`).all()) {
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
}

test('a table that does not opt in keeps its fixed design size', async ({ page }) => {
  // Tall enough that the Summary shows its Next-up table rather than the one-line version.
  await page.setViewportSize({ width: 390, height: 1100 });
  await page.goto('/');
  await openSeeded(page, seedGame(5, 'summary'), 'round');
  const table = page.locator('[data-table="sum"]');
  await table.waitFor();
  const box = (await table.boundingBox())!;
  expect(box.width).toBeCloseTo(320, 0);
  expect(box.height).toBeCloseTo(170, 0);
});
