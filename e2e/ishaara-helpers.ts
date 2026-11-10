import { expect, type Browser, type Page } from '@playwright/test';
import { signIn, type Who } from './backend';

/** Ishaara's two-device e2e: the table (Jay, the host) and the clue phones (Riya for Sun, Kabir for Moon). */

export type Team = 'sun' | 'moon';
export type Identity = Team | 'blank' | 'trap';
export const TEAM: Record<Team, string> = { sun: 'Sun', moon: 'Moon' };
export const other = (t: Team): Team => (t === 'sun' ? 'moon' : 'sun');

/** Board words for games made through the API: letters only, none inside another or inside a clue we send. */
export const WORDS = [
  'river',
  'kite',
  'train',
  'mango',
  'bridge',
  'mirror',
  'ghost',
  'wedding',
  'rocket',
  'temple',
  'pepper',
  'lion',
  'ocean',
  'film',
  'market',
  'needle',
  'crown',
  'shadow',
  'clock',
  'garden',
  'dosa',
  'thunder',
  'pilot',
  'chai',
  'tiger',
];

export const ishBtn = (page: Page, name: string | RegExp) =>
  page.getByRole('button', { name, exact: typeof name === 'string' });

/**
 * Signs `who` in on Kachuful's screen, then opens Ishaara's home. `circle` waits for Kachuful's sync to learn who
 * this account has played with: setup offers only those people, and only Kachuful's sync fetches them.
 */
export async function openIshaara(page: Page, who: Who, o: { circle?: boolean } = {}) {
  const met = o.circle
    ? page.waitForResponse((r) => /\/api\/players\/[^/?]+\/games/.test(r.url()), {
        timeout: 15_000,
      })
    : null;
  await signIn(page, who);
  await expect(page.getByRole('button', { name: 'Me', exact: true })).toBeVisible();
  await met;
  await page.goto('/ishaara');
  await expect(page.getByRole('heading', { level: 1, name: 'Ishaara' })).toBeVisible();
}

/** A phone of its own (a new context, so its own sign-in) for a clue-giver, on Ishaara's home. */
export async function cluePhone(browser: Browser, who: Who, gameId: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await onlyGame(page, gameId);
  await openIshaara(page, who);
  return page;
}

/**
 * The mock API is shared by every test running at once, and Jay hosts (Riya and Kabir give clues in) all of them:
 * the game lists this page reads are cut to this test's game, so the one row on screen is ours.
 */
export async function onlyGame(page: Page, gameId: string) {
  await page.route(/\/api\/ishaara\/games(\?.*)?$/, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const res = await route.fetch();
    const body = await res.json();
    body.items = (body.items as { id: string }[]).filter((g) => g.id === gameId);
    body.nextCursor = null;
    await route.fulfill({ response: res, json: body });
  });
}

/** Opens the one game in progress from Ishaara's home (the table's board, or a clue phone's key gate). */
export async function openFromHome(page: Page) {
  const row = page.getByRole('region', { name: 'Ishaara' }).locator('section ul button');
  await expect(row).toHaveCount(1);
  await row.click();
}

/** On a clue phone: past the gate to the key. */
export async function showKey(page: Page) {
  await openFromHome(page);
  await ishBtn(page, 'Show key').click();
  await expect(page.getByRole('list', { name: 'Your key', exact: true })).toBeVisible();
}

const IDS: Record<string, Identity> = {
  'Sun’s word': 'sun',
  'Moon’s word': 'moon',
  blank: 'blank',
  'the trap': 'trap',
};

/** The key as the clue phone shows it: each card's accessible name says its word and identity. */
export async function readKey(page: Page): Promise<Map<string, Identity>> {
  const cells = page.getByRole('list', { name: 'Your key', exact: true }).locator('li > *');
  await expect(cells).toHaveCount(25);
  const key = new Map<string, Identity>();
  for (const label of await cells.evaluateAll((els) =>
    els.map((e) => e.getAttribute('aria-label') ?? ''),
  )) {
    const [word, id] = label.split(', ');
    key.set(word, IDS[id]);
  }
  return key;
}

/** Face-down words of one identity, by the table's own labels. */
export async function faceDown(table: Page, key: Map<string, Identity>, id: Identity) {
  const down = await table
    .getByRole('list', { name: 'Words', exact: true })
    .getByRole('button', { name: /, face down$/ })
    .evaluateAll((els) => els.map((e) => (e.getAttribute('aria-label') ?? '').split(',')[0]));
  return down.filter((w) => key.get(w) === id);
}

export interface GameOpts {
  timerSec?: 60 | 120 | 180 | null;
  clueEntry?: 'typed' | 'spoken';
  bestOf?: 1 | 3;
}

/** Creates a game as the signed-in host on `page` (Riya gives Sun's clues, Kabir Moon's); returns its id. */
export async function createGame(page: Page, o: GameOpts = {}) {
  const res = await page.request.get('/api/players');
  const all = (await res.json()) as
    { id: string; displayName: string }[] | { items: { id: string; displayName: string }[] };
  const list = Array.isArray(all) ? all : all.items;
  const by = (n: string) => list.find((p) => p.displayName === n)!;
  const seats: [string, Team, boolean][] = [
    ['Riya', 'sun', true],
    ['Asha', 'sun', false],
    ['Om', 'sun', false],
    ['Kabir', 'moon', true],
    ['Neha', 'moon', false],
    ['Dev', 'moon', false],
  ];
  const players = seats.map(([n, team, giver]) => {
    const p = by(n);
    return {
      id: p.id,
      name: n,
      emoji: '🙂',
      color: '#888888',
      playerId: p.id,
      team,
      role: giver ? 'clue-giver' : 'guesser',
    };
  });
  const id = crypto.randomUUID();
  const r = await page.request.post('/api/ishaara/games', {
    headers: { 'X-Kachuful': '1' },
    data: {
      id,
      players,
      words: WORDS,
      rules: {
        timerSec: o.timerSec ?? null,
        clueEntry: o.clueEntry ?? 'typed',
        packs: ['everyday'],
        bestOf: o.bestOf ?? 1,
      },
    },
  });
  expect(r.status(), await r.text()).toBe(201);
  return id;
}

