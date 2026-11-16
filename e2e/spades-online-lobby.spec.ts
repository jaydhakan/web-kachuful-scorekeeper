import { expect, request, test, type Browser, type Page } from '@playwright/test';
import { REAL, signIn } from './backend';

/**
 * Spades' lobby on four phones (plan §2.2–§2.3, §3.2): the host starts a table, one person joins by code, two come
 * by seat invite (one declines first), all four say they're ready, and the draw for deal opens the table everywhere.
 * Every account is new to this test, so invites from other specs never reach these pages. Mock only.
 */
test.skip(REAL, 'runs against the mock API');

const letters = () =>
  Array.from({ length: 5 }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)])
    .join('')
    .replace(/^./, (c) => c.toUpperCase());

interface Account {
  email: string;
  password: string;
  name: string;
}

/**
 * The host, a new account; three more whose players the host made, so they're in the host's circle (the server's
 * definition) and can be invited. The last one joins by code instead.
 */
async function accounts(baseURL: string): Promise<Account[]> {
  const headers = { 'X-Kachuful': '1', Origin: new URL(baseURL).origin };
  const api = await request.newContext({ baseURL, extraHTTPHeaders: headers });
  const register = async (name: string, player: object) => {
    const email = `${name.toLowerCase()}@kachuful.test`;
    const pid = 'displayName' in player ? undefined : (player as { id: string }).id;
    const { token } = await (
      await api.post('/api/__mock/invite', { data: { email, playerId: pid } })
    ).json();
    const r = await api.post(`/api/auth/invites/${token}`, {
      data: { password: 'spades-demo-1', player },
    });
    expect(r.ok(), await r.text()).toBe(true);
    return { email, password: 'spades-demo-1', name };
  };
  const hostName = `Host${letters()}`;
  const host = await register(hostName, {
    id: crypto.randomUUID(),
    displayName: hostName,
    emoji: '🦊',
    color: '#ff8a65',
  });
  // Signed in as the host (registering signs in), make the others' players.
  const others: Account[] = [];
  for (const [i, n] of ['Ria', 'Kai', 'Zed'].entries()) {
    const name = `${n}${letters()}`;
    const id = crypto.randomUUID();
    await api.post('/api/auth/login', { data: { email: host.email, password: host.password } });
    const made = await api.post('/api/players', {
      data: {
        id,
        displayName: name,
        email: `${name.toLowerCase()}@kachuful.test`,
        emoji: ['🐯', '🐼', '🦉'][i],
        color: '#60a5fa',
      },
    });
    expect(made.status(), await made.text()).toBe(201);
    others.push(await register(name, { id }));
  }
  await api.dispose();
  return [host, ...others];
}

async function phone(browser: Browser, who: Account, path: string) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto('/kachuful');
  await signIn(page, who, { userStream: true });
  await expect(page.getByRole('button', { name: 'Me', exact: true })).toBeVisible();
  await page.goto(path);
  return page;
}

const chair = (page: Page, name: string) =>
  page.getByRole('group', { name: new RegExp(`^${name}`) });

