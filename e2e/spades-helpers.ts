import { expect, request, type Browser } from '@playwright/test';
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

export async function phone(browser: Browser, who: Account, path: string, { motion = false } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: motion ? 'no-preference' : 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto('/kachuful');
  await signIn(page, who, { userStream: true });
  await expect(page.getByRole('button', { name: 'Me', exact: true })).toBeVisible();
  await page.goto(path);
  return page;
}
