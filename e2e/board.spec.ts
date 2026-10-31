import { expect, test, type Page } from '@playwright/test';
import { btn } from './helpers';
import { LONG_NAMES, openSeeded, seedGame } from './fixtures';

async function openBoard(page: Page, width: number, height: number, n = 7) {
  await page.setViewportSize({ width, height });
  await page.goto('/');
  await openSeeded(page, seedGame(n, 'bidding'), 'round');
  await btn(page, 'Scoreboard').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(600);
  return dialog;
}

const scroller = (page: Page) =>
  page.getByRole('table').locator('xpath=ancestor::div[contains(@class, "overflow-auto")][1]');

/** Tablets and desktops get the large-screen Scoreboard: a screen over the game, reached from Scores. */
async function openDeskBoard(page: Page, width: number, height: number, n = 7) {
  await page.setViewportSize({ width, height });
  await page.goto('/');
  await openSeeded(page, seedGame(n, 'bidding'), 'round');
  await page.getByRole('button', { name: 'Scores', exact: true }).click();
  const grid = page.getByRole('region', { name: 'Rounds by player' });
  await expect(grid).toBeVisible();
  await page.waitForTimeout(600);
  return grid;
}

for (const [w, h] of [
  [768, 1024],
  [1024, 768],
  [1440, 900],
]) {
  test(`7 players fit the large-screen Scoreboard without sideways scroll, names in full, at ${w}x${h}`, async ({
    page,
  }) => {
    const grid = await openDeskBoard(page, w, h);
    const m = await grid.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
    expect(m.sw).toBeLessThanOrEqual(m.cw + 1);
    const text = await grid.innerText();
    for (const name of LONG_NAMES) expect(text).toContain(name);
  });
}

test('on a phone the headers keep short names, with the full name as the accessible name', async ({
  page,
}) => {
  await openBoard(page, 390, 844);
  const th = page.getByRole('columnheader').nth(1);
  await expect(th).toContainText('Barthol…');
  await expect(page.getByRole('columnheader', { name: /Bartholomew Jr/ })).toHaveCount(1);
  await expect(page.getByRole('columnheader', { name: /Barthol…/ })).toHaveCount(0);
  await expect(th.getByText('Barthol…')).toHaveAttribute('title', 'Bartholomew Jr');
  await expect(th.getByText('Barthol…')).toHaveAttribute('aria-hidden', 'true');
  // Sideways scrolling is allowed here: the columns keep their minimum width.
  const m = await scroller(page).evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
  expect(m.sw).toBeGreaterThan(m.cw);
});

test('the round column and the header row stay put while the Scoreboard scrolls', async ({
  page,
}) => {
  await openBoard(page, 390, 844);
  const sc = scroller(page);
  const round = page.getByRole('columnheader').first();
  const before = (await round.boundingBox())!;
  await sc.evaluate((el) => {
    el.scrollLeft = 80;
    el.scrollTop = 40;
  });
  const after = (await round.boundingBox())!;
  expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
});
