import { expect, test } from '@playwright/test';
import { cardId } from '../src/games/spades/domain/cards';
import { legalPlays } from '../src/games/spades/domain/legal';
import { scoreHand } from '../src/games/spades/domain/scoring';
import type { Seat } from '../src/games/spades/domain/types';
import { REAL } from './backend';
import { accounts, act, phone, seatedTable, viewOf } from './spades-helpers';

/**
 * One whole online hand on four phones, with motion on (plan §2.4–§2.5): the dealer's hold-to-deal, every bid on its
 * phone's bid pad, the first trick played from each phone's hand, the rest sent to the server, then the summary on every
 * phone, the next deal by the next dealer, and a timed-out bid. The lobby is skipped through the API. Mock only.
 */
test.skip(REAL, 'runs against the mock API');
test.use({ reducedMotion: 'no-preference' });

test('a whole online hand: deal, bids, tricks, the summary and the next deal', async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const accs = await accounts(baseURL!);
  const phones = await Promise.all(accs.map((a) => phone(browser, a, '/spades', { motion: true })));
  const [host] = phones;
  await host.request.post('/api/__mock/spades/seed', { data: { seed: 7 } });

  const { id, bySeat } = await seatedTable(phones);
  for (const p of phones)
    await expect(p.getByRole('heading', { level: 1, name: 'Hand 1' })).toBeVisible({
      timeout: 15_000,
    });

  // The dealer holds to deal; the others wait.
  const deal = async (handNo: number) => {
    const { table } = await viewOf(host, id);
    const dealer = bySeat[table.dealer as Seat];
    const hold = dealer.getByRole('button', { name: 'Hold to shuffle & deal' });
    await expect(hold).toBeEnabled({ timeout: 15_000 });
    await hold.focus();
    await dealer.keyboard.down('Enter');
    await expect
      .poll(async () => (await viewOf(host, id)).table.phase, { timeout: 10_000 })
      .toBe('bidding');
    await dealer.keyboard.up('Enter');
    expect((await viewOf(host, id)).table.history.length).toBe(handNo - 1);
  };
  await deal(1);

  // Four bids of 3, each on its own phone's pad.
  for (let i = 0; i < 4; i++) {
    const turn = (await viewOf(host, id)).table.turn as Seat;
    const p = bySeat[turn];
    const pad = p.getByRole('region', { name: 'Your bid' });
    await expect(pad).toBeVisible({ timeout: 15_000 });
    await pad
      .getByRole('group', { name: 'Pick your bid' })
      .getByRole('button', { name: '3', exact: true })
      .click();
    await pad.getByRole('button', { name: 'Bid 3' }).click();
    await expect
      .poll(async () => (await viewOf(host, id)).table.bids[turn], { timeout: 10_000 })
      .toBe(3);
  }

  // The first trick: each phone plays a legal card from its hand.
  for (let i = 0; i < 4; i++) {
    const v0 = await viewOf(host, id);
    const turn = v0.table.turn as Seat;
    const p = bySeat[turn];
    const { me, table } = await viewOf(p, id);
    const c = legalPlays(me.hand!, table.trick, table.broken)[0];
    const el = p.locator(`[data-card-id="${cardId(c)}"]`);
    await expect(el).toBeVisible({ timeout: 15_000 });
    // The fan overlaps its cards, so a pointer lands on the next one; the keyboard plays the focused card.
    await el.focus();
    await p.keyboard.press('Enter');
    await expect
      .poll(async () => (await viewOf(host, id)).table.rev, { timeout: 10_000 })
      .toBeGreaterThan(v0.table.rev);
  }
  await expect
    .poll(async () => (await viewOf(host, id)).table.tricks.length, { timeout: 10_000 })
    .toBe(1);

  // The other twelve tricks go straight to the server; a refusal (the trick still on the table) is tried again.
  for (let guard = 0; guard < 400; guard++) {
    const { table } = await viewOf(host, id);
    if (table.phase !== 'playing') break;
    const p = bySeat[table.turn as Seat];
    const { me } = await viewOf(p, id);
    const c = legalPlays(me.hand!, table.trick, table.broken)[0];
    const r = await act(p, id, { type: 'play', card: c });
    if (!r.ok()) await p.waitForTimeout(150);
  }
  const done = await viewOf(host, id);
  expect(done.table.history.length).toBe(1);

  // The summary opens on every phone, counting up to the scorer's numbers.
  const res = scoreHand(done.table.history[0]);
  const sign = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
  for (const p of phones) {
    const sheet = p.getByRole('dialog', { name: 'Hand 1' });
    await expect(sheet).toBeVisible({ timeout: 20_000 });
    await expect(sheet.getByText('Show all four hands')).toBeVisible();
    for (const t of ['a', 'b'] as const)
      await expect(sheet.locator(`[data-net="${t}"]`)).toHaveText(sign(res[t].net), {
        timeout: 10_000,
      });
  }

  // Hand 2: the deal passes clockwise and the new dealer deals from the summary.
  const dealer2 = (((done.table.history[0]?.dealer ?? 0) + 1) % 4) as Seat;
  expect(done.table.dealer).toBe(dealer2);
  await deal(2);
  for (const p of phones)
    await expect(p.getByRole('heading', { level: 1, name: 'Hand 2' })).toBeVisible({
      timeout: 15_000,
    });

  // A bid that runs out of time: the clock jumps past the 30 s timer and another phone reports it.
  const turn = (await viewOf(host, id)).table.turn as Seat;
  const other = bySeat[((turn + 2) % 4) as Seat];
  await other.request.post('/api/__mock/spades/clock', { data: { advanceMs: 31_000 } });
  expect((await act(other, id, { type: 'timeout' })).ok()).toBe(true);
  await expect
    .poll(async () => (await viewOf(host, id)).table.bids[turn], { timeout: 10_000 })
    .not.toBeNull();
  await expect(bySeat[turn].getByText(/^Time’s up: you bid \d+$/)).toBeVisible({
    timeout: 10_000,
  });

  await host.request.post('/api/__mock/spades/seed', { data: { seed: null } });
  for (const p of phones) await p.context().close();
});
