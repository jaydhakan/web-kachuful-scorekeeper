import { expect, test, type Page } from '@playwright/test';
import { ACCOUNTS, apiAs, freshBackend, signIn, type Who } from './backend';
import { seedGame } from './fixtures';
import { btn } from './helpers';

// The server's crown news (backend-requests §6): a game scored on another phone takes the Kursi, and Riya, seated at
// that table, hears it on her own phone as a banner, then finds it in the feed.
freshBackend();
const uniq = () => Math.random().toString(36).slice(2, 7);

async function playerIds() {
  const out = {} as Record<Who, string>;
  for (const who of ['admin', 'riya', 'kabir'] as const) {
    const ctx = await apiAs(who);
    out[who] = (await (await ctx.get('/api/auth/me')).json()).user.playerId;
    await ctx.dispose();
  }
  return out;
}

const noSideScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test('a Kursi taken at the table reaches the other phones and the feed', async ({ page }) => {
  const ids = await playerIds();
  const admin = await apiAs('admin');
  type Holder = { id: string; displayName: string };
  const chair = async (): Promise<Holder[]> =>
    (
      (await (await admin.get('/api/crowns?game=kachuful')).json()).items as {
        kind: string;
        holders: Holder[];
      }[]
    ).find((c) => c.kind === 'kursi')?.holders ?? [];
  // `winner` makes every bid; the rest miss every one, so the winner finishes alone at the top.
  const upload = async (seats: string[], winner: string) => {
    const g = seedGame(
      seats.length,
      'winner',
      seats.map(() => 'Pl' + uniq()),
    );
    const w = seats.indexOf(winner);
    for (const r of g.rounds) {
      r.bids = Object.fromEntries(g.players.map((p) => [p.id, 0]));
      r.results = Object.fromEntries(g.players.map((p, i) => [p.id, i === w ? 'made' : 'missed']));
    }
    const syncId = crypto.randomUUID();
    const wire = {
      ...g,
      id: 'c-' + uniq(),
      syncId,
      updatedAt: Date.now(),
      finishedAt: Date.now(),
      players: g.players.map((p, i) => ({ ...p, playerId: seats[i] })),
    };
    const put = await admin.put(`/api/games/${syncId}`, { data: wire });
    expect(put.status(), await put.text()).toBe(200);
    return (await put.json()) as { status?: { changes: { kind: string }[] } };
  };
  // Nobody holds it yet on a fresh mock: Jay takes the first Kursi at a table without Riya.
  if (!(await chair()).length) await upload([ids.admin, ids.kabir], ids.admin);
  const holders = await chair();
  const takerWho: Who = holders.some((h) => h.id === ids.riya) ? 'kabir' : 'riya';
  const taker = ids[takerWho];

  // Riya's phone, listening on the user stream before the game ends.
  const stream = page.waitForRequest('**/api/me/events');
  await signIn(page, 'riya', { userStream: true });
  await page.waitForFunction(() => !!localStorage.getItem('kachuful.session'));
  await stream;

  // A table of three or more: Jay or Kabir sits in when the taker, Riya and the holders are fewer.
  const seats = [...new Set([taker, ids.riya, ...holders.map((h) => h.id)])];
  for (const id of [ids.admin, ids.kabir])
    if (seats.length < 3 && !seats.includes(id)) seats.push(id);
  const res = await upload(seats, taker);
  expect(res.status?.changes.map((c) => c.kind)).toContain('kursi');
  await admin.dispose();

  const banner = page.locator('[data-crown-news]');
  await expect(banner).toBeVisible({ timeout: 10_000 });
  await expect(banner).toContainText('Kursi chheeni!');
  await expect(banner).toContainText(`${ACCOUNTS[takerWho].player} ne`);
  // Phone width: the banner fits and is a full-size target.
  const box = (await banner.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(box.height).toBeGreaterThanOrEqual(44);
  await banner.click();
  await expect(banner).toBeHidden();

  // The feed, from the menu: the row names who took it from whom.
  await btn(page, 'Menu').click();
  await btn(page, 'Activity').click();
  await expect(page.getByRole('heading', { name: 'Activity' })).toBeVisible();
  const row = page
    .getByRole('button', { name: new RegExp(`${ACCOUNTS[takerWho].player} took the Kursi from`) })
    .first();
  await expect(row).toBeVisible({ timeout: 10_000 });
  expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await noSideScroll(page)).toBe(true);
  await page.setViewportSize({ width: 360, height: 740 });
  await expect(row).toBeVisible();
  expect(await noSideScroll(page)).toBe(true);
});
