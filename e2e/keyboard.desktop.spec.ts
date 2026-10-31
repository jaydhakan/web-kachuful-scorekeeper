import { expect, test, type Locator, type Page } from '@playwright/test';
import { openSeeded, seedGame } from './fixtures';
import { btn } from './helpers';

// A narrow window with a mouse and keyboard gets the phone UI; the large-screen UI has large-screen.desktop.spec.
test.use({ viewport: { width: 740, height: 900 } });

/** Presses Tab until focus is inside `group`; fails if it never gets there. */
async function tabInto(page: Page, group: Locator) {
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    if (await group.locator(':focus').count()) return;
  }
  throw new Error('Tab never reached the group');
}

const focusedIn = (group: Locator) => group.locator(':focus');

test.describe('pill groups and segmented controls', () => {
  test('player-count pills: one Tab stop, arrows move focus, Enter picks', async ({ page }) => {
    await page.goto('/');
    await btn(page, 'New Game').click();
    const pills = page.getByRole('group', { name: 'Number of players' });
    await expect(pills.getByRole('button')).toHaveCount(5);
    // Nothing is picked yet, so the first pill is the group's only Tab stop.
    await expect(pills.locator('[tabindex="0"]')).toHaveCount(1);
    await tabInto(page, pills);
    await expect(btn(page, '3 players')).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(btn(page, '4 players')).toBeFocused();
    await expect(btn(page, '4 players')).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('Enter');
    await expect(btn(page, '4 players')).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    await expect(btn(page, '5 players')).toHaveAttribute('aria-pressed', 'true');

    // Wraps at both ends; arrows alone never change the pick.
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(btn(page, '7 players')).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(btn(page, '3 players')).toBeFocused();
    await expect(btn(page, '5 players')).toHaveAttribute('aria-pressed', 'true');

    // Tab leaves the group in one press; coming back lands on the picked pill.
    await page.keyboard.press('Tab');
    await expect(focusedIn(pills)).toHaveCount(0);
    await page.keyboard.press('Shift+Tab');
    await expect(btn(page, '5 players')).toBeFocused();
    await expect(pills.locator('[tabindex="0"]')).toHaveCount(1);
  });

  test('direction control follows the same rules and shows a focus ring', async ({ page }) => {
    await page.goto('/');
    await btn(page, 'New Game').click();
    const seg = page.getByRole('group', { name: 'Seating direction' });
    const clockwise = seg.getByRole('button').nth(0);
    const anti = seg.getByRole('button').nth(1);
    await expect(clockwise).toHaveAttribute('aria-pressed', 'true');
    await tabInto(page, seg);
    await expect(clockwise).toBeFocused();
    await expect(anti).toHaveAttribute('tabindex', '-1');
    const outline = await clockwise.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe('none');

    await page.keyboard.press('ArrowRight');
    await expect(anti).toBeFocused();
    await expect(anti).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('Enter');
    await expect(anti).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(clockwise).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(anti).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(focusedIn(seg)).toHaveCount(0);
  });

  test('bid pills: arrows reach a locked pill, which keeps its reason and cannot be picked', async ({
    page,
  }) => {
    await page.goto('/');
    const game = seedGame(5, 'bidding');
    const r = game.rounds[game.rounds.length - 1];
    expect(r.cards).toBeGreaterThanOrEqual(6);
    // Everyone but the dealer has bid, and the first bid leaves the dealer's number 2 forbidden.
    const dealer = game.players[r.dealerIndex];
    r.bids = {};
    game.players
      .filter((p) => p.id !== dealer.id)
      .forEach((p, i) => (r.bids[p.id] = i ? 0 : r.cards - 2));
    game.ui.bidIdx = game.players.length - 1;
    await openSeeded(page, game, 'round');

    const pills = page.getByRole('group', { name: `Bid for ${dealer.name}` });
    await expect(pills.locator('[tabindex="0"]')).toHaveCount(1);
    await expect(pills.getByRole('button')).toHaveCount(r.cards + 1);
    await tabInto(page, pills);
    await expect(btn(page, 'Bid 0')).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    const locked = btn(page, 'Locked 2');
    await expect(locked).toBeFocused();
    await expect(locked).toHaveAttribute('aria-disabled', 'true');
    await expect(locked).toHaveAccessibleDescription(/\w/);
    // Enter on a locked pill must not pick it.
    await page.keyboard.press('Enter');
    await expect(locked).toHaveAttribute('aria-pressed', 'false');

    // Up and down move by a row of six, wrapping within the column.
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowDown');
    await expect(btn(page, 'Bid 6')).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(btn(page, 'Bid 0')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(btn(page, `Bid ${r.cards}`)).toBeFocused();

    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
    await expect(btn(page, `Bid ${r.cards - 1}`)).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Tab');
    await expect(focusedIn(pills)).toHaveCount(0);
  });

  test('avatar sheet: emoji grid moves by row, colours by column, Tab stays in the sheet', async ({
    page,
  }) => {
    await page.goto('/');
    await btn(page, 'New Game').click();
    await btn(page, '3 players').click();
    await btn(page, 'Next').click();
    const input = page.getByLabel('Player name');
    await input.fill('Aarav');
    await input.press('Enter');
    await page.locator('[data-seat="0"]').click();
    await btn(page, 'Change avatar').click();

    const sheet = page.getByRole('dialog');
    const emojis = sheet.getByRole('button', { name: /^Avatar / });
    const colours = sheet.getByRole('button', { name: 'Colour' });
    await expect(emojis).toHaveCount(21);
    // The seat sheet it replaced keeps its own Tab trap until its exit animation ends.
    await expect(sheet).toHaveCount(1);
    // One colour per seat: two decks seat ten (COLORS).
    await expect(colours).toHaveCount(10);
    await expect(emojis.and(page.locator('[tabindex="0"]'))).toHaveCount(1);
    await expect(colours.and(page.locator('[tabindex="0"]'))).toHaveCount(1);

    // Focus starts on the picked emoji, the group's single stop.
    const picked = sheet.getByRole('button', { name: /^Avatar /, pressed: true });
    await expect(picked).toBeFocused();
    const start = await emojis.evaluateAll((els) =>
      els.indexOf(document.activeElement as HTMLElement),
    );
    await page.keyboard.press('ArrowDown');
    const next = (start + 7) % 21;
    await expect(emojis.nth(next)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(emojis.nth((next + 1) % 21)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(emojis.nth((next + 1) % 21)).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('Tab');
    await expect(sheet.getByRole('button', { name: 'Colour', pressed: true })).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(colours.and(page.locator(':focus'))).toHaveAttribute('aria-pressed', 'false');

    // Tab only ever cycles the sheet's own stops: colours, Done, close, then back to the emoji stop.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      expect(await sheet.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
  });
});
