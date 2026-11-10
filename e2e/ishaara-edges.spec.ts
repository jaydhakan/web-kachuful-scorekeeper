import { expect, test } from '@playwright/test';
import { signIn } from './backend';
import {
  boardWaitsFor,
  cluePhone,
  createGame,
  faceDown,
  GIVER,
  giveClue,
  guess,
  ishBtn,
  onlyGame,
  openFromHome,
  openIshaara,
  other,
  readKey,
  showKey,
  stateOf,
  TEAM,
} from './ishaara-helpers';

// Ishaara's edges on the mock API, a table and clue phones each in their own context (see ishaara-helpers.ts).

test('signed out, the landing card and /ishaara say Sign in to play', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /^Ishaara.*Sign in to play$/ })).toBeVisible();
  await page.goto('/ishaara');
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in to play' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
    'href',
    '/kachuful?open=signin',
  );
});

test('offline, /ishaara says it needs a connection', async ({ page, context }) => {
  await signIn(page, 'admin');
  await expect(ishBtn(page, 'Me')).toBeVisible();
  await page.goto('/ishaara');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Ishaara needs a connection' }),
  ).toBeVisible();
  await expect(ishBtn(page, 'History')).toBeVisible();
  await context.setOffline(false);
});

test('a clue-giver who joins late: the table waits, then the board appears', async ({
  page,
  browser,
}) => {
  await openIshaara(page, 'admin');
  const id = await createGame(page);
  await onlyGame(page, id);
  await page.reload();
  await openFromHome(page);
  await expect(page.getByRole('heading', { name: 'Waiting for clue-givers' })).toBeVisible();
  const joined = page.getByRole('listitem').filter({ hasText: 'Sun clue-giver' });
  await expect(joined).toContainText('Waiting');

  const riya = await cluePhone(browser, 'riya', id);
  await showKey(riya);
  await expect(riya.getByText('Waiting for the game to start')).toBeVisible();
  await expect(joined).toContainText('Joined');
  await expect(page.getByRole('listitem').filter({ hasText: 'Moon clue-giver' })).toContainText(
    'Waiting',
  );

  const kabir = await cluePhone(browser, 'kabir', id);
  await showKey(kabir);
  await expect(page.getByRole('list', { name: 'Words', exact: true })).toBeVisible();
  const turn = (await stateOf(page, id)).turn;
  await boardWaitsFor(page, turn, GIVER[turn]);
  await expect(riya.getByText('Waiting for the game to start')).toHaveCount(0);
  await riya.context().close();
  await kabir.context().close();
});

test('a typed clue on the board is blocked as it is typed', async ({ page, browser }) => {
  await openIshaara(page, 'admin');
  const id = await createGame(page);
  const turn = (await stateOf(page, id)).turn;
  const phones = {
    sun: await cluePhone(browser, 'riya', id),
    moon: await cluePhone(browser, 'kabir', id),
  };
  await showKey(phones.sun);
  await showKey(phones.moon);
  const p = phones[turn];
  await expect(p.getByText(`${TEAM[turn]}’s turn: your clue`)).toBeVisible();
  const field = p.getByLabel('Your clue · one word');
  const send = ishBtn(p, /^Send/);
  await ishBtn(p, '2').click();
  for (const [typed, says] of [
    ['River', 'RIVER is on the board, still face down'],
    ['rivers', 'RIVERS is a form of RIVER, still face down'],
    ['Tigering', 'TIGERING is a form of TIGER, still face down'],
    ['sunlion', 'SUNLION contains LION, still face down'],
  ]) {
    await field.fill(typed);
    await expect(p.getByText(says)).toBeVisible();
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(send).toBeDisabled();
  }
  await field.fill('Quasar');
  await expect(p.getByText('Not on the board. The table can still rule it out.')).toBeVisible();
  await ishBtn(p, 'Send QUASAR · 2').click();
  await expect(p.getByText('Your clue: QUASAR · 2')).toBeVisible();
  await phones.sun.context().close();
  await phones.moon.context().close();
});

