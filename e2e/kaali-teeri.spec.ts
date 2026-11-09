import { expect, test } from '@playwright/test';
import { callCards, confirmHand, ktBtn, ktStart, playedBy, points, quickBid } from './kt-helpers';

const P4 = ['Riya', 'Aarav', 'Meera', 'Kabir'];

test.beforeEach(async ({ page }) => {
  await page.goto('/kaali-teeri');
});

test('a quick-mode hand from the deal to the summary, kept across a reload', async ({ page }) => {
  await ktStart(page, P4);
  await expect(page.getByText('Riya deals · 13 each')).toBeVisible();
  await quickBid(page, 'Meera', 175);
  await callCards(page, 'Hearts', [{ rank: 'A', suit: 'Spades' }]);
  await playedBy(page, /^Ace of spades/, 'Kabir');
  await page.reload();
  await expect(page.getByRole('button', { name: /^Ace of spades: played by Kabir/ })).toBeVisible();
  await points(page, 75, { bid: 175 });
  await expect(page.getByText(/Made/i).first()).toBeVisible();
  await confirmHand(page, 1);
  await expect(page.getByRole('heading', { name: 'After hand 1' })).toBeVisible();
  await expect(page.getByText('Hand 2 · Aarav deals · Meera bids first')).toBeVisible();
  await ktBtn(page, 'Next hand').click();
  await expect(page.getByText('Aarav deals · 13 each')).toBeVisible();
});

test('the full auction: a player who passed bids again, and the last bid standing wins', async ({
  page,
}) => {
  await ktStart(page, P4);
  await page.getByRole('switch', { name: /^Quick mode/ }).click();
  // Aarav speaks first (left of Riya, the dealer).
  await ktBtn(page, 'Up 10').click();
  await ktBtn(page, 'Bid 160').click();
  await ktBtn(page, 'Pass').click(); // Meera
  await ktBtn(page, 'Pass').click(); // Kabir
  await ktBtn(page, 'Bid 165').click(); // Riya
  await ktBtn(page, 'Pass').click(); // Aarav
  await ktBtn(page, 'Bid 170').click(); // Meera, back in after passing
  await ktBtn(page, 'Pass').click(); // Kabir
  await ktBtn(page, 'Pass').click(); // Riya
  await ktBtn(page, 'Pass').click(); // Aarav
  await expect(page.getByText(/Meera bid 170/i).first()).toBeVisible();
  // The device remembers the auction for the next hand.
  await page.reload();
  await expect(page.getByText(/Meera bid 170/i).first()).toBeVisible();
});

test('everyone passes with no bid: the first speaker takes it at the minimum', async ({ page }) => {
  await ktStart(page, P4);
  await page.getByRole('switch', { name: /^Quick mode/ }).click();
  for (let i = 0; i < 4; i++) await ktBtn(page, 'Pass').click();
  await expect(ktBtn(page, 'Pass')).toHaveCount(0);
  await ktBtn(page, 'Take it at 150').click();
  await expect(page.getByText(/Aarav bid 150/i).first()).toBeVisible();
});

test('seven players: two decks, "the other one", partners marked at the end, points as the bidding team, a sweep', async ({
  page,
}) => {
  const P7 = ['Riya', 'Aarav', 'Meera', 'Kabir', 'Dev', 'Isha', 'Tara'];
  await ktStart(page, P7);
  await expect(page.getByText('Riya deals · 14 each')).toBeVisible();
  await quickBid(page, 'Meera', 400, 350);
  await callCards(page, 'Spades', [
    { rank: 'K', suit: 'Spades', copy: 'The other one' },
    { rank: 'A', suit: 'Hearts', copy: '1st played' },
  ]);
  await ktBtn(page, /^Hand over/).click();
  // Every called card must have a player before the points count.
  await expect(ktBtn(page, 'Confirm hand 1')).toBeDisabled();
  await playedBy(page, /^King of spades/, 'Dev');
  await playedBy(page, /^Ace of hearts/, 'Meera');
  await points(page, 500, { side: 'bidders', bid: 400, total: 500 });
  await expect(page.getByText('Bidding team swept')).toBeVisible();
  await confirmHand(page, 1);
  const row = (name: string) =>
    page
      .getByRole('region', { name: 'Standings' })
      .getByText(name)
      .locator('xpath=ancestor::div[contains(@class,"glass")][1]');
  await expect(row('Meera')).toContainText('+500');
  await expect(row('Dev')).toContainText('+500');
  await expect(row('Riya')).toContainText('0');
});

/** Meera wins at `bid`, calls the A♠ and plays it herself; the defenders take `def`. */
async function soloHand(
  page: import('@playwright/test').Page,
  n: number,
  bid: number,
  def: number,
) {
  await quickBid(page, 'Meera', bid);
  await callCards(page, 'Clubs', [{ rank: 'A', suit: 'Spades' }]);
  await playedBy(page, /^Ace of spades/, 'Meera');
  await points(page, def, { bid });
  await confirmHand(page, n);
}

