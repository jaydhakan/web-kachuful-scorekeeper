import { expect, test, type Page } from '@playwright/test';
import {
  boardWaitsFor,
  cluePhone,
  faceDown,
  GIVER,
  giveClue,
  guess,
  ishBtn,
  leaks,
  openIshaara,
  other,
  readKey,
  readyGame,
  recordFetches,
  showKey,
  stateOf,
  TEAM,
  type Team,
} from './ishaara-helpers';
import { freshBackend } from './backend';

// Whole Ishaara games, the table (Jay) and each clue phone in its own context: on the mock API, or the real backend
// with E2E_API=local (a fresh demo database per test).
freshBackend();

/** Seats a known player from the setup's Add player sheet. */
async function seat(page: Page, name: string) {
  const field = page.getByRole('dialog').getByLabel('Player name');
  await field.fill(name);
  // Known players need no email; wait until the registry has them from the server.
  await expect(
    page.getByText(`${name} is already in your games, so no email is needed.`),
  ).toBeVisible();
  await field.press('Enter');
  await expect(
    page.getByRole('dialog').getByRole('button', { name: `Remove ${name}`, exact: true }),
  ).toBeVisible();
}

test('a full game set up on the table, played to all found; the key never reaches the table', async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  await recordFetches(page);
  const keyRequests: string[] = [];
  page.on('request', (r) => /\/key(\?|$)/.test(r.url()) && keyRequests.push(r.url()));
  await openIshaara(page, 'admin', { circle: true });

  // Setup: Jay starts alone on Sun; the sheet seats the rest on the smaller team each time.
  await ishBtn(page, 'New game').click();
  await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible();
  await ishBtn(page, 'Add player').click();
  for (const n of ['Riya', 'Kabir', 'Asha', 'Om', 'Neha']) await seat(page, n);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // Kabir gives Sun's clues, so the host's table is only a table; Riya is Moon's only signed-in player.
  await page.getByRole('radio', { name: 'Kabir gives the clues' }).check();
  await ishBtn(page, 'Next: words').click();
  await expect(page.getByRole('heading', { name: 'Words and rules' })).toBeVisible();
  await ishBtn(page, 'Spoken').click();
  const created = page.waitForResponse(
    (r) => r.url().endsWith('/api/ishaara/games') && r.request().method() === 'POST',
  );
  await ishBtn(page, 'Start game').click();
  const id = (await (await created).json()).game.id as string;
  await expect(page.getByRole('heading', { name: 'Waiting for clue-givers' })).toBeVisible();
  await expect(page.getByText('Kabir and Riya, open')).toBeVisible();

  const giver: Record<Team, string> = { sun: 'Kabir', moon: 'Riya' };
  const phones = {
    sun: await cluePhone(browser, 'kabir', id),
    moon: await cluePhone(browser, 'riya', id),
  };
  await showKey(phones.sun);
  await showKey(phones.moon);
  const key = await readKey(phones.sun);
  const t = (await stateOf(page, id)).turn;
  const u = other(t);
  await boardWaitsFor(page, t, giver[t]);

  // T: one word, then End turn.
  await giveClue(phones[t], null, 1);
  await expect(page.getByText('Clue given', { exact: true })).toBeVisible();
  await expect(ishBtn(page, `End ${TEAM[t]}’s turn`)).toBeDisabled();
  await guess(page, (await faceDown(page, key, t))[0]);
  await ishBtn(page, `End ${TEAM[t]}’s turn`).click();
  await boardWaitsFor(page, u, giver[u]);

  // U: one of theirs, then a blank ends the turn.
  await giveClue(phones[u], null, 2);
  await guess(page, (await faceDown(page, key, u))[0]);
  await guess(page, (await faceDown(page, key, 'blank'))[0]);
  await boardWaitsFor(page, t, giver[t]);

  // T: no limit, and every word left.
  await giveClue(phones[t], null, 'inf');
  for (const w of await faceDown(page, key, t)) await guess(page, w);

  await expect(page.getByRole('heading', { name: `${TEAM[t]} wins` })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText(`${TEAM[t]} found all 9 words.`)).toBeVisible();
  await expect(page.getByRole('list', { name: 'The full key, every card' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Clue log' }).getByRole('listitem')).toHaveCount(3);
  await expect(phones[t].getByText('Your team won.')).toBeVisible();
  await expect(phones[u].getByText('Your team lost this one.')).toBeVisible();

  const seen = await leaks(page);
  expect(keyRequests).toEqual([]);
  expect(seen.out).toEqual([]);
  expect(seen.frames).toBeGreaterThan(0);
  await phones.sun.context().close();
  await phones.moon.context().close();
});

test('picking the trap loses at once', async ({ page, browser }) => {
  const { phones, key, t, close } = await readyGame(page, browser);
  await giveClue(phones[t], 'Quasar', 2);
  const trap = (await faceDown(page, key, 'trap'))[0];
  await page.getByRole('button', { name: `${trap}, face down`, exact: true }).click();
  await ishBtn(page, 'Confirm').click();
  await expect(page.getByText(`Trap! ${trap}`).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: `${TEAM[other(t)]} wins` })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText(`${TEAM[t]} picked the trap: ${trap}.`)).toBeVisible();
  await expect(phones[t].getByText('The trap was picked. Your team lost this one.')).toBeVisible();
  await close();
});

test('rematch: the table deals the next game and Next game takes the clue phones there', async ({
  page,
  browser,
}) => {
  const { id, phones, t, close } = await readyGame(page, browser);
  await giveClue(phones[t], 'Quasar', 2);
  await ishBtn(page, 'Menu').click();
  await ishBtn(page, `${TEAM[t]} resigns`).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Resign' }).click();
  await expect(page.getByText(`${TEAM[t]} resigned.`)).toBeVisible({ timeout: 10_000 });

  await ishBtn(page, 'Rematch').click();
  await expect(page.getByRole('heading', { name: 'Waiting for clue-givers' })).toBeVisible();
  const next = (await stateOf(page, id)).next!;
  expect(next).toBeTruthy();
  for (const p of [phones.sun, phones.moon]) {
    await ishBtn(p, 'Next game').click();
    await ishBtn(p, 'Show key').click();
  }
  // The game starts once both keys are open; the second may still be on its way.
  await expect.poll(async () => (await stateOf(page, next)).status).toBe('active');
  const g = await stateOf(page, next);
  // The new game's board, and only it: the finished one is gone.
  await expect(page.getByRole('list', { name: 'Words', exact: true })).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: `${g.words[0].toUpperCase()}, face down`, exact: true }),
  ).toBeVisible();
  // The team that went second starts the rematch.
  expect(g.turn).toBe(other(t));
  await boardWaitsFor(page, other(t), GIVER[other(t)]);
  await close();
});