test('four phones: create, join by code, invites (one declined first), ready, draw for deal', async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(90_000);
  const [hostAcc, riaAcc, kaiAcc, zedAcc] = await accounts(baseURL!);

  const host = await phone(browser, hostAcc, '/spades');
  await host.getByRole('button', { name: 'Start a table' }).click();
  await expect(host).toHaveURL(/\?table=[\w-]+$/);
  await expect(
    host.getByRole('heading', { level: 1, name: `${hostAcc.name}'s table` }),
  ).toBeVisible();
  await expect(
    host.getByRole('button', { name: /^Rules: 200 points · Nil · 30 s turns/ }),
  ).toBeVisible();
  await expect(host.getByRole('img', { name: /^QR code that opens table/ })).toBeVisible();
  const label = await host.getByRole('img', { name: /^Room code/ }).getAttribute('aria-label');
  const code = label!.replace('Room code ', '').replace(/ /g, '');
  expect(code).toMatch(/^[A-Z2-9]{4}$/);

  // Zed is in the room: the code. They land in the next free chair, on the host's left.
  const zed = await phone(browser, zedAcc, `/spades?join=${code}`);
  await expect(zed).toHaveURL(/\?table=[\w-]+$/);
  await expect(chair(zed, 'You')).toBeVisible();
  await expect(
    zed.getByRole('button', { name: `${hostAcc.name} deals when everyone is ready` }),
  ).toBeDisabled();
  await expect(chair(host, zedAcc.name)).toContainText('Opponent');
  await expect(host.getByText(`${zedAcc.name} joined`)).toBeVisible();

  // The host changes a rule: every phone's line follows.
  await host.getByRole('button', { name: /^Rules:/ }).click();
  await host.getByRole('group', { name: 'Play to' }).getByRole('button', { name: '300' }).click();
  await host.getByRole('button', { name: 'Done' }).click();
  await expect(zed.getByRole('button', { name: /^Rules: 300 points/ })).toBeVisible();
  await zed.getByRole('button', { name: /^Rules:/ }).click();
  await expect(zed.getByText(`Only ${hostAcc.name} can change these.`)).toBeVisible();
  await zed.getByRole('button', { name: 'Close' }).last().click();

  // Ria is invited to the partner's chair, declines; the chair shakes empty and the host hears.
  const ria = await phone(browser, riaAcc, '/spades');
  const kai = await phone(browser, kaiAcc, '/spades');
  const invite = async (place: string, who: Account) => {
    await host.getByRole('button', { name: `Invite someone to the ${place} chair` }).click();
    const sheet = host.getByRole('dialog', { name: 'Invite to this seat' });
    await expect(sheet.getByRole('button', { name: 'Move here' })).toBeVisible();
    await sheet.getByRole('button', { name: new RegExp(`^Invite ${who.name}`) }).click();
    await expect(sheet).toBeHidden();
    await expect(
      host.getByRole('button', { name: `${who.name} is invited. Cancel the invite` }),
    ).toBeVisible();
  };
  await invite('top', riaAcc);
  await expect(zed.getByRole('img', { name: `${riaAcc.name} is invited` })).toBeVisible();
  const riaCard = ria.getByRole('article', { name: `${hostAcc.name} invited you` });
  await riaCard.getByRole('button', { name: 'Decline' }).click();
  await expect(host.getByText(`${riaAcc.name} can’t join`)).toBeVisible();
  await expect(host.getByRole('button', { name: 'Invite someone to the top chair' })).toBeVisible();

  // Asked again, Ria joins from the card and lands in the lobby, in her seat.
  await invite('top', riaAcc);
  await ria
    .getByRole('article', { name: `${hostAcc.name} invited you` })
    .getByRole('button', { name: 'Join' })
    .click();
  await expect(ria).toHaveURL(/\?table=[\w-]+/);
  await expect(chair(ria, 'You')).toBeVisible();
  await expect(chair(host, riaAcc.name)).toContainText('Your partner');

  await invite('right', kaiAcc);
  await kai
    .getByRole('article', { name: `${hostAcc.name} invited you` })
    .getByRole('button', { name: 'Join' })
    .click();
  await expect(chair(kai, 'You')).toBeVisible();

  // A full table needs no share card. Draw for deal waits for everyone to be ready.
  await expect(host.getByRole('img', { name: /^QR code/ })).toHaveCount(0);
  await expect(
    host.getByRole('button', { name: 'Waiting for everyone to be ready…' }),
  ).toBeDisabled();
  for (const p of [host, zed, ria, kai]) await p.getByRole('button', { name: 'I’m ready' }).click();
  for (const p of [host, zed, ria, kai])
    await expect(chair(p, 'You')).toHaveAccessibleName(/, ready/);
  const draw = host.getByRole('button', { name: 'Draw for deal' });
  await expect(draw).toBeEnabled();
  await draw.click();

  for (const p of [host, zed, ria, kai])
    await expect(p.getByRole('heading', { level: 1, name: 'Hand 1' })).toBeVisible({
      timeout: 10_000,
    });

  for (const p of [host, zed, ria, kai]) await p.context().close();
});
