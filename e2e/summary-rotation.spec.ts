import { expect, test, type Page } from '@playwright/test';
import { standings, totals, type Game } from '@/domain';
import { fmt } from '@/lib/format';
import { LONG_NAMES, openSeeded, seedGame } from './fixtures';
import { btn } from './helpers';

// The count-up only runs with motion on; the suite default is reduced motion.
test.use({ reducedMotion: 'no-preference' });

const N = 5;

/** Confirms the seeded round so the Summary opens with its count-up (a saved game never replays it). */
async function openAnimatedSummary(page: Page, vp: { width: number; height: number }) {
  await page.setViewportSize(vp);
  await page.goto('/');
  await openSeeded(page, seedGame(N, 'results'), 'round');
  for (const name of LONG_NAMES.slice(2, N)) {
    await page
      .getByRole('group', { name: `Result for ${name}` })
      .getByRole('button', { name: /Made/ })
      .click();
  }
  await btn(page, 'Confirm round').click();
  await page.getByRole('region', { name: 'Standings' }).waitFor();
}

const savedGame = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('kachuful.v1')!) as Game);

async function expectStandings(page: Page) {
  const g = await savedGame(page);
  const order = standings(g),
    tot = totals(g);
  const rows = page.getByRole('region', { name: 'Standings' }).locator('.glass');
  await expect(rows).toHaveCount(N);
  for (const [k, x] of order.entries()) {
    const lines = (await rows.nth(k).innerText()).split('\n').filter(Boolean);
    expect(lines[2]).toContain(x.p.name);
    await expect(rows.nth(k).locator('.disp').last()).toHaveText(fmt(tot[x.p.id]));
  }
}

test('turning the phone mid-count-up lets it finish on the right totals, in the right order', async ({
  page,
}) => {
  await openAnimatedSummary(page, { width: 390, height: 844 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const region = document.querySelector('[aria-label="Standings"]')!;
    Object.assign(region, { marker: 'region' });
    // Each row remembers whose it is, so a rebuilt (or swapped) row shows up as a mismatch.
    region.querySelectorAll<HTMLElement>('.glass').forEach((row) => {
      Object.assign(row, { marker: row.innerText.split('\n').filter(Boolean)[2] });
    });
    Object.assign(document.querySelector('[data-table="sum"]')!, { marker: 'table' });
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(600);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(3500);
  await expectStandings(page);
  // Nothing was torn down and rebuilt, so the animation stages carried on instead of restarting.
  const kept = await page.evaluate(() => ({
    region: (document.querySelector('[aria-label="Standings"]') as { marker?: string }).marker,
    table: (document.querySelector('[data-table="sum"]') as { marker?: string }).marker,
    rows: [...document.querySelectorAll<HTMLElement>('[aria-label="Standings"] .glass')].map(
      (row) => (row as { marker?: string }).marker === row.innerText.split('\n').filter(Boolean)[2],
    ),
  }));
  expect(kept).toEqual({ region: 'region', table: 'table', rows: Array(N).fill(true) });
});

test('crossing into the wide layout keeps the Summary mounted and its seats in place', async ({
  page,
}) => {
  await openAnimatedSummary(page, { width: 768, height: 1024 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    Object.assign(document.querySelector('[data-table="sum"] [data-seat="0"]')!, {
      marker: 'seat',
    });
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(3500);
  await expectStandings(page);
  expect(
    await page.evaluate(
      () =>
        (document.querySelector('[data-table="sum"] [data-seat="0"]') as { marker?: string })
          .marker,
    ),
  ).toBe('seat');
});
