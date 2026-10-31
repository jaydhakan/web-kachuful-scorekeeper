import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { NAMES7, bidEveryone, btn, startGame } from './helpers';

const noOverflow = (page: import('@playwright/test').Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth <= window.innerWidth &&
      document.body.scrollWidth <= window.innerWidth,
  );

test('smoke: demo game opens, a bid is taken and the scoreboard shows the verified totals', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText('Resume game')).toBeVisible();
  await page.getByText('Resume game').click();
  await expect(page.getByText('Round 7', { exact: true })).toBeVisible();
  await btn(page, 'Bid 1').click();
  await expect(
    page.getByText('Bids 7 / 9 cards').or(page.getByText('Bids 6 / 9 cards')),
  ).toBeVisible();
  await btn(page, 'Scoreboard').click();
  const heads = page.getByRole('columnheader');
  await expect(heads.filter({ hasText: 'Kabir' })).toContainText('60');
  await expect(heads.filter({ hasText: 'Meera' })).toContainText('−30');
  expect(await noOverflow(page)).toBe(true);
});

test('7 players fit at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  await startGame(page, NAMES7);
  await expect(page.getByText('Bids 1st · gets the first card')).toBeVisible();
  expect(await noOverflow(page)).toBe(true);
  const table = page.locator('[data-table="bid"]');
  const box = (await table.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(360);
  for (let k = 0; k < 7; k++) {
    const seat = (await page.locator(`[data-table="bid"] [data-seat="${k}"]`).boundingBox())!;
    expect(seat.x, `seat ${k} left edge`).toBeGreaterThanOrEqual(0);
    expect(seat.x + seat.width, `seat ${k} right edge`).toBeLessThanOrEqual(360);
  }
  await page.screenshot({ path: 'test-results/seven-players-360.png' });
});

test('refreshing mid-round restores the game', async ({ page }) => {
  await page.goto('/');
  await startGame(page, ['Asha', 'Bo', 'Cy']);
  await btn(page, 'Bid 1').click();
  await expect(page.getByText('Bids 2 of 3')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Round 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Bids 2 of 3')).toBeVisible();
  await expect(page.getByText('Bids 1 / 3 cards')).toBeVisible();
});

test('works offline after the first visit', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // let the service worker take control of the page
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Resume game')).toBeVisible();
  await expect(page.locator('h1')).toHaveCSS('font-family', /Bricolage/);
  await context.setOffline(false);
});

test('serves a web app manifest with icons', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel=manifest]').getAttribute('href');
  const m = await (await request.get(href!)).json();
  expect(m).toMatchObject({ display: 'standalone', start_url: '/', name: 'Kachuful' });
  expect(m.icons.length).toBeGreaterThanOrEqual(3);
});

test.describe('accessibility (axe)', () => {
  const scan = async (page: import('@playwright/test').Page, label: string) => {
    const r = await new AxeBuilder({ page }).analyze();
    const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(
      bad.map(
        (v) => `${label}: ${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes[0].target.join(' ')}`,
      ),
    ).toEqual([]);
  };

  test('home, setup, a full round and the sheets have no serious violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(600);
    await scan(page, 'home');
    await btn(page, 'How to play').click();
    await page.waitForTimeout(600);
    await scan(page, 'rules sheet');
    await page.keyboard.press('Escape');
    await btn(page, 'New Game').click();
    await page.waitForTimeout(400);
    await scan(page, 'new game dialog');
    await btn(page, 'Start new').click();
    await page.waitForTimeout(600);
    await scan(page, 'setup 1');
    await btn(page, '4 players').click();
    await btn(page, 'Next').click();
    await page.waitForTimeout(600);
    await scan(page, 'setup 2');
    const input = page.getByLabel('Player name');
    for (const n of ['A1', 'B2', 'C3', 'D4']) {
      await input.fill(n);
      await input.press('Enter');
      await page.waitForTimeout(250);
    }
    await btn(page, 'Next').click();
    await page.waitForTimeout(600);
    await scan(page, 'setup 3');
    await btn(page, 'Deal!').click();
    await btn(page, 'Skip the deal animation').click();
    await page.waitForTimeout(700);
    await scan(page, 'bidding');
    await bidEveryone(page);
    await btn(page, 'Menu').click();
    await page.waitForTimeout(600);
    await scan(page, 'menu sheet');
    await page.keyboard.press('Escape');
    await btn(page, 'Start playing').click();
    await page.waitForTimeout(600);
    await scan(page, 'play');
    await btn(page, 'Enter results').click();
    await page.waitForTimeout(600);
    await scan(page, 'results');
    await page.getByText('✓ Made').first().click();
    await page.getByText('✗ Missed').nth(1).click();
    await page.getByText('✓ Made').nth(2).click();
    await page.getByText('✓ Made').nth(3).click();
    await btn(page, 'Confirm round').click();
    await page.waitForTimeout(1500);
    await scan(page, 'summary');
    await btn(page, 'End game').click();
    await btn(page, 'End game').last().click();
    await page.waitForTimeout(3800);
    await scan(page, 'winner');
  });
});
