import { expect, test, type Page } from '@playwright/test';
import {
  faceDown,
  giveClue,
  ishBtn,
  openFromHome,
  other,
  readyGame,
  TEAM,
} from './ishaara-helpers';

// The table's board: waiting reads as waiting, a pick never moves the grid, turn ends and the end of the game are
// moments, and the moments that move are checked with motion on.

const words = (page: Page) => page.getByRole('list', { name: 'Words', exact: true });
// The board's own announcer, an sr-only status line (the app has other live regions: theme sync, toasts).
const live = (page: Page) => page.locator('p.sr-only[role="status"][aria-live="polite"]');
const box = async (page: Page) => {
  const b = await words(page).boundingBox();
  return b && [b.x, b.y, b.width, b.height].map(Math.round).join(',');
};

test('a tap on the board while it waits for the clue says why, and the cards read as inert', async ({
  page,
  browser,
}) => {
  const { t, close } = await readyGame(page, browser);
  const first = words(page).getByRole('button').first();
  await expect(first).toHaveAttribute('aria-disabled', 'true');
  const dim = await first.evaluate((el) => getComputedStyle(el.parentElement!).opacity);
  expect(Number(dim)).toBeLessThan(1);
  // aria-disabled cards are still tappable, which is the case being tested.
  await first.click({ force: true });
  await expect(ishBtn(page, 'Confirm')).toHaveCount(0);
  await expect(live(page)).toContainText(`Waiting for ${t === 'sun' ? 'Riya' : 'Kabir'}’s clue`);
  await close();
});

test('the trap holds on the board until the table taps "See the result"', async ({
  page,
  browser,
}) => {
  test.setTimeout(60_000);
  const { phones, key, t, close } = await readyGame(page, browser);
  await giveClue(phones[t], 'Quasar', 2);
  const trap = (await faceDown(page, key, 'trap'))[0];
  await page.getByRole('button', { name: `${trap}, face down`, exact: true }).click();
  await ishBtn(page, 'Confirm').click();
  await expect(ishBtn(page, 'See the result')).toBeVisible();
  // Well past the old 2.4 s: still on the board.
  await page.waitForTimeout(3500);
  await expect(ishBtn(page, 'See the result')).toBeVisible();
  await expect(page.getByRole('heading', { name: `${TEAM[other(t)]} wins` })).toHaveCount(0);
  await ishBtn(page, 'See the result').click();
  await expect(page.getByRole('heading', { name: `${TEAM[other(t)]} wins` })).toBeVisible();
  await close();
});

test('a timed turn shows a draining bar under the header', async ({ page, browser }) => {
  const { phones, t, close } = await readyGame(page, browser, { timerSec: 60 });
  await expect(page.locator('[data-timer-bar]')).toHaveCount(0);
  await giveClue(phones[t], 'Quasar', 2);
  await expect(page.locator('[data-timer-bar]')).toBeVisible();
  await expect(page.getByRole('timer')).toBeVisible();
  await close();
});

test.describe('on a tablet held upright', () => {
  test('picking a card keeps the grid where it is', async ({ page, browser }) => {
    const { phones, t, close } = await readyGame(page, browser);
    await page.setViewportSize({ width: 768, height: 1024 });
    // Crossing 768 px remounts Ishaara (ISH-F04), so the board is opened again.
    await page.goto('/ishaara');
    await openFromHome(page);
    await giveClue(phones[t], 'Quasar', 2);
    await expect(page.getByText('QUASAR', { exact: false }).first()).toBeVisible();
    const before = await box(page);
    await words(page).getByRole('button').first().click();
    await expect(ishBtn(page, 'Confirm')).toBeVisible();
    expect(await box(page)).toBe(before);
    await close();
  });
});

test.describe('with motion on', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('a reveal rings the card, End turn shows its moment and the next team sweeps in', async ({
    page,
    browser,
  }) => {
    test.setTimeout(60_000);
    const { phones, key, t, close } = await readyGame(page, browser);
    await giveClue(phones[t], 'Quasar', 2);
    const own = (await faceDown(page, key, t))[0];
    await page.getByRole('button', { name: `${own}, face down`, exact: true }).click();
    await ishBtn(page, 'Confirm').click();
    await expect(page.locator(`[data-reveal-ring="${t}"]`)).toBeAttached();
    await expect(
      words(page).getByRole('button', { name: new RegExp(`^${own}, (?!face down)`) }),
    ).toBeVisible();
    await ishBtn(page, `End ${TEAM[t]}’s turn`).click();
    await expect(page.getByText(`Turn ended. ${TEAM[other(t)]}’s turn.`)).toBeVisible();
    await expect(page.locator(`[data-turn-sweep="${other(t)}"]`)).toBeAttached();
    await close();
  });

  test('the win floods the winner’s colour and throws confetti', async ({ page, browser }) => {
    const { phones, t, close } = await readyGame(page, browser);
    await giveClue(phones[t], 'Quasar', 2);
    await ishBtn(page, 'Menu').click();
    await ishBtn(page, `${TEAM[t]} resigns`).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Resign' }).click();
    // A resignation goes straight to the result, without the board's end note.
    await expect(page.locator(`[data-win-hero="${other(t)}"]`)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('canvas')).toBeAttached();
    await close();
  });
});