export interface Game {
  turn: Team;
  status: 'waiting' | 'active' | 'finished';
  revealed: (Identity | null)[];
  words: string[];
  clue: unknown;
  winner: Team | null;
  endedBy: string | null;
  next: string | null;
  pending: unknown;
}

/** The public state, as the table may read it. */
export async function stateOf(page: Page, id: string): Promise<Game> {
  return (await (await page.request.get(`/api/ishaara/games/${id}`)).json()).game;
}

/** Moves the mock API's Ishaara clock on (shared by every test: only the serial clock spec uses it). */
export async function advanceClock(page: Page, ms: number) {
  const r = await page.request.post('/api/__mock/ishaara/clock', { data: { advanceMs: ms } });
  expect(r.ok()).toBe(true);
}

/** The clue-giver sends a typed clue (or, spoken, only the number). */
export async function giveClue(phone: Page, word: string | null, n: number | 'inf') {
  if (word !== null) await phone.getByLabel('Your clue · one word').fill(word);
  await ishBtn(phone, n === 'inf' ? 'Any number' : String(n)).click();
  const label = n === 'inf' ? '∞' : String(n);
  await ishBtn(
    phone,
    word === null ? `Clue given · ${label}` : `Send ${word.toUpperCase()} · ${label}`,
  ).click();
}

/** Picks a word on the table and confirms it; waits until the card shows it turned. */
export async function guess(table: Page, word: string) {
  const W = word.toUpperCase();
  await table.getByRole('button', { name: `${W}, face down`, exact: true }).click();
  await ishBtn(table, 'Confirm').click();
  await expect(
    table
      .getByRole('list', { name: 'Words', exact: true })
      .getByRole('button', { name: new RegExp(`^${W}, (?!face down)`) }),
  ).toBeVisible();
}

/** Waits for the table's board to wait on a clue from `team`. */
export async function boardWaitsFor(table: Page, team: Team, giver: string) {
  await expect(table.getByRole('region', { name: `${giver}’s clue` })).toContainText(
    `Waiting for ${giver}’s clue`,
  );
  await expect(table.getByText(`${TEAM[team]}’s turn`, { exact: true }).first()).toBeVisible();
}

export const GIVER: Record<Team, string> = { sun: 'Riya', moon: 'Kabir' };

/**
 * Records everything the table device receives over fetch, streams included (the live events come through a
 * streamed fetch, so `page.on('response')` can't read them), for the key-never-reaches-the-table check.
 */
export async function recordFetches(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __ish: { url: string; body: string }[] };
    w.__ish = [];
    const real = window.fetch.bind(window);
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await real(...args);
      const url =
        typeof args[0] === 'string' ? args[0] : args[0] instanceof URL ? args[0].href : args[0].url;
      if (!url.includes('/api/') || !res.body) return res;
      const [mine, theirs] = res.body.tee();
      const rec = { url, body: '' };
      w.__ish.push(rec);
      void (async () => {
        const r = mine.getReader();
        const dec = new TextDecoder();
        try {
          for (;;) {
            const { value, done } = await r.read();
            if (done) break;
            rec.body += dec.decode(value, { stream: true });
          }
        } catch {
          /* aborted stream */
        }
      })();
      return new Response(theirs, {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      });
    };
  });
}

/** Every key-shaped thing the table received: a `key` field, or a `solution` while the game isn't finished. */
export async function leaks(page: Page) {
  const recs = await page.evaluate(
    () => (window as unknown as { __ish: { url: string; body: string }[] }).__ish,
  );
  const out: string[] = [];
  const walk = (v: unknown, where: string) => {
    if (!v || typeof v !== 'object') return;
    const o = v as Record<string, unknown>;
    if ('key' in o) out.push(`${where}: key field`);
    if (o.solution != null && o.status !== 'finished')
      out.push(`${where}: solution before the end`);
    for (const x of Object.values(o)) walk(x, where);
  };
  for (const r of recs) {
    if (/\/key(\?|$)/.test(r.url)) out.push(`${r.url}: key request`);
    const chunks = r.url.includes('/events')
      ? r.body
          .split('\n')
          .filter((l) => l.startsWith('data: '))
          .map((l) => l.slice(6))
      : [r.body];
    for (const c of chunks) {
      try {
        walk(JSON.parse(c), r.url);
      } catch {
        /* not JSON */
      }
    }
  }
  return { out, count: recs.length, frames: recs.filter((r) => r.url.includes('/events')).length };
}

/** A game made through the API, both keys open and the table on its board; returns the key and who starts. */
export async function readyGame(page: Page, browser: Browser, o: GameOpts = {}) {
  if (!page.url().includes('/ishaara')) await openIshaara(page, 'admin');
  const id = await createGame(page, o);
  await onlyGame(page, id);
  await page.reload();
  const phones = {
    sun: await cluePhone(browser, 'riya', id),
    moon: await cluePhone(browser, 'kabir', id),
  };
  await showKey(phones.sun);
  await showKey(phones.moon);
  const key = await readKey(phones.sun);
  await openFromHome(page);
  const t = (await stateOf(page, id)).turn;
  await boardWaitsFor(page, t, GIVER[t]);
  const close = async () => {
    await phones.sun.context().close();
    await phones.moon.context().close();
  };
  return { id, phones, key, t, close };
}
