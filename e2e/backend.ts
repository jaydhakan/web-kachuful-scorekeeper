import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { request, test, type Page } from '@playwright/test';

/**
 * The online specs run against the mock API by default, or against a real backend with E2E_API=local (HANDOFF §3
 * accounts on both). Against the real one each test starts from `seed-demo --reset`, which also clears the rate
 * limits, so those runs are serial (playwright.config.ts).
 */
export const REAL = !!process.env.E2E_API;
const BACKEND_DIR =
  process.env.KACHUFUL_BACKEND_DIR ??
  path.resolve(import.meta.dirname, '../../backend-kachuful-scorekeeper');

export const ACCOUNTS = {
  admin: { email: 'admin@kachuful.test', password: 'admin-demo', player: 'Jay' },
  riya: { email: 'riya@kachuful.test', password: 'riya-demo', player: 'Riya' },
  kabir: { email: 'kabir@kachuful.test', password: 'kabir-demo', player: 'Kabir' },
} as const;
export type Who = keyof typeof ACCOUNTS;

/** A fresh demo database before each test of a spec (real backend only; the mock is shared and never reset). */
export function freshBackend() {
  test.beforeEach(() => {
    if (REAL)
      execFileSync('uv', ['run', 'python', '-m', 'app.cli', 'seed-demo', '--reset'], {
        cwd: BACKEND_DIR,
        stdio: 'ignore',
      });
  });
}

const baseURL = () => test.info().project.use.baseURL!;

/** A signed-in API client for one of the demo accounts, sending the CSRF header and Origin like the app. */
export async function apiAs(who: Who) {
  const ctx = await request.newContext({
    baseURL: baseURL(),
    extraHTTPHeaders: { 'X-Kachuful': '1', Origin: new URL(baseURL()).origin },
  });
  const r = await ctx.post('/api/auth/login', { data: ACCOUNTS[who] });
  if (!r.ok()) throw new Error(`login ${who}: ${r.status()} ${await r.text()}`);
  return ctx;
}

const tokenOf = (url: string, key: string) => new URL(url).searchParams.get(key)!;

/** An invite token, made by the admin. */
export async function makeInvite(page: Page, email: string, playerId?: string): Promise<string> {
  if (!REAL)
    return (
      await (await page.request.post('/api/__mock/invite', { data: { email, playerId } })).json()
    ).token;
  const admin = await apiAs('admin');
  const r = await (await admin.post('/api/admin/invites', { data: { email, playerId } })).json();
  await admin.dispose();
  return tokenOf(r.inviteUrl, 'invite');
}

/** A password reset token for an account, made by the admin. */
export async function makeResetLink(page: Page, email: string): Promise<string> {
  if (!REAL)
    return (await (await page.request.post('/api/__mock/reset-link', { data: { email } })).json())
      .token;
  const admin = await apiAs('admin');
  const rows = (await (await admin.get('/api/admin/users')).json()) as {
    user: { id: string; email: string } | null;
  }[];
  const id = rows.find((x) => x.user?.email === email)!.user!.id;
  const r = await (await admin.post(`/api/admin/users/${id}/reset-link`)).json();
  await admin.dispose();
  return tokenOf(r.resetUrl, 'reset');
}

/** A registry player created by `who` (so outside everyone else's circle). */
export async function addPlayer(who: Who, displayName: string, email: string) {
  const ctx = await apiAs(who);
  const r = await ctx.post('/api/players', {
    data: { id: crypto.randomUUID(), displayName, email, emoji: '🦄', color: '#a78bfa' },
  });
  if (r.status() !== 201) throw new Error(`addPlayer: ${r.status()} ${await r.text()}`);
  const p = await r.json();
  await ctx.dispose();
  return p as { id: string; displayName: string };
}

/** Signs in through the app's own screen. */
export async function signIn(page: Page, who: Who | { email: string; password: string }) {
  const a = typeof who === 'string' ? ACCOUNTS[who] : who;
  if (!page.url().startsWith('http')) await page.goto('/');
  await page.getByRole('button', { name: 'Sign in', exact: true }).first().click();
  await page.getByLabel('Email').fill(a.email);
  await page.getByLabel('Password', { exact: true }).fill(a.password);
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
}
