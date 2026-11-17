import { expect, test, type Page } from '@playwright/test';

// Signed out, the scorekeeper works its achievements out on the phone from the games it keeps.
const GROUP = {
  players: [
    { name: 'Riya', emoji: '🐯', color: '#60a5fa' },
    { name: 'Arjun', emoji: '🦊', color: '#ff8a65' },
    { name: 'Dev', emoji: '🐵', color: '#f87171' },
    { name: 'Meera', emoji: '🦉', color: '#2dd4bf' },
  ],
  direction: 'cw',
  rules: { target: 200, timerSec: null, nil: true, blindNil: false, minTeamBid: null, mercy: null },
  at: 1,
};

async function tap(page: Page, name: string | RegExp) {
  const el = page.getByRole('button', { name, exact: typeof name === 'string' });
  await expect(el).toHaveCount(1);
  await el.click();
}

/** Riya and Dev (Team A) bid 12 and take all 13: a Boston. */
async function boston(page: Page, order: string[]) {
  const bids: Record<string, string> = { Riya: '6', Dev: '6', Arjun: '1', Meera: '1' };
  for (const who of order)
    await page
      .getByRole('group', { name: `Bid for ${who}` })
      .getByRole('button', { name: bids[who], exact: true })
      .click();
  await tap(page, 'Play the hand');
  await page
    .getByRole('group', { name: 'Tricks taken by Team A' })
    .getByRole('button', { name: '13 tricks' })
    .click();
  await tap(page, 'Save hand');
}

test('a Boston pops as the hand is saved, shows on the winner reel, and shows on Awards and Achievements', async ({
  page,
}) => {
  await page.addInitScript((g) => {
    if (!localStorage.getItem('spades.lastGroup'))
      localStorage.setItem('spades.lastGroup', JSON.stringify(g));
  }, GROUP);
  await page.goto('/spades?keep');
  await tap(page, /Same four as last time/);
  await tap(page, 'Next');
  await tap(page, 'Start the game');

  await boston(page, ['Arjun', 'Dev', 'Meera', 'Riya']);
  // Partners who earn the same thing share one card.
  await expect(page.getByText('Riya & Dev · Boston')).toBeVisible();
  await expect(page.getByText('Riya & Dev · Set Them')).toBeVisible();

  await tap(page, /Next hand/);
  await boston(page, ['Dev', 'Meera', 'Riya', 'Arjun']);
  await tap(page, 'See the winner');
  const reel = page.getByRole('list', { name: 'Achievements' });
  await expect(reel.getByText('Boston').first()).toBeVisible();

  await page.goto('/spades?keep&page=awards');
  await expect(page.getByRole('heading', { name: 'Awards' })).toBeVisible();
  await page
    .getByRole('button', { name: /Achievements/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'Hand moments' })).toBeVisible();
  await expect(page.getByText('Boston').first()).toBeVisible();
});
