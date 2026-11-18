import { expect, test } from '@playwright/test';
import { REACTIONS } from '../src/games/spades/domain/rules';
import { STANDARD_RULES, type Seat } from '../src/games/spades/domain/types';
import { REAL } from './backend';
import { accounts, act, phone, seatedTable, viewOf } from './spades-helpers';

// The online table's moments that a test can bring about on purpose (the rest depend on the deal). Mock only.
test.skip(REAL, 'runs against the mock API');
test.use({ reducedMotion: 'no-preference' });

test('Blind Nil declared rings that seat on every phone (S2), and three matching reactions make it rain (A3)', async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const accs = await accounts(baseURL!);
  const phones = await Promise.all(accs.map((a) => phone(browser, a, '/spades', { motion: true })));
  const [host] = phones;
  const { id, bySeat } = await seatedTable(phones, { draw: false });
  const origin = new URL(host.url()).origin;
  const r = await host.request.patch(`/api/spades/tables/${id}/rules`, {
    headers: { 'X-Kachuful': '1', Origin: origin },
    data: { rules: { ...STANDARD_RULES, blindNil: true } },
  });
  expect(r.ok(), await r.text()).toBe(true);
  for (const p of phones) expect((await act(p, id, { type: 'ready' })).ok()).toBe(true);
  expect((await act(host, id, { type: 'drawForDeal' })).ok()).toBe(true);
  const { table } = await viewOf(host, id);
  expect((await act(bySeat[table.dealer as Seat], id, { type: 'deal' })).ok()).toBe(true);

  // The first to bid goes Blind Nil before looking at their cards.
  const first = (await viewOf(host, id)).table.turn as Seat;
  expect((await act(bySeat[first], id, { type: 'blindNil' })).ok()).toBe(true);
  for (const p of phones)
    await expect(p.locator(`[data-seat="${first}"] [data-blind-ring]`)).toHaveCount(1, {
      timeout: 15_000,
    });

  // Three players send the same reaction within two seconds: it rains on every phone (A3).
  const emoji = REACTIONS[0];
  for (const p of phones.slice(0, 3))
    expect((await act(p, id, { type: 'react', emoji })).ok()).toBe(true);
  // Sent through the API, a sender's own reaction isn't on its phone (the app adds it on the tap), so the fourth
  // phone, which receives all three, is the one that shows it.
  await expect(phones[3].locator(`[data-emoji-rain="${emoji}"]`)).toHaveCount(1, { timeout: 5000 });
  for (const p of phones) await p.context().close();
});
