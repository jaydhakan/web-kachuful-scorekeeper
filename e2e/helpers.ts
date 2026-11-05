import type { Page } from '@playwright/test';

export const btn = (page: Page, name: string | RegExp) =>
  page.getByRole('button', { name, exact: typeof name === 'string' });

/** Opens Setup 1's collapsed Advanced section (decks, direction); a no-op when already open. */
export async function openAdvanced(page: Page) {
  const toggle = btn(page, /^Advanced/);
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
}

/** Setup 2's names are typed in the Add player sheet: opens it unless it is open, and returns its field. */
export async function nameField(page: Page) {
  const field = page.getByRole('dialog').getByLabel('Player name');
  if (!(await field.isVisible())) await btn(page, 'Add player').click();
  return field;
}

/** New Game → seat `names` → stop on setup step 3. `onStep` runs on each setup step. */
export async function toSetup3(
  page: Page,
  names: string[],
  onStep: (step: string) => Promise<void> = async () => {},
) {
  await btn(page, 'New Game').click();
  // One deck seats seven; more players need the second.
  if (names.length > 7) {
    await openAdvanced(page);
    await btn(page, '2 decks').click();
  }
  await btn(page, `${names.length} players`).click();
  await onStep('setup 1');
  await btn(page, 'Next').click();
  await onStep('setup 2');
  const input = await nameField(page);
  for (const [i, n] of names.entries()) {
    await input.fill(n);
    await input.press('Enter');
    await page.getByText(`${i + 1} of ${names.length} seated`).waitFor();
  }
  await btn(page, 'Next').click();
  await onStep('setup 3');
}

/** Setup → Deal → skip the deal animation. */
export async function startGame(
  page: Page,
  names: string[],
  onStep: (step: string) => Promise<void> = async () => {},
) {
  await toSetup3(page, names, onStep);
  await btn(page, 'Deal!').click();
  await btn(page, 'Skip the deal animation').click();
}

export const NAMES7 = ['Aarav', 'Riya', 'Kabir', 'Meera', 'Dev', 'Isha', 'Zoravar'];

export async function bidEveryone(page: Page) {
  // Everyone bids 1 except the dealer, who picks the first legal number.
  for (let i = 0; i < 20; i++) {
    if (await btn(page, 'Start playing').isVisible()) return;
    const locked = await page.getByRole('button', { name: /^Locked/ }).count();
    const pick =
      locked && (await page.getByRole('button', { name: 'Locked 1' }).count()) ? 'Bid 0' : 'Bid 1';
    await btn(page, pick).click();
    await page.waitForTimeout(350);
  }
}

/** Bids, plays and confirms the round on the table, with the first set of Made results that adds up. */
export async function playRound(page: Page) {
  await bidEveryone(page);
  await btn(page, 'Start playing').click();
  await btn(page, 'Enter results').click();
  const rows = page.getByRole('group', { name: /^Result for / });
  await rows.first().waitFor();
  const groups = await rows.all();
  for (let mask = 0; mask < 2 ** groups.length; mask++) {
    for (const [i, g] of groups.entries()) {
      // A pressed mark toggles off when tapped again, so only tap the one that isn't set.
      const b = g.getByRole('button', { name: mask & (1 << i) ? /Made/ : /Missed/ });
      if ((await b.getAttribute('aria-pressed')) !== 'true') await b.click();
    }
    if (await btn(page, 'Confirm round').isEnabled()) break;
  }
  await btn(page, 'Confirm round').click();
}

/** A new player, signed in, needs an email before taking the seat. */
export async function giveEmail(
  page: Page,
  name: string,
  email = `${name.toLowerCase()}@test.dev`,
) {
  const field = page.getByLabel(`${name}'s email`);
  await field.fill(email);
  await field.press('Enter');
}
