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

for (const [w, h, n] of [
  [390, 844, 5],
  [360, 740, 7],
] as const) {
  test(`bid chips never cover a name and stay on screen (${n} players at ${w}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/');
    await startGame(page, NAMES7.slice(0, n));
    await bidEveryone(page);
    const overlaps = (table: string) =>
      page.evaluate((table) => {
        const box = (el: Element) => el.getBoundingClientRect();
        const root = document.querySelector(`[data-table="${table}"]`)!;
        // The label box spans the whole seat; what must stay readable is the text itself.
        const names = [...root.querySelectorAll('[data-seat-name]')].map((el) => {
          const r = document.createRange();
          r.selectNodeContents(el);
          return r.getBoundingClientRect();
        });
        const chips = [...root.querySelectorAll('[data-seat-bid]')].map(box);
        const hit = (a: DOMRect, b: DOMRect) =>
          a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        return {
          chips: chips.length,
          covered: chips.filter((c) => names.some((nm) => hit(c, nm))).length,
          off: chips.filter((c) => c.left < 0 || c.right > innerWidth).length,
        };
      }, table);
    await page.waitForTimeout(600);
    expect(await overlaps('bid')).toEqual({ chips: n, covered: 0, off: 0 });
    await btn(page, 'Start playing').click();
    await page.waitForTimeout(700);
    expect(await overlaps('play')).toEqual({ chips: n, covered: 0, off: 0 });
  });
}
