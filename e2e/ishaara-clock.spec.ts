import { expect, test } from '@playwright/test';
import {
  advanceClock,
  boardWaitsFor,
  faceDown,
  GIVER,
  giveClue,
  guess,
  ishBtn,
  other,
  readyGame,
  stateOf,
} from './ishaara-helpers';

// The mock's Ishaara clock is shared by every test, so the tests that lean on time run here, one after another.
test.describe.configure({ mode: 'serial' });

test('a mis-tap is undone within 10 seconds, even one that ended the turn', async ({
  page,
  browser,
}) => {
  const { id, phones, key, t, close } = await readyGame(page, browser);
  await giveClue(phones[t], 'Quasar', 2);
  const wrong = (await faceDown(page, key, other(t)))[0];
  await guess(page, wrong);
  await boardWaitsFor(page, other(t), GIVER[other(t)]);
  await ishBtn(page, `Undo ${wrong}`).click();
  await expect(
    page.getByRole('button', { name: `${wrong}, face down`, exact: true }),
  ).toBeVisible();
  const g = await stateOf(page, id);
  expect(g.turn).toBe(t);
  expect(g.revealed.every((x) => x === null)).toBe(true);
  // The turn is back as it was: the clue stands and a right pick goes on.
  await expect(ishBtn(page, `Undo ${wrong}`)).toHaveCount(0);
  await guess(page, (await faceDown(page, key, t))[0]);
  await close();
});

test('the turn timer runs out and the table ends the turn itself', async ({ page, browser }) => {
  // The table's own clock moves on with the server's, so its timer fires without waiting a minute.
  await page.clock.install();
  const { id, phones, t, close } = await readyGame(page, browser, { timerSec: 60 });
  await giveClue(phones[t], 'Quasar', 2);
  await expect(page.getByRole('timer', { name: /left on the timer$/ })).toBeVisible();
  const sent: string[] = [];
  page.on('request', (r) => {
    const body = r.postData();
    if (r.url().endsWith('/actions') && body) sent.push(JSON.parse(body).type);
  });
  await advanceClock(page, 61_000);
  await page.clock.fastForward(61_000);
  await boardWaitsFor(page, other(t), GIVER[other(t)]);
  expect(sent).toContain('timeout');
  const g = (await stateOf(page, id)) as unknown as { log: { type: string }[] };
  expect(g.log.map((e) => e.type)).toContain('timeout');
  await close();
});