test('editing a done hand from the scoreboard recomputes the totals', async ({ page }) => {
  await ktStart(page, P4);
  await soloHand(page, 1, 180, 70);
  const standings = page.getByRole('region', { name: 'Standings' });
  // The bidder held the card she called: two slots, so 2 × 180.
  await expect(standings).toContainText('360');
  // The result screen has left once there is one Scoreboard button.
  await expect(ktBtn(page, 'Scoreboard')).toHaveCount(1);
  await ktBtn(page, 'Scoreboard').click();
  await ktBtn(page, /^Edit Hand 1 ·/).click();
  const sheet = page.getByRole('dialog', { name: 'Edit hand 1' });
  await sheet
    .getByRole('region', { name: 'Points' })
    .getByRole('button', { name: 'Up 25' })
    .click();
  await sheet.getByRole('button', { name: 'Save hand' }).click();
  // 95 to the defenders leaves Meera 155 of 180: each defender gets 180.
  await page.keyboard.press('Escape');
  await expect(standings).toContainText('180');
  await expect(standings).not.toContainText('360');
});

test('first to 1000 ends the game after the hand that reaches it, with the winner on the podium', async ({
  page,
}) => {
  await ktStart(page, P4, { first1000: true });
  for (let n = 1; n <= 4; n++) {
    // A 250 bid that takes everything is a sweep: 250 each, never 2 × 250.
    await soloHand(page, n, 250, 0);
    if (n < 4) await ktBtn(page, 'Next hand').click();
  }
  await expect(page.getByRole('heading', { name: /Meera/ }).first()).toBeVisible();
  await expect(page.getByText('1,000').or(page.getByText('1000')).first()).toBeVisible();
  await expect(ktBtn(page, /Rematch/)).toBeVisible();
});

test('a whole hand offline: nothing needs the network', async ({ page, context }) => {
  // Installed once online, as a visitor's first load does; from then on the service worker serves every chunk.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await ktStart(page, P4);
  await soloHand(page, 1, 160, 90);
  await expect(page.getByRole('heading', { name: 'After hand 1' })).toBeVisible();
  await context.setOffline(false);
});

test('six players: a partner who played both called cards fills two slots', async ({ page }) => {
  await ktStart(page, ['Riya', 'Aarav', 'Meera', 'Kabir', 'Dev', 'Isha']);
  await expect(page.getByText('Riya deals · 8 each')).toBeVisible();
  await quickBid(page, 'Meera', 180);
  await callCards(page, 'Hearts', [
    { rank: 'K', suit: 'Spades' },
    { rank: 'A', suit: 'Hearts' },
  ]);
  await playedBy(page, /^King of spades/, 'Kabir');
  await playedBy(page, /^Ace of hearts/, 'Kabir');
  await points(page, 50, { bid: 180 });
  await expect(page.getByText(/2×/).first()).toBeVisible();
  await confirmHand(page, 1);
  const standings = page.getByRole('region', { name: 'Standings' });
  await expect(standings).toContainText('360');
});

test('every screen of a hand, and the hub pages, have no serious axe violations; targets are 44px', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const bad: string[] = [];
  const scan = async (label: string) => {
    await page.waitForTimeout(500);
    const r = await new AxeBuilder({ page }).analyze();
    for (const v of r.violations)
      if (v.impact === 'serious' || v.impact === 'critical')
        bad.push(`${label}: ${v.id} x${v.nodes.length}: ${v.nodes[0].target.join(' ')}`);
    const small = await page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLElement>(
          'button, a[href], [role="button"], [role="switch"]',
        ),
      ]
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return (
            r.width > 0 &&
            r.height > 0 &&
            getComputedStyle(e).visibility !== 'hidden' &&
            !e.closest('[inert],[aria-hidden="true"]') &&
            (r.width < 44 || r.height < 44)
          );
        })
        .map(
          (e) =>
            `${(e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`,
        ),
    );
    for (const s of small) bad.push(`${label}: small target ${s}`);
  };
  await scan('home');
  await ktStart(page, P4);
  await scan('quick bid');
  await page.getByRole('switch', { name: /^Quick mode/ }).click();
  await scan('auction');
  await page.getByRole('switch', { name: /^Quick mode/ }).click();
  await quickBid(page, 'Meera', 175);
  await scan('trump');
  await ktBtn(page, 'Hearts').click();
  await ktBtn(page, /^Next: call/).click();
  await scan('call');
  await ktBtn(page, 'A').click();
  await ktBtn(page, 'Spades').click();
  await ktBtn(page, /^Call /).click();
  await scan('play');
  await playedBy(page, /^Ace of spades/, 'Kabir');
  await points(page, 75, { bid: 175 });
  await scan('points');
  await confirmHand(page, 1);
  await scan('summary');
  await expect(ktBtn(page, 'Scoreboard')).toHaveCount(1);
  await ktBtn(page, 'Scoreboard').click();
  await scan('scoreboard');
  await page.keyboard.press('Escape');
  await ktBtn(page, 'Menu').click();
  await scan('menu');
  expect(bad).toEqual([]);
});
