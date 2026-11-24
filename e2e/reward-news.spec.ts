import { expect, test } from '@playwright/test';
import { apiAs, REAL, signIn } from './backend';

test.skip(REAL, 'mock-only: makes a milestone and pays for a gift through test controls');

test('a group milestone reaches the phone as a stamp, and a tap closes it', async ({ page }) => {
  const stream = page.waitForRequest('**/api/me/events');
  await signIn(page, 'admin', { userStream: true });
  await stream;
  const key = `group:all:${1000 + Math.floor(Math.random() * 1_000_000)}`;
  await page.request.post('/api/__mock/milestone', { data: { key, names: ['Jay'] } });
  const stamp = page.locator('[data-reward-news]');
  await expect(stamp).toBeVisible({ timeout: 10_000 });
  await expect(stamp).toContainText('game together');
  await stamp.click();
  await expect(stamp).toHaveCount(0);
});

test('a gift sent by someone in the circle opens on the receiver’s phone', async ({ page }) => {
  const stream = page.waitForRequest('**/api/me/events');
  await signIn(page, 'admin', { userStream: true });
  await stream;
  const riya = await apiAs('riya');
  const me = await (await riya.get('/api/me/circle')).json();
  const jay = (me.items as { playerId: string; name: string }[]).find((c) => c.name === 'Jay');
  test.skip(!jay, 'Jay isn’t in Riya’s circle in this mock');
  await page.request.post('/api/__mock/sikke', { data: { name: 'Riya', amount: 5000 } });
  const items = ['chai_cup', 'spade_pin', 'bow_tie', 'whistle', 'hoodie', 'headphones'];
  let sent = false;
  for (const itemId of items) {
    const r = await riya.post('/api/gifts', {
      data: { itemId, v: 0, toPlayerId: jay!.playerId, giftId: crypto.randomUUID() },
    });
    if (r.ok()) {
      sent = true;
      break;
    }
  }
  test.skip(!sent, 'Jay already owns every item tried');
  const card = page.locator('[data-reward-news]');
  await expect(card).toBeVisible({ timeout: 10_000 });
  await expect(card).toContainText('from Riya');
});
