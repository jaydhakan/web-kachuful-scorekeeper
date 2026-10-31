import type { Page } from '@playwright/test';

export const btn = (page: Page, name: string | RegExp) =>
  page.getByRole('button', { name, exact: typeof name === 'string' });

/** New Game → seat `names` → stop on setup step 3. `onStep` runs on each setup step. */
export async function toSetup3(
  page: Page,
  names: string[],
  onStep: (step: string) => Promise<void> = async () => {},
) {
  await btn(page, 'New Game').click();
  // One deck seats seven; more players need the second.
  if (names.length > 7) await btn(page, '2 decks').click();
  await btn(page, `${names.length} players`).click();
  await onStep('setup 1');
  await btn(page, 'Next').click();
  await onStep('setup 2');
  const input = page.getByLabel('Player name');
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
