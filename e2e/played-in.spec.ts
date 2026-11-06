import { expect, test } from '@playwright/test';
import { addPlayer, apiAs, freshBackend, signIn } from './backend';
import { seedGame } from './fixtures';
import { btn } from './helpers';

// History lists the games someone else scored with you at the table, marked with who scored them.
freshBackend();
const uniq = () => Math.random().toString(36).slice(2, 7);

test('a game Kabir scored with Riya at the table shows in her History', async ({ page }) => {
  const kabir = await apiAs('kabir');
  const me = await (await kabir.get('/api/auth/me')).json();
  const riya = await apiAs('riya');
  const her = await (await riya.get('/api/auth/me')).json();
  await riya.dispose();
  const guest = await addPlayer('kabir', 'Gu' + uniq(), `gu${uniq()}@example.com`);
  const names = ['Kb' + uniq(), 'Ry' + uniq(), 'Gu' + uniq()];
  const g = seedGame(3, 'winner', names);
  // Bids that always pass the server's checks: nobody bids, so someone must have taken the tricks.
  for (const r of g.rounds) {
    r.bids = { p0: 0, p1: 0, p2: 0 };
    r.results = { p0: 'missed', p1: 'made', p2: 'made' };
  }
  const ids = [me.user.playerId, her.user.playerId, guest.id];
  const syncId = crypto.randomUUID();
  const wire = { ...g, id: 'k-' + uniq(), syncId, finishedAt: g.updatedAt };
  wire.players = g.players.map((p, i) => ({ ...p, playerId: ids[i] }));
  const put = await kabir.put(`/api/games/${syncId}`, { data: wire });
  expect(put.status(), await put.text()).toBe(200);
  await kabir.dispose();

  await signIn(page, 'riya');
  await expect(btn(page, 'Me')).toBeVisible();
  await page
    .getByRole('button', { name: /History/ })
    .first()
    .click();
  await expect(page.getByText(/Scored by Kabir/i).first()).toBeVisible({ timeout: 15_000 });
  await btn(page, 'Played in').click();
  await expect(page.getByText(/Scored by Kabir/i).first()).toBeVisible();
});
