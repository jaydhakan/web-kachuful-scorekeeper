import { expect, test, type Page } from '@playwright/test';
import { maxFor, newRound, type Game, type Outcome } from '@/games/kachuful/domain';
import { CURRENT_SCHEMA } from '@/games/kachuful/state/migrations';
import { openSeeded, seedArchive } from './fixtures';

const NAMES = ['Riya', 'Dev', 'Kabir', 'Asha'];
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
// Inside this month whatever the day: rounds a second apart, ending a minute ago.
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
};

/**
 * A game of `rounds` rounds; `made(seat, i)` says who made round i, every bid is `bid(seat, i)`. Finished unless
 * `active`, its rounds done one second apart from `start`.
 */
function game(
  n: number,
  rounds: number,
  start: number,
  made: (k: number, i: number) => boolean,
  o: { active?: boolean; bid?: (k: number, i: number) => number; names?: string[] } = {},
): Game {
  const names = o.names ?? NAMES;
  const players = names.map((name, i) => ({
    id: 'p' + i,
    name,
    emoji: ['🦊', '🐼', '🐯', '🦉'][i],
    color: ['#f87171', '#60a5fa', '#34d399', '#fbbf24'][i],
  }));
  const g: Game = {
    id: 'g' + n,
    syncId: uuid(n),
    rev: 1,
    createdAt: start,
    updatedAt: start + rounds * 1000,
    players,
    direction: 'cw',
    firstDealerIndex: 0,
    decks: 1,
    maxCards: maxFor(players.length, 1),
    order: 'up',
    lengthMode: 'endless',
    rounds: [],
    status: o.active ? 'active' : 'finished',
    ...(o.active ? {} : { finishedAt: start + rounds * 1000 }),
    ui: { view: 'summary', bidIdx: 0 },
    schemaVersion: CURRENT_SCHEMA,
  };
  for (let i = 0; i < rounds; i++) {
    const r = newRound(g, i);
    players.forEach((p, k) => {
      r.bids[p.id] = o.bid?.(k, i) ?? 1;
      r.results[p.id] = (made(k, i) ? 'made' : 'missed') as Outcome;
    });
    r.phase = 'done';
    r.doneAt = start + (i + 1) * 1000;
    g.rounds.push(r);
  }
  return g;
}

/**
 * The month so far on this device: 60 rounds where Riya makes every bid, Dev all but one in 6, Kabir all but one
 * in 3, Zoya one in two. Asha sat out, so she has no medal: Riya 🥇, Dev 🥈, Kabir 🥉.
 */
const history = () =>
  game(
    1,
    60,
    Math.max(monthStart() + 60e3, Date.now() - 3 * 3600e3),
    (k, i) => (k === 0 ? true : k === 1 ? i % 6 !== 0 : k === 2 ? i % 3 !== 0 : i % 2 === 0),
    { names: ['Riya', 'Dev', 'Kabir', 'Zoya'] },
  );

async function seed(page: Page, current: Game, screen: 'round' | 'winner') {
  await seedArchive(page, [history()]);
  await openSeeded(page, current, screen);
}

test('the month’s medallists play in gold, silver and bronze, and the Badshah’s miss gets a line', async ({
  page,
}) => {
  // Round 1: Riya is the only one of four to miss.
  const now = game(2, 1, Date.now() - 120e3, (k) => k !== 0, { active: true });
  await seed(page, now, 'round');
  const rows = page.getByRole('region', { name: 'Standings' });
  await expect(rows.locator('.medal-1', { hasText: 'Riya' })).toBeVisible();
  await expect(rows.locator('.medal-2', { hasText: 'Dev' })).toBeVisible();
  await expect(rows.locator('.medal-3', { hasText: 'Kabir' })).toBeVisible();
  await expect(rows.getByText("Badshah, this month's #1")).toBeAttached();
  await expect(page.locator('[data-banter]')).not.toBeEmpty();
  // Riya won the month's only game, so she holds the Kursi: a chair under her seat (the summary's table hides on a
  // phone this short, so it is only attached here).
  await expect(page.locator('[data-seat-chip][title="Kursi"]')).toBeAttached();
  await expect(page.getByText(/Everyone but/)).toHaveCount(0);
  await page.screenshot({ path: 'test-results/medals-summary.png' });
});

test('a player who passes the Badshah takes gold at the end of the game: Naya Badshah', async ({
  page,
}) => {
  // 55 rounds tonight: Asha makes every 5-bid (+50 a round), so she qualifies and passes Riya's 10.
  const now = game(3, 55, Date.now() - 600e3, () => true, {
    active: true,
    bid: (k) => (k === 3 ? 5 : 1),
  });
  await seed(page, now, 'round');
  // Before the end, the chase: Asha is on track for gold and Riya's gold is cracking.
  const rows = page.getByRole('region', { name: 'Standings' });
  await expect(rows.getByText('Asha is on track to be Badshah')).toBeAttached();
  await expect(rows.locator('.medal-1 .medal-crack')).toBeAttached();
  await page.getByRole('button', { name: 'End game' }).click();
  await page.getByRole('button', { name: 'End game' }).last().click();
  const show = page.getByRole('alert').filter({ hasText: 'Naya Badshah: Asha!' });
  await expect(show).toBeVisible({ timeout: 10_000 });
  await expect(show).toContainText('Riya was Badshah');
  // Asha finished above Riya, the Kursi's holder: both crowns on one card.
  await expect(show).toContainText('Kursi chheeni! Asha ne Riya se Kursi chheen li');
  await expect(show).toHaveCSS('opacity', '1');
  await page.screenshot({ path: 'test-results/medals-takeover.png' });
  // One tap skips it; the final standings show the medals as the game leaves them.
  await page.mouse.click(10, 400);
  await expect(show).toBeHidden();
  await expect(page.locator('.medal-1', { hasText: 'Asha' })).toBeVisible();
  // Two games tonight (the earlier one ended under three hours before this began): the night's Wrapped.
  await page.locator('[data-night-link]').click();
  await expect(page.getByRole('heading', { name: 'Tonight’s Wrapped' })).toBeVisible();
  await expect(page.getByText('2 games', { exact: true })).toBeVisible();
  const next = page.getByRole('button', { name: 'Next', exact: true });
  while (await next.isEnabled()) await next.click();
  await expect(page.getByText('The story of the night')).toBeVisible();
  await expect(page.getByText(/won \d of 2 games/)).toBeVisible();
});
