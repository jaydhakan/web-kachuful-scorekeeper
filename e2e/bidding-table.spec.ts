import { expect, test, type Page } from '@playwright/test';
import { openSeeded, seedGame } from './fixtures';

/** The table's width over its height: the round table is about 1.1, the flat oval about 1.9. */
const shape = (page: Page) =>
  page.evaluate(() => {
    const table = document.querySelector('[data-table="bid"]')!;
    const t = table.getBoundingClientRect();
    const line = table.closest('.glass')!.querySelector('p')!.getBoundingClientRect();
    const region = document.querySelector('[role="region"]')!;
    return {
      ratio: t.width / t.height,
      overlap: t.bottom - line.top,
      scrolls: region.scrollHeight > region.clientHeight + 1,
    };
  });

// Seven players with long names and two rows of bid pills: the tightest bidding screen on one deck.
for (const [vp, round] of [
  [{ width: 402, height: 874 }, true],
  [{ width: 390, height: 844 }, false],
] as const)
  test(`bidding at ${vp.width}×${vp.height} uses the ${round ? 'round' : 'flat'} table and fits`, async ({
    page,
  }) => {
    await page.setViewportSize(vp);
    await page.goto('/kachuful');
    await openSeeded(page, seedGame(7, 'bidding'), 'round');
    await page.waitForTimeout(600);
    const s = await shape(page);
    expect(s.ratio).toBeCloseTo(round ? 340 / 300 : 320 / 170, 0);
    expect(s.overlap).toBeLessThanOrEqual(0);
    expect(s.scrolls).toBe(false);
  });

// A Home Screen app on a 402×874 iPhone loses ~100px to the status bar and home indicator, which a page-height
// threshold can't see: the table must still clear the deal line, names included.
test('bidding on a notched phone keeps the table clear of the deal line', async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto('/kachuful');
  await openSeeded(page, seedGame(5, 'bidding'), 'round');
  await page.addStyleTag({ content: ':root{--sat:86px !important;--sab:34px !important}' });
  await page.waitForTimeout(600);
  const gap = await page.evaluate(() => {
    const table = document.querySelector('[data-table="bid"]')!;
    const line = table.closest('.glass')!.querySelector('p span')!.getBoundingClientRect();
    const lowest = Math.max(
      ...[...table.querySelectorAll('[data-seat-avatar], [data-seat-name]')].map(
        (e) => e.getBoundingClientRect().bottom,
      ),
    );
    return line.top - lowest;
  });
  expect(gap).toBeGreaterThanOrEqual(8);
});
