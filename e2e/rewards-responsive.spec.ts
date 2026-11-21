import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { maxFor, newRound, type Game, type Outcome } from '@/games/kachuful/domain';
import { CURRENT_SCHEMA } from '@/games/kachuful/state/migrations';
import { auditScreen, type ScreenReport } from './audit';
import { violations } from './audit-rules';
import { ACCOUNTS, REAL } from './backend';
import { openSeeded, seedArchive } from './fixtures';

/**
 * The rewards screens under the layout rules of responsive.spec: phones first, then a tablet and a laptop (the
 * large-screen UI). Screenshots go to reports/responsive/raw/<label>/rewards for a look by eye.
 */
const VIEWPORTS = [
  [390, 844],
  [360, 640],
  [360, 740],
  [768, 1024],
  [1280, 800],
] as const;
// THEME=<id> runs the same screens in another theme (themes.spec's ids); its shots go in their own folder.
const THEME = process.env.THEME;
const OUT = `reports/responsive/raw/${process.env.RESPONSIVE_LABEL ?? 'current'}/rewards${THEME ? '-' + THEME : ''}`;
const REPORT_ONLY = !!process.env.RESPONSIVE;

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
};

/** As medals.spec: `rounds` done a second apart from `start`; `made(seat, i)` says who made round i. */
function game(
  n: number,
  rounds: number,
  start: number,
  made: (k: number, i: number) => boolean,
  o: { active?: boolean; bid?: (k: number, i: number) => number; names: string[] },
): Game {
  const players = o.names.map((name, i) => ({
    id: 'p' + i,
    name,
    emoji: ['🦊', '🐼', '🐯', '🦉'][i],
    color: ['#f87171', '#60a5fa', '#34d399', '#fbbf24'][i],
  }));
  const g: Game = {
    id: 'g' + n,
    syncId: uuid(n),
    rev: 1,
    createdAt: start,
    updatedAt: start + rounds * 1000,
    players,
    direction: 'cw',
    firstDealerIndex: 0,
    decks: 1,
    maxCards: maxFor(players.length, 1),
    order: 'up',
    lengthMode: 'endless',
    rounds: [],
    status: o.active ? 'active' : 'finished',
    ...(o.active ? {} : { finishedAt: start + rounds * 1000 }),
    ui: { view: 'summary', bidIdx: 0 },
    schemaVersion: CURRENT_SCHEMA,
  };
  for (let i = 0; i < rounds; i++) {
    const r = newRound(g, i);
    players.forEach((p, k) => {
      r.bids[p.id] = o.bid?.(k, i) ?? 1;
      r.results[p.id] = (made(k, i) ? 'made' : 'missed') as Outcome;
    });
    r.phase = 'done';
    r.doneAt = start + (i + 1) * 1000;
    g.rounds.push(r);
  }
  return g;
}

