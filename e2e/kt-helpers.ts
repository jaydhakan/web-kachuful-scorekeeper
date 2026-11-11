import { expect, type Page } from '@playwright/test';

export const ktBtn = (page: Page, name: string | RegExp) =>
  page.getByRole('button', { name, exact: typeof name === 'string' });

/** From Kaali Teeri's home: New Game with `names` seated in order, `dealer` (seat index) dealing; ends on hand 1. */
export async function ktStart(
  page: Page,
  names: string[],
  o: { dealer?: number; first1000?: boolean } = {},
) {
  await ktBtn(page, 'New Game').click();
  for (let n = 4; n < names.length; n++) await ktBtn(page, 'One player more').click();
  if (o.first1000) await ktBtn(page, 'First to 1000').click();
  await ktBtn(page, /^Next: seat/).click();
  await ktBtn(page, 'Add player').click();
  const field = page.getByPlaceholder('Search or add a name');
  for (const n of names) {
    await field.fill(n);
    await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click();
  }
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await ktBtn(page, 'Next').click();
  if (o.dealer !== undefined) await ktBtn(page, new RegExp(`^${names[o.dealer]}\\b`)).click();
  await ktBtn(page, 'Deal!').click();
  await expect(page.getByRole('switch', { name: /^Quick mode/ })).toBeVisible();
}

/** Quick mode: the winner's seat, then the amount by steps from the minimum, then Confirm. */
export async function quickBid(page: Page, who: string, bid: number, min = 150) {
  await page
    .getByRole('button', { name: new RegExp(`^${who}\\b`) })
    .first()
    .click();
  let at = min;
  for (const s of [25, 10, 5])
    while (bid - at >= s) {
      await ktBtn(page, `Up ${s}`).click();
      at += s;
    }
  await ktBtn(page, `${who} · ${bid}`).click();
}

/** Names trump, then calls each card (rank, suit and, with two decks, which copy) and confirms the call. */
export async function callCards(
  page: Page,
  trump: 'Spades' | 'Hearts' | 'Diamonds' | 'Clubs',
  cards: { rank: string; suit: 'Spades' | 'Hearts' | 'Diamonds' | 'Clubs'; copy?: string }[],
) {
  await ktBtn(page, new RegExp(`${trump}$`)).click();
  await ktBtn(page, /^Next: call/).click();
  for (const c of cards) {
    await ktBtn(page, c.rank).click();
    await ktBtn(page, c.suit).click();
    if (c.copy) await ktBtn(page, c.copy).click();
  }
  await ktBtn(page, /^Call /).click();
  await expect(ktBtn(page, /^Hand over/)).toBeVisible();
}

/** Marks who played a called card ("Ace of spades"), from the play screen or the points screen. */
export async function playedBy(page: Page, card: RegExp, who: string) {
  await page.getByRole('button', { name: card }).first().click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: new RegExp(who) })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

/** Hand over, then the points: the side the switch is on starts at the exact make; steps of 25 and 5 reach `pts`. */
export async function points(
  page: Page,
  pts: number,
  o: { side?: 'defenders' | 'bidders'; total?: number; bid: number },
) {
  if (await ktBtn(page, /^Hand over/).isVisible()) await ktBtn(page, /^Hand over/).click();
  const total = o.total ?? 250;
  if (o.side === 'bidders') await page.getByRole('button', { name: /’s team$/ }).click();
  let at = o.side === 'bidders' ? o.bid : total - o.bid;
  for (const s of [25, 5]) {
    while (pts - at >= s) {
      await ktBtn(page, `Up ${s}`).click();
      at += s;
    }
    while (at - pts >= s) {
      await ktBtn(page, `Down ${s}`).click();
      at -= s;
    }
  }
}

export const confirmHand = (page: Page, n: number) => ktBtn(page, `Confirm hand ${n}`).click();
