import { expect, test } from '@playwright/test';
import {
  boardWaitsFor,
  faceDown,
  GIVER,
  giveClue,
  guess,
  ishBtn,
  other,
  readyGame,
  TEAM,
} from './ishaara-helpers';

// Ishaara's achievements on the mock API, which works them out from its finished games as the server does.
test('a clue for 3 found in full pops on the board, shows on the result and on Awards and Achievements', async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  const { phones, key, t, close } = await readyGame(page, browser);

  // Three of the team's own for a clue of 3, then the bonus guess finds a fourth: the turn is over.
  await giveClue(phones[t], 'zephyr', 3);
  for (const w of (await faceDown(page, key, t)).slice(0, 4)) await guess(page, w);
  await expect(page.getByText(`${TEAM[t]} · Mind meld`)).toBeVisible();
  await expect(page.getByText(`${TEAM[t]} · Overtime`)).toBeVisible();

  // The other team walks into the trap.
  const o = other(t);
  await boardWaitsFor(page, o, GIVER[o]);
  await giveClue(phones[o], 'quasar', 1);
  await guess(page, (await faceDown(page, key, 'trap'))[0]);
  await ishBtn(page, 'See the result').click();

  // The reel puts game finish first; with six players the turn moments can fall past its 12 cards.
  const reel = page.getByRole('list', { name: 'Achievements' });
  await expect(reel.getByText('Lucky escape').first()).toBeVisible();
  await close();

  await ishBtn(page, 'Back to games').first().click();
  await page.getByRole('button', { name: 'Awards' }).click();
  await expect(page.getByRole('heading', { name: 'Awards' })).toBeVisible();
  await page
    .getByRole('button', { name: /Achievements/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'Turn moments' })).toBeVisible();
  await expect(page.getByText('Mind meld').first()).toBeVisible();
});