for (const [w, h] of VIEWPORTS) {
  const phone = w < 500;
  test.describe(`rewards ${w}×${h}`, () => {
    test.use({
      viewport: { width: w, height: h },
      isMobile: phone,
      hasTouch: w <= 1180,
      deviceScaleFactor: phone ? 2 : 1,
    });

    test.beforeEach(async ({ page }) => {
      if (!THEME) return;
      await page.route('**/api/settings/appearance', (r) =>
        r.fulfill({
          json: { theme: THEME, allowUserOverride: false, updatedAt: null, updatedBy: null },
        }),
      );
      await page.addInitScript((t) => localStorage.setItem('kf.theme', t), THEME);
    });

    const run = async (page: Page, name: string, body: (shot: Shot) => Promise<void>) => {
      const dir = `${OUT}/${w}x${h}`;
      mkdirSync(dir, { recursive: true });
      const reports: ScreenReport[] = [];
      await body(async (screen) => {
        await page.waitForTimeout(650);
        reports.push(await auditScreen(page, screen));
        await page.screenshot({ path: `${dir}/${name}-${screen}.png` });
      });
      const found = reports.flatMap((r) => violations(r, { width: w, height: h, players: 4 }));
      if (REPORT_ONLY) found.forEach((f) => console.log(`[${w}x${h}] ${name}-${f}`));
      else expect(found, found.join('\n')).toEqual([]);
    };

    test('the table: medals, the takeover, tonight so far and its Wrapped', async ({ page }) => {
      await run(page, 'table', async (shot) => {
        await page.goto('/kachuful');
        await seedArchive(page, [
          game(
            1,
            60,
            Math.max(monthStart() + 60e3, Date.now() - 3 * 3600e3),
            (k, i) =>
              k === 0 ? true : k === 1 ? i % 6 !== 0 : k === 2 ? i % 3 !== 0 : i % 2 === 0,
            { names: ['Riya', 'Dev', 'Kabir', 'Zoya'] },
          ),
        ]);
        await openSeeded(
          page,
          game(3, 55, Date.now() - 600e3, () => true, {
            active: true,
            bid: (k) => (k === 3 ? 5 : 1),
            names: ['Riya', 'Dev', 'Kabir', 'Asha'],
          }),
          'round',
        );
        // A region on a phone, a list in the large-screen UI.
        await expect(page.getByLabel('Standings').first()).toBeVisible();
        await shot('01-summary-medals');
        await page.getByRole('button', { name: 'End game' }).first().click();
        await page.getByRole('alertdialog').getByRole('button', { name: 'End game' }).click();
        const show = page.getByRole('alert').filter({ hasText: 'Naya Badshah' });
        await expect(show).toBeVisible({ timeout: 10_000 });
        await shot('02-takeover');
        await page.mouse.click(10, h / 2);
        await expect(show).toBeHidden();
        await expect(page.getByRole('region', { name: 'Tonight so far' })).toBeAttached();
        await shot('03-winner');
        await page.getByRole('region', { name: 'Tonight so far' }).scrollIntoViewIfNeeded();
        await shot('04-tonight-so-far');
        await page.locator('[data-night-link]').click();
        await expect(page.getByRole('heading', { name: 'Tonight’s Wrapped' })).toBeVisible();
        const next = page.getByRole('button', { name: 'Next', exact: true });
        for (let i = 1; await next.isEnabled(); i++) {
          await shot(`05-wrapped-${i}`);
          await next.click();
        }
        // The last card's value arrives a beat after the card (StoryDeck's Finale).
        await expect(page.getByText(/won \d of 2 games/)).toBeVisible();
        await shot('05-wrapped-last');
      });
    });

    test('signed in: Me, Your nights, the server’s Wrapped and the feed', async ({ page }) => {
      await run(page, 'me', async (shot) => {
        // By link: the tablet's rail has no Sign in button (it is in the menu there).
        if (!REAL) await page.route('**/api/me/events', (r) => r.abort());
        await page.goto('/kachuful?open=signin');
        await page.getByLabel('Email').fill(ACCOUNTS.admin.email);
        await page.getByLabel('Password', { exact: true }).fill(ACCOUNTS.admin.password);
        await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
        await page.waitForFunction(() => !!localStorage.getItem('kachuful.session'));
        await page.goto('/kachuful?open=account');
        await expect(page.getByRole('button', { name: 'Your nights' })).toBeVisible();
        await shot('01-me');
        await page.getByRole('button', { name: 'Your nights' }).click();
        await expect(page.getByRole('heading', { name: 'Your nights' })).toBeVisible();
        await shot('02-your-nights');
        const row = page.locator('[data-night-row]').first();
        if (await row.count()) {
          await row.click();
          await expect(page.getByRole('button', { name: 'Tap for the next card' })).toBeVisible();
          await shot('03-night');
          await page.getByRole('button', { name: 'Back' }).first().click();
        }
        await page.goto('/kachuful');
        await page.getByRole('button', { name: 'Menu' }).first().click();
        await page
          .getByRole('dialog', { name: 'Menu' })
          .getByRole('button', { name: 'Activity', exact: true })
          .click();
        await expect(page.getByRole('heading', { name: 'Activity' })).toBeVisible();
        await shot('04-activity');
        await page.goto('/');
        await shot('05-landing');
      });
    });
  });
}

type Shot = (screen: string) => Promise<void>;
