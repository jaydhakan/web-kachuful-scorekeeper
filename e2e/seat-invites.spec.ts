import AxeBuilder from '@axe-core/playwright';
import { expect, request, test, type Browser, type Locator, type Page } from '@playwright/test';
import { REAL, signIn, type Who } from './backend';
import { WORDS } from './ishaara-helpers';

/**
 * Seat invites on Ishaara (plan §3, D15): creating a game invites each clue-giver who isn't the host. The invitee is
 * a fresh account per test, so invites from other tests' games (Riya and Kabir get one in every Ishaara spec) never
 * reach this page. Mock only: the real backend's runs (E2E_API) don't include this spec.
 */
test.skip(REAL, 'runs against the mock API');

const uid = () => crypto.randomUUID();
const letters = () =>
  Array.from({ length: 5 }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)])
    .join('')
    .replace(/^./, (c) => c.toUpperCase());

/** A new account with its own player, through an admin invite link; returns how to sign in and its player. */
async function freshAccount(baseURL: string) {
  const api = await request.newContext({
    baseURL,
    extraHTTPHeaders: { 'X-Kachuful': '1', Origin: new URL(baseURL).origin },
  });
  const name = `Tara${letters()}`;
  const email = `${name.toLowerCase()}@kachuful.test`;
  const { token } = await (await api.post('/api/__mock/invite', { data: { email } })).json();
  const player = { id: uid(), displayName: name, emoji: '🦋', color: '#33aa88' };
  const r = await api.post(`/api/auth/invites/${token}`, {
    data: { password: 'tara-demo', player },
  });
  expect(r.ok(), await r.text()).toBe(true);
  await api.dispose();
  return { email, password: 'tara-demo', name, playerId: player.id };
}

/** Signs `who` in on a page of its own that hears the user stream, then opens `path`. */
async function phone(
  browser: Browser,
  who: Who | { email: string; password: string },
  path: string,
) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto('/kachuful');
  await signIn(page, who, { userStream: true });
  await expect(page.getByRole('button', { name: 'Me', exact: true })).toBeVisible();
  // Invites already waiting when a page opens get no banner, so wait until this page has read the list.
  const listed = page.waitForResponse((r) => r.url().includes('/api/seat-invites'));
  await page.goto(path);
  await listed;
  return page;
}

/** No serious axe finding inside `scope`, and every control there is at least 44px. */
async function accessible(page: Page, scope: string, controls: Locator) {
  const r = await new AxeBuilder({ page }).include(scope).analyze();
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${v.id}: ${v.nodes[0].target.join(' ')}`)).toEqual([]);
  for (const el of await controls.all()) {
    const b = (await el.boundingBox())!;
    expect(Math.min(b.width, b.height), await el.innerText()).toBeGreaterThanOrEqual(44);
  }
}

/** Jay hosts; the fresh account gives Sun's clues and Kabir Moon's. Returns the game's id. */
async function createGame(host: Page, sun: { name: string; playerId: string }) {
  const all = await (await host.request.get('/api/players')).json();
  const list = (Array.isArray(all) ? all : all.items) as { id: string; displayName: string }[];
  const by = (n: string) => list.find((p) => p.displayName === n)!.id;
  const seat = (id: string, name: string, team: 'sun' | 'moon', giver: boolean) => ({
    id,
    name,
    emoji: '🙂',
    color: '#888888',
    playerId: id,
    team,
    role: giver ? 'clue-giver' : 'guesser',
  });
  const id = uid();
  const r = await host.request.post('/api/ishaara/games', {
    headers: { 'X-Kachuful': '1', Origin: new URL(host.url()).origin },
    data: {
      id,
      players: [
        seat(sun.playerId, sun.name, 'sun', true),
        seat(by('Asha'), 'Asha', 'sun', false),
        seat(by('Om'), 'Om', 'sun', false),
        seat(by('Kabir'), 'Kabir', 'moon', true),
        seat(by('Neha'), 'Neha', 'moon', false),
        seat(by('Dev'), 'Dev', 'moon', false),
      ],
      words: WORDS,
      rules: { timerSec: null, clueEntry: 'typed', packs: ['everyday'], bestOf: 1 },
    },
  });
  expect(r.status(), await r.text()).toBe(201);
  return id;
}

test('a declined clue-giver: banner, badge and card for them; "can’t make it" and Set up again for the host', async ({
  browser,
  baseURL,
}) => {
  const tara = await freshAccount(baseURL!);
  const guest = await phone(browser, tara, '/');
  const host = await phone(browser, 'admin', '/ishaara');
  await expect(host.getByRole('heading', { level: 1, name: 'Ishaara' })).toBeVisible();

  const id = await createGame(host, tara);
  await host.goto(`/ishaara?game=${id}`);
  await expect(host.getByRole('heading', { name: 'Waiting for clue-givers' })).toBeVisible();

  // The invite reaches the landing page at once: a banner, and the count on Ishaara's tile.
  const banner = guest.getByRole('region', { name: 'Invite', exact: true });
  await expect(banner).toContainText('Jay invited you to Ishaara');
  await expect(banner).toContainText('Jay’s game');
  await expect(guest.getByRole('link', { name: /^1 invite Ishaara/ })).toBeVisible();
  await accessible(guest, '[role="region"][aria-label="Invite"]', banner.getByRole('button'));
  await banner.getByRole('button', { name: 'Later' }).click();
  await expect(banner).toBeHidden();

  // Ishaara's home shows it as a card; Decline collapses it and the host hears.
  await guest.getByRole('link', { name: /Ishaara/ }).click();
  const card = guest.getByRole('article', { name: 'Jay invited you' });
  await expect(card).toContainText('you’d give Sun’s clues');
  await accessible(guest, 'article', card.getByRole('button'));
  // The card is on screen, so the banner leaves this invite to it.
  await expect(guest.getByRole('region', { name: 'Invite', exact: true })).toHaveCount(0);
  await card.getByRole('button', { name: 'Decline' }).click();
  await expect(card).toBeHidden();
  await expect(guest.getByText('Invite declined. Jay will see that.')).toBeVisible();

  await expect(host.getByText(`${tara.name} can’t make it`)).toBeVisible();
  await expect(host.getByText('Can’t make it', { exact: true })).toBeVisible();
  await host.getByRole('button', { name: 'Set up again' }).click();
  // The same table with the Sun clue-giver's seat open: everyone else is still there.
  await expect(host.getByRole('heading', { name: 'Teams' })).toBeVisible();
  await expect(host.getByText('Kabir', { exact: true }).first()).toBeVisible();
  await expect(host.getByText(tara.name)).toHaveCount(0);

  await guest.context().close();
  await host.context().close();
});

test('Join on the banner opens the clue-giver’s key gate', async ({ browser, baseURL }) => {
  const tara = await freshAccount(baseURL!);
  const guest = await phone(browser, tara, '/');
  const host = await phone(browser, 'admin', '/ishaara');
  await createGame(host, tara);

  const banner = guest.getByRole('region', { name: 'Invite', exact: true });
  await banner.getByRole('button', { name: 'Join' }).click();
  await expect(guest).toHaveURL(/\/ishaara/);
  await expect(guest.getByRole('button', { name: 'Show key' })).toBeVisible();

  await guest.context().close();
  await host.context().close();
});
