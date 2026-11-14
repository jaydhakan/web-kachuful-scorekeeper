import { expect, test, type Locator, type Page } from '@playwright/test';
import { auditScreen } from './audit';
import { ktBtn, ktStart, playedBy } from './kt-helpers';

// KT-F01 and KT-F02: bidding, trump and the card call fit a phone on its side and a laptop-height window.
const NAMES = ['Aarav', 'Bartholomew Jr', 'Konstantinos K', 'Meera', 'Dev', 'Riya', 'Kabir'];

/**
 * Whole box inside the viewport, and its centre not covered by something else. Retried: the bid-won banner
 * passes over the trump step for 1.6s.
 */
const onScreen = (page: Page, el: Locator, what: string) =>
  expect(() => check(page, el, what)).toPass({ timeout: 4000 });

async function check(page: Page, el: Locator, what: string) {
  const vp = page.viewportSize()!;
  const b = await el.boundingBox();
  expect(b, what).not.toBeNull();
  expect(b!.y, `${what} top`).toBeGreaterThanOrEqual(0);
  expect(b!.y + b!.height, `${what} bottom`).toBeLessThanOrEqual(vp.height + 1);
  expect(b!.x + b!.width, `${what} right`).toBeLessThanOrEqual(vp.width + 1);
  const hit = await el.evaluate((n) => {
    const r = n.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!top && (n === top || n.contains(top));
  });
  expect(hit, `${what} covered`).toBe(true);
}

for (const [w, h] of [
  [844, 390],
  [740, 360],
  [1366, 768],
  [1280, 720],
  [768, 1024],
] as const) {
  test(`${w}×${h}: seven players bid, name trump and see every card key`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/kaali-teeri');
    await ktStart(page, NAMES);
    // Quick mode: every seat is on screen and tappable, and picking one arms Confirm.
    for (const n of NAMES)
      await onScreen(page, page.getByRole('button', { name: new RegExp(`^${n}\\b`) }).first(), n);
    await page
      .getByRole('button', { name: /^Meera\b/ })
      .first()
      .click();
    const confirm = page.getByRole('button', { name: 'Meera · 350', exact: true }).first();
    await onScreen(page, confirm, 'Confirm');
    await confirm.click();

    for (const suit of ['Spades', 'Hearts', 'Diamonds', 'Clubs'])
      await onScreen(page, ktBtn(page, new RegExp(`${suit}$`)), `trump ${suit}`);
    await ktBtn(page, /Spades$/).click();
    await ktBtn(page, /^Next: call/).click();

    const ranks = page.getByRole('group', { name: 'Rank' }).getByRole('button');
    const suits = page.getByRole('group', { name: 'Suit' }).getByRole('button');
    await expect(ranks).toHaveCount(13);
    for (const k of [...(await ranks.all()), ...(await suits.all())])
      await onScreen(
        page,
        k,
        `key ${(await k.getAttribute('aria-label')) ?? (await k.innerText())}`,
      );
  });
}

// KT-F03: long names wrap at spaces, never inside a word, on the bidding and points screens and the score panel.
for (const [w, h] of [
  [360, 800],
  [1280, 720],
  [1366, 768],
  [1920, 1080],
] as const) {
  test(`${w}×${h}: long names are never broken mid-word`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/kaali-teeri');
    await ktStart(page, NAMES);
    const words = NAMES.flatMap((n) => n.split(' '));
    const broken = async (screen: string) =>
      (await auditScreen(page, screen)).brokenWords
        .filter((x) => words.includes(x))
        .map((x) => `${screen}: ${x}`);
    const found = await broken('bidding');
    await page
      .getByRole('button', { name: /^Bartholomew\b/ })
      .first()
      .click();
    await page.getByRole('button', { name: 'Bartholomew Jr · 350', exact: true }).first().click();
    await ktBtn(page, /Spades$/).click();
    await ktBtn(page, /^Next: call/).click();
    for (const r of ['A', 'K']) {
      await ktBtn(page, r).click();
      await ktBtn(page, 'Hearts').click();
      await ktBtn(page, '1st played').click();
    }
    await page.getByRole('button', { name: /^Call [AKQJ0-9]/ }).click();
    await ktBtn(page, /^Hand over/).click();
    await playedBy(page, /^Ace of hearts/, 'Konstantinos');
    await playedBy(page, /^King of hearts/, 'Konstantinos');
    found.push(...(await broken('points')));
    expect(found).toEqual([]);
  });
}
