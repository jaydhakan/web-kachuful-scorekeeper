import { expect, test } from '@playwright/test';
import { NAMES7, bidEveryone, btn, startGame } from './helpers';

test('controls clear the status bar and home indicator of a notched phone', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--sat', '47px');
    document.documentElement.style.setProperty('--sab', '34px');
  });
  const vh = page.viewportSize()!.height;
  const newGame = (await btn(page, 'New Game').boundingBox())!;
  expect(newGame.y + newGame.height).toBeLessThanOrEqual(vh - 34);
  await page.getByText(/Resume game|Try the demo/).click();
  await page.waitForTimeout(600);
  const menu = (await btn(page, 'Menu').boundingBox())!;
  expect(menu.y).toBeGreaterThanOrEqual(47);
  const bar = (await page.getByRole('button', { name: /bids in|Start playing/ }).boundingBox())!;
  expect(bar.y + bar.height).toBeLessThanOrEqual(vh - 34);
  await btn(page, 'Scoreboard').click();
  await page.waitForTimeout(600);
  const sheet = (await page.getByRole('dialog').boundingBox())!;
  expect(sheet.y).toBeGreaterThanOrEqual(47);
});

test('the reason Confirm is disabled stays visible above it with 7 players at 360px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  await startGame(page, NAMES7);
  await bidEveryone(page);
  await btn(page, 'Start playing').click();
  await btn(page, 'Enter results').click();
  const made = page.getByRole('button', { name: /Made/ });
  for (let k = 0; k < NAMES7.length; k++) await made.nth(k).click();
  const note = page.getByRole('status').filter({ hasText: 'Someone has to miss' });
  await expect(note).toBeVisible();
  const n = (await note.boundingBox())!;
  const confirm = (await btn(page, 'Confirm round').boundingBox())!;
  expect(n.y).toBeGreaterThanOrEqual(0);
  expect(n.y + n.height).toBeLessThanOrEqual(confirm.y);
});

test('a scroll that starts on Made/Missed scrolls and never sets a result', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  await startGame(page, NAMES7);
  await bidEveryone(page);
  await btn(page, 'Start playing').click();
  await btn(page, 'Enter results').click();
  await page.waitForTimeout(600);
  const seg = page.getByRole('button', { name: /Made/ }).nth(3);
  const box = (await seg.boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', ty: number) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y: ty }],
    });
  await touch('touchStart', y);
  for (let d = 10; d <= 120; d += 10) await touch('touchMove', y - d);
  await touch('touchEnd', y - 120);
  await page.waitForTimeout(400);
  const scrolled = await page
    .getByRole('region', { name: 'Content' })
    .evaluate((el) => el.scrollTop);
  expect(scrolled).toBeGreaterThan(0);
  await expect(page.getByRole('button', { pressed: true, name: /Made|Missed/ })).toHaveCount(0);
});
