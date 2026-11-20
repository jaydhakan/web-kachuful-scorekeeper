import { expect, test } from '@playwright/test';
import { apiAs, freshBackend, signIn } from './backend';
import { seedGame } from './fixtures';

// Baithak Wrapped for the night from the server (backend-requests §7): ended by hand, then told as a story.
freshBackend();
test.use({ reducedMotion: 'no-preference' });
const uniq = () => Math.random().toString(36).slice(2, 7);

test('Jay ends tonight from Your nights and swipes through its story', async ({ page }) => {
  const ids = await Promise.all(
    (['admin', 'riya', 'kabir'] as const).map(async (who) => {
      const ctx = await apiAs(who);
      const me = await (await ctx.get('/api/auth/me')).json();
      await ctx.dispose();
      return me.user.playerId as string;
    }),
  );
  const admin = await apiAs('admin');
  // Two finished games tonight, half an hour apart: one night.
  for (const [k, start] of [Date.now() - 2 * 3600e3, Date.now() - 3600e3].entries()) {
    const g = seedGame(3, 'winner', ['Jy' + uniq(), 'Ry' + uniq(), 'Kb' + uniq()]);
    for (const r of g.rounds) {
      r.bids = { p0: 0, p1: 0, p2: 0 };
      r.results = { p0: 'made', p1: k ? 'made' : 'missed', p2: 'missed' };
    }
    const syncId = crypto.randomUUID();
    const end = start + 30 * 60e3;
    const wire = {
      ...g,
      id: 'n-' + uniq(),
      syncId,
      createdAt: start,
      updatedAt: end,
      finishedAt: end,
      players: g.players.map((p, i) => ({ ...p, playerId: ids[i] })),
    };
    const put = await admin.put(`/api/games/${syncId}`, { data: wire });
    expect(put.status(), await put.text()).toBe(200);
  }
  const list = await (await admin.get(`/api/nights?playerId=${ids[0]}`)).json();
  await admin.dispose();
  // A reused mock server keeps a night already ended by an earlier run; every game since joins it.
  test.skip(list.items[0]?.closed !== false, 'tonight was already ended on this mock server');

  await signIn(page, 'admin');
  await page.waitForFunction(() => !!localStorage.getItem('kachuful.session'));
  await page.goto('/kachuful?open=account');
  await page.getByRole('button', { name: 'Your nights' }).click();
  await expect(page.getByText(/games so far · being counted…/)).toBeVisible();

  await page.getByRole('button', { name: 'End the night' }).click();
  const ask = page.getByRole('alertdialog', { name: 'End the night now?' });
  await ask.getByRole('button', { name: 'End the night' }).click();

  // Straight into the story: the night's first card, then a swipe to the next.
  await expect(page.getByRole('heading', { name: 'Tonight’s Wrapped' })).toBeVisible();
  const card = page.getByRole('button', { name: 'Tap for the next card' });
  await expect(card.getByText('Tonight', { exact: true })).toBeVisible();
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(card.getByText('The night’s winner')).toBeVisible();

  // Back on the list the night is counted, opened, and opens again.
  await page.getByRole('button', { name: 'Back' }).first().click();
  const row = page.locator('[data-night-row]').first();
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute('aria-label', /games · .+ won\. Open the night$/);
  await row.click();
  await expect(page.getByRole('button', { name: 'Tap for the next card' })).toBeVisible();
});
