import { expect, request, type Browser, type Page } from '@playwright/test';
import type { Action, Seat, SpView } from '../src/games/spades/domain/types';
import { signIn } from './backend';

/** Spades' online specs: new accounts in one host's circle, and a signed-in phone per account. Mock only. */

const letters = () =>
  Array.from({ length: 5 }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)])
    .join('')
    .replace(/^./, (c) => c.toUpperCase());

export interface Account {
  email: string;
  password: string;
  name: string;
}

/**
 * The host, a new account; three more whose players the host made, so they're in the host's circle (the server's
 * definition) and can be invited. The last one joins by code instead.
 */
export async function accounts(baseURL: string): Promise<Account[]> {
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

export async function phone(
  browser: Browser,
  who: Account,
  path: string,
  { motion = false, viewport = { width: 390, height: 844 } } = {},
) {
  const ctx = await browser.newContext({
    viewport,
    isMobile: Math.min(viewport.width, viewport.height) < 500,
    hasTouch: true,
    reducedMotion: motion ? 'no-preference' : 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto('/kachuful');
  await signIn(page, who, { userStream: true });
  await expect(page.getByRole('button', { name: 'Me', exact: true })).toBeVisible();
  await page.goto(path);
  return page;
}

const HEADERS = { 'X-Kachuful': '1' };

/** The table as this phone's account sees it. */
export async function viewOf(page: Page, id: string): Promise<SpView> {
  const r = await page.request.get(`/api/spades/tables/${id}`);
  expect(r.ok(), await r.text()).toBe(true);
  return (await r.json()) as SpView;
}

/** Sends one action as this phone's account, at the rev it reads first. */
export async function act(page: Page, id: string, action: Action) {
  const { table } = await viewOf(page, id);
  return page.request.post(`/api/spades/tables/${id}/actions`, {
    headers: { ...HEADERS, Origin: new URL(page.url()).origin },
    data: { ...action, actionId: crypto.randomUUID(), rev: table.rev },
  });
}

/**
 * The first phone starts a table from Spades' home, the others join and everyone is ready through the API, and the
 * host draws for deal; every phone then opens the table. Returns the table and each phone by its seat.
 */
export async function seatedTable(phones: Page[], { draw = true } = {}) {
  const [host] = phones;
  await host.getByRole('button', { name: 'Start a table' }).click();
  await expect(host).toHaveURL(/\?table=[0-9a-f-]{36}$/);
  const id = new URL(host.url()).searchParams.get('table')!;
  const origin = new URL(host.url()).origin;
  for (const p of phones.slice(1)) {
    const r = await p.request.post(`/api/spades/tables/${id}/join`, {
      headers: { ...HEADERS, Origin: origin },
      data: {},
    });
    expect(r.ok(), await r.text()).toBe(true);
  }
  if (draw) {
    for (const p of phones) expect((await act(p, id, { type: 'ready' })).ok()).toBe(true);
    expect((await act(host, id, { type: 'drawForDeal' })).ok()).toBe(true);
  }
  const bySeat: Page[] = [];
  for (const p of phones) {
    if (p !== host) await p.goto(`/spades?table=${id}`);
    bySeat[(await viewOf(p, id)).me.seat as Seat] = p;
  }
  return { id, bySeat };
}