test('Not allowed ends the turn, and the other clue-giver picks a free word', async ({
  page,
  browser,
}) => {
  await openIshaara(page, 'admin');
  const id = await createGame(page);
  await onlyGame(page, id);
  await page.reload();
  const turn = (await stateOf(page, id)).turn;
  const them = other(turn);
  const phones = {
    sun: await cluePhone(browser, 'riya', id),
    moon: await cluePhone(browser, 'kabir', id),
  };
  await showKey(phones.sun);
  await showKey(phones.moon);
  await openFromHome(page);
  await boardWaitsFor(page, turn, GIVER[turn]);
  const key = await readKey(phones[them]);

  await giveClue(phones[turn], 'Quasar', 2);
  await expect(page.getByRole('region', { name: /’s clue$/ })).toContainText(/quasar/i);
  const judge = phones[them];
  await ishBtn(judge, 'Not allowed').click();
  await ishBtn(judge, 'Yes, not allowed').click();

  // The table waits on the pick; the ruled-out clue-giver is told.
  await expect(
    page.getByText(`${GIVER[them]} is picking a ${TEAM[them]} word to reveal`),
  ).toBeVisible();
  await expect(
    phones[turn].getByText(
      `Your clue was ruled out. ${TEAM[them]}’s clue-giver is picking one of their words.`,
    ),
  ).toBeVisible();
  await expect(
    judge.getByRole('heading', { name: 'Pick one of your words to reveal' }),
  ).toBeVisible();
  const word = (await faceDown(page, key, them))[0];
  await judge.getByRole('button', { name: `${word}, ${TEAM[them]}’s word`, exact: true }).click();
  await ishBtn(judge, `Reveal ${word}`).click();

  await expect(
    page.getByRole('button', { name: `${word}, ${TEAM[them]}’s word`, exact: true }),
  ).toBeVisible();
  await boardWaitsFor(page, them, GIVER[them]);
  const g = await stateOf(page, id);
  expect(g.turn).toBe(them);
  expect(g.pending).toBeNull();
  await phones.sun.context().close();
  await phones.moon.context().close();
});

test('the table drops and recovers: dimmed, picks off and never queued, then live again', async ({
  page,
  browser,
  context,
}) => {
  await openIshaara(page, 'admin');
  const id = await createGame(page);
  await onlyGame(page, id);
  await page.reload();
  const turn = (await stateOf(page, id)).turn;
  const phones = {
    sun: await cluePhone(browser, 'riya', id),
    moon: await cluePhone(browser, 'kabir', id),
  };
  await showKey(phones.sun);
  await showKey(phones.moon);
  const key = await readKey(phones.sun);
  await openFromHome(page);
  await giveClue(phones[turn], 'Quasar', 3);
  await expect(page.getByRole('region', { name: /’s clue$/ })).toContainText(/quasar/i);
  const [w1, w2] = await faceDown(page, key, turn);

  const sent: string[] = [];
  page.on('request', (r) => r.method() === 'POST' && sent.push(r.url()));
  await context.setOffline(true);
  await expect(page.getByText('You’re offline')).toBeVisible();
  await expect(page.getByRole('main')).toHaveAttribute('aria-busy', 'true');
  const card = page.getByRole('button', { name: `${w1}, face down`, exact: true });
  await expect(card).toHaveAttribute('aria-disabled', 'true');
  await card.click({ force: true });
  await expect(ishBtn(page, 'Confirm')).toHaveCount(0);

  await context.setOffline(false);
  await expect(page.getByText('You’re offline')).toHaveCount(0);
  await expect(page.getByText('Reconnecting…')).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByRole('main')).not.toHaveAttribute('aria-busy', 'true');
  // Nothing was sent while offline, and nothing turned on its own.
  expect(sent.filter((u) => u.includes('/actions'))).toEqual([]);
  expect((await stateOf(page, id)).revealed.filter((x) => x !== null)).toEqual([]);
  await guess(page, w2);
  await phones.sun.context().close();
  await phones.moon.context().close();
});
