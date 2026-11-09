import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { test, type BrowserContext, type Page } from '@playwright/test';
import type { Game } from '@/games/kachuful/domain';
import { openPodium, seedGame, type SeedView } from '../../e2e/fixtures';
import { ACCOUNTS, makeInvite, makeResetLink } from '../../e2e/backend';

const ROOT = path.resolve(import.meta.dirname, '../..');
const OUT = process.env.SHOT_DIR
  ? path.resolve(process.env.SHOT_DIR)
  : path.join(ROOT, 'screenshots');
const THEME = process.env.SHOT_THEME;
const overflow: string[] = [];
test.afterAll(() => {
  if (overflow.length) writeFileSync(path.join(OUT, 'overflow.txt'), overflow.join('\n') + '\n');
});
const NAMES = ['Aarav', 'Riya', 'Kabir', 'Meera', 'Dev', 'Isha', 'Zoya'];

const DEVICES = {
  phone: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  p360: {
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  p412: {
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  tablet: {
    viewport: { width: 820, height: 1180 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
} as const;
type Device = keyof typeof DEVICES;
const isPhone = (d: Device) => d === 'phone' || d === 'p360' || d === 'p412';
// The two extra phone sizes run only when asked for, so the default run stays as it was.
const RUN = (process.env.SHOT_DEVICES?.split(',') ?? ['phone', 'tablet', 'desktop']).map((d) => {
  if (!(d.trim() in DEVICES)) throw new Error(`SHOT_DEVICES: unknown device "${d}"`);
  return d.trim() as Device;
});

/** Every navigation, reloads included, boots in SHOT_THEME, even after the spec clears localStorage. */
async function withTheme(context: BrowserContext) {
  if (THEME) await context.addInitScript((t) => localStorage.setItem('kf.theme', t), THEME);
}

// Case-insensitive: Editorial Paper sets button labels in uppercase, and Chrome names the button as it is drawn.
const btn = (page: Page, name: string | RegExp) =>
  page
    .getByRole('button', {
      name:
        typeof name === 'string'
          ? new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
          : name,
    })
    .first();

/** Numbered screenshots per device; a step that fails is logged and skipped so one miss doesn't stop the run. */
function shooter(page: Page, device: Device, group: string) {
  const dir = path.join(OUT, device);
  mkdirSync(dir, { recursive: true });
  let n = 0;
  const missed: string[] = [];
  const shot = async (name: string, wait = 900) => {
    await page.waitForTimeout(wait);
    n++;
    await page.screenshot({
      path: path.join(dir, `${group}-${String(n).padStart(2, '0')}-${name}.png`),
    });
    // Anything wider than the screen that isn't inside a sideways scroller or a decorative layer.
    const wide = await page.evaluate(() => {
      const out: string[] = [];
      const clipped = (el: Element) => {
        for (let p = el.parentElement; p; p = p.parentElement) {
          const cs = getComputedStyle(p);
          if (cs.overflowX === 'auto' || cs.overflowX === 'scroll')
            return p.scrollWidth > p.clientWidth;
        }
        return false;
      };
      document.querySelectorAll('body *').forEach((el) => {
        const b = el.getBoundingClientRect();
        if (
          b.width === 0 ||
          b.right <= innerWidth + 1 ||
          el.closest('[aria-hidden="true"],.ambient')
        )
          return;
        const p = el.parentElement?.getBoundingClientRect();
        if (p && p.right > innerWidth + 1) return;
        if (clipped(el)) return;
        out.push(
          `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 30)}" right=${Math.round(b.right)}`,
        );
      });
      return out;
    });
    if (wide.length) overflow.push(`${device}/${group}-${name}: ${wide.slice(0, 3).join(' | ')}`);
  };
  const step = async (name: string, go: () => Promise<unknown>, wait?: number) => {
    try {
      await go();
      await shot(name, wait);
    } catch (e) {
      missed.push(`${device}/${name}: ${(e as Error).message.split('\n')[0]}`);
    }
  };
  return { shot, step, missed };
}

/** A finished or in-progress game for these names, with stable player ids so the archive sees one person each. */
function gameFor(names: string[], view: SeedView, i: number): Game {
  const g = seedGame(names.length, view, names);
  const ids = Object.fromEntries(g.players.map((p) => [p.id, 'loc-' + p.name.toLowerCase()]));
  const remap = <T>(o: Record<string, T>) =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [ids[k] ?? k, v]));
  g.players = g.players.map((p) => ({ ...p, id: ids[p.id] }));
  g.rounds = g.rounds.map((r) => ({ ...r, bids: remap(r.bids), results: remap(r.results) }));
  // Rotate the mix so each game has a different winner.
  g.rounds.forEach((r, k) =>
    g.players.forEach((p, j) => {
      if (r.results[p.id])
        r.results[p.id] = (k * 7 + j * (i + 2) + i) % 5 > j % 3 ? 'made' : 'missed';
    }),
  );
  const at = Date.now() - (i * 3 + 1) * 86400e3;
  g.id = `shot-${view}-${i}`;
  g.syncId = `22222222-2222-4222-8222-${String(i).padStart(12, '0')}`;
  g.createdAt = at - 3600e3;
  g.updatedAt = at;
  if (view === 'winner') g.finishedAt = at;
  return g;
}

async function seed(page: Page, game: Game | null, screen = 'round') {
  await page.goto('/');
  await page.evaluate(
    ([g, s]) => {
      localStorage.clear();
      if (g) {
        localStorage.setItem('kachuful.v1', JSON.stringify(g));
        localStorage.setItem('kachuful.screen', JSON.stringify(s));
      }
    },
    [game, screen] as const,
  );
  await page.reload();
  if (screen === 'winner') await openPodium(page);
}

/** Six finished games in the archive (IndexedDB), through the app's own module so boards and history fill. */
async function seedArchive(page: Page) {
  const sets = [
    NAMES.slice(0, 5),
    NAMES.slice(1, 6),
    NAMES.slice(0, 4),
    NAMES,
    NAMES.slice(2, 7),
    NAMES.slice(0, 6),
  ];
  const games = sets.map((s, i) => gameFor(s, 'winner', i));
  await page.evaluate(async (gs) => {
    const src = '/src/state/archive.ts';
    const reg = '/src/state/registry.ts';
    const a = await import(/* @vite-ignore */ src);
    const r = await import(/* @vite-ignore */ reg);
    await a.archive.ready;
    for (const g of gs) a.archiveGame(g);
    r.backfillRegistry();
  }, games);
}

async function clearAll(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise((ok) => {
      const r = indexedDB.deleteDatabase('kachuful');
      r.onsuccess = r.onerror = r.onblocked = () => ok(null);
    });
  });
  await page.context().clearCookies();
  await page.reload();
}

const resetBackend = () =>
  execFileSync('uv', ['run', 'python', '-m', 'app.cli', 'seed-demo', '--reset'], {
    cwd: path.resolve(ROOT, '../backend-kachuful-scorekeeper'),
    stdio: 'ignore',
  });

async function signIn(page: Page) {
  await go(page, /^Sign in$/);
  await page.getByLabel('Email').fill(ACCOUNTS.admin.email);
  await page.getByLabel('Password', { exact: true }).fill(ACCOUNTS.admin.password);
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Me', exact: true }).waitFor();
}

/** Back to Home: a reload drops the page stack. */
const home = async (page: Page) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: /^New game/i })
    .first()
    .waitFor({ timeout: 8000 });
};

/** A place by its button, or through the menu where the large-screen UI keeps it. */
async function go(page: Page, name: RegExp) {
  const direct = page.getByRole('button', { name }).first();
  if (await direct.isVisible().catch(() => false)) return direct.click();
  await page.getByRole('button', { name: 'Menu', exact: true }).first().click();
  await page.getByRole('dialog').last().getByRole('button', { name }).first().click();
}

const back = async (page: Page) => {
  await page.goBack();
  await page.waitForTimeout(500);
};

for (const device of RUN) {
  test.describe(device, () => {
    test.use(DEVICES[device]);
    test.beforeEach(({ context }) => withTheme(context));

    test(`${device}: game flow`, async ({ page }) => {
      test.skip(!isPhone(device), 'the large-screen UI has its own flow');
      const { shot, step, missed } = shooter(page, device, '1');
      await clearAll(page);
      await shot('home-first-run', 1400);
      await step('setup-1-players', async () => {
        await btn(page, 'New Game').click();
        const start = btn(page, 'Start new');
        if (await start.isVisible().catch(() => false)) await start.click();
      });
      await step('setup-1-five-players', () => btn(page, '5 players').click());
      await step('setup-2-empty', () => btn(page, 'Next').click());
      await step('setup-2-three-seated', async () => {
        const input = page.getByLabel('Player name');
        for (const [i, n] of NAMES.slice(0, 3).entries()) {
          await input.fill(n);
          await input.press('Enter');
          await page.getByText(`${i + 1} of 5 seated`).waitFor();
        }
        await input.fill('Me');
      });
      await step('setup-2-full', async () => {
        const input = page.getByLabel('Player name');
        await input.fill('');
        for (const [i, n] of NAMES.slice(3, 5).entries()) {
          await input.fill(n);
          await input.press('Enter');
          await page.getByText(`${i + 4} of 5 seated`).waitFor();
        }
      });
      await step('setup-3-dealer', () => btn(page, 'Next').click());
      await step('deal-animation', () => btn(page, 'Deal!').click(), 1300);
      await step('bidding-first', async () => {
        await btn(page, 'Skip the deal animation')
          .click()
          .catch(() => {});
      });

      // A game well into its rounds, so scores, streaks and sheets show real data.
      const five = NAMES.slice(0, 5);
      await seed(page, gameFor(five, 'bidding', 9));
      await shot('bidding-mid-game', 1500);
      await step('sheet-menu', () => btn(page, 'Menu').click());
      await step('sheet-rules', () => btn(page, /Rules/).click());
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      await step('sheet-scoreboard', () => btn(page, 'Scoreboard').click());
      await step('sheet-edit-round', () => page.getByRole('row', { name: /Edit round 1/ }).click());
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      await step('sheet-upcoming', async () => {
        await btn(page, 'Menu').click();
        await btn(page, 'Upcoming rounds').click();
      });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      await step('bidding-dealer-locked', async () => {
        for (let i = 0; i < 6; i++) {
          if (await page.getByRole('button', { name: /^Locked/ }).count()) break;
          await btn(page, 'Bid 1').click();
          await page.waitForTimeout(350);
        }
      });
      await step('bidding-done', async () => {
        const locked = (await page.getByRole('button', { name: 'Locked 1' }).count())
          ? 'Bid 0'
          : 'Bid 1';
        await btn(page, locked).click();
      });
      await step('play', () => btn(page, 'Start playing').click());
      await step('results-empty', () => btn(page, 'Enter results').click());
      await step('results-filled', async () => {
        const rows = page.getByRole('group', { name: /^Result for/ });
        const cnt = await rows.count();
        for (let k = 1; k < cnt; k++)
          await rows.nth(k).getByRole('button', { name: /Made/ }).click();
        await rows
          .first()
          .getByRole('button', { name: /Missed/ })
          .click();
      });
      await step('summary-count-up', () => btn(page, 'Confirm round').click(), 500);
      await shot('summary-settled', 3500);
      await step('end-game-confirm', () => btn(page, 'End game').click(), 500);
      await step(
        'winner',
        () => page.getByRole('alertdialog').getByRole('button', { name: 'End game' }).click(),
        3000,
      );
      await step('sheet-share', () => btn(page, /Share/).click());

      await seed(page, gameFor(NAMES.slice(0, 7), 'results', 11));
      await shot('results-seven-players', 1500);
      await seed(page, gameFor(five, 'summary', 12));
      await shot('summary-mid-game', 3500);
      await seed(page, gameFor(five, 'winner', 13), 'winner');
      await shot('winner-seeded', 3000);
      await seed(page, gameFor(five, 'bidding', 14), 'home');
      await shot('home-game-in-progress', 1400);
      test.info().annotations.push({ type: 'missed', description: missed.join('\n') || 'none' });
      if (missed.length) console.log(missed.join('\n'));
    });

    test(`${device}: game flow (large-screen UI)`, async ({ page }) => {
      test.skip(isPhone(device), 'the phone flow covers this');
      const { shot, step, missed } = shooter(page, device, '1');
      await clearAll(page);
      await shot('home-first-run', 1400);
      await step('setup-empty', () => btn(page, /^New game/i).click());
      await step('setup-five-seats', () => btn(page, '5 players').click());
      await step('setup-named', async () => {
        for (const [k, n] of NAMES.slice(0, 5).entries()) {
          await page.getByLabel(`Seat ${k + 1} name`).fill(n);
          await page.getByLabel(`Seat ${k + 1} name`).press('Tab');
        }
      });
      await step('deal-animation', () => page.locator('[data-deal]').click(), 1300);
      await step('bidding-first', () => btn(page, 'Skip the deal animation').click());
      const views: [SeedView, string][] = [
        ['bidding', 'bidding-mid-game'],
        ['playing', 'play'],
        ['results', 'results'],
        ['summary', 'summary'],
      ];
      for (const [i, [view, name]] of views.entries()) {
        await seed(page, gameFor(NAMES.slice(0, 5), view, 30 + i));
        await shot(name, 2500);
      }
      await seed(page, gameFor(NAMES, 'bidding', 35));
      await shot('bidding-seven-players', 2000);
      await step('drawer-scores', () => btn(page, 'Scores').click(), 1200);
      await page.keyboard.press('Escape');
      await step('drawer-rules', () => btn(page, 'Rules').click(), 1200);
      await page.keyboard.press('Escape');
      await step('menu', () => btn(page, 'Menu').click(), 1000);
      await page.keyboard.press('Escape');
      await seed(page, gameFor(NAMES.slice(0, 5), 'winner', 36), 'winner');
      await shot('winner', 3500);
      await seed(page, gameFor(NAMES.slice(0, 5), 'bidding', 37), 'home');
      await shot('home-game-in-progress', 1400);
      if (missed.length) console.log(missed.join('\n'));
    });

    test(`${device}: pages, signed out`, async ({ page }) => {
      const { shot, step, missed } = shooter(page, device, '2');
      await clearAll(page);
      await step('history-empty', () => go(page, /History/));
      await back(page);
      await step('boards-empty', () => go(page, /Leaderboard/));
      await back(page);
      await seed(page, gameFor(NAMES.slice(0, 5), 'bidding', 20), 'home');
      await seedArchive(page);
      await page.reload();
      await shot('home-with-archive', 1400);
      await step('history', () => go(page, /History/));
      await step('game-page', () =>
        page
          .getByRole('button', { name: / won|tied/ })
          .first()
          .click(),
      );
      await home(page);
      await step('boards-this-month', () => go(page, /Leaderboard/));
      await step('boards-all-time', () => btn(page, 'All time').click());
      await step('player-page', () => page.locator('ol button').first().click(), 1400);
      await step('head-to-head', () =>
        page
          .getByRole('button', { name: /^Head to head: / })
          .first()
          .click(),
      );
      await back(page);
      await step('achievements', () => btn(page, 'See all').click());
      await home(page);
      await step('players', () => go(page, /Players/));
      await home(page);
      await step('awards', () => go(page, /Awards/));
      await step('wrapped', () => btn(page, /Wrapped/).click(), 1500);
      await home(page);
      await step('how-to-play', () => go(page, /How to play|Rules/));
      await home(page);
      await step('sign-in', () => go(page, /^Sign in$/));
      test.info().annotations.push({ type: 'missed', description: missed.join('\n') || 'none' });
      if (missed.length) console.log(missed.join('\n'));
    });

    test(`${device}: signed in (local backend)`, async ({ page, browser }) => {
      const { shot, step, missed } = shooter(page, device, '3');
      resetBackend();
      await clearAll(page);
      await signIn(page);
      await shot('home-signed-in', 2500);
      await step(
        'boards-global',
        async () => {
          await go(page, /Leaderboard/);
          await btn(page, 'All time').click();
        },
        1500,
      );
      await step(
        'player-page-server',
        () => page.getByRole('button', { name: /^#1 / }).click(),
        1500,
      );
      await step(
        'head-to-head-server',
        () =>
          page
            .getByRole('button', { name: /^Head to head: / })
            .first()
            .click(),
        1500,
      );
      await home(page);
      await step('awards-server', () => go(page, /Awards/), 1500);
      await step('awards-season', () => btn(page, '👑 Season').click(), 1500);
      await step('activity', () => btn(page, '📰 Activity').click(), 1500);
      await home(page);
      await step(
        'wrapped-server',
        async () => {
          await go(page, /Awards/);
          await btn(page, /Wrapped/).click();
        },
        1800,
      );
      await home(page);
      await step('history-signed-in', () => go(page, /History/), 1500);
      await home(page);
      await step('players-signed-in', () => go(page, /Players/), 1500);
      await home(page);
      await step(
        'account',
        () => page.getByRole('button', { name: 'Me', exact: true }).first().click(),
        1500,
      );
      await step('admin', () => btn(page, /Admin/).click(), 1500);
      await home(page);
      // Setup suggests the circle; a new name asks for an email.
      await step('setup-2-signed-in', async () => {
        await btn(page, /^New game/i).click();
        const start = btn(page, 'Start new');
        if (await start.isVisible().catch(() => false)) await start.click();
        await btn(page, '4 players').click();
        await btn(page, 'Next').click();
      });
      await step('setup-2-email-step', async () => {
        await page.getByLabel('Player name').fill('Tara');
        await page.getByLabel('Player name').press('Enter');
      });

      // Viewer pages, signed out, as a guest would open them.
      const invite = await makeInvite(page, 'new.guest@kachuful.test');
      const reset = await makeResetLink(page, ACCOUNTS.riya.email);
      const guest = await browser.newContext({ ...DEVICES[device], serviceWorkers: 'block' });
      await withTheme(guest);
      const g = await guest.newPage();
      const gs = shooter(g, device, '4');
      await g.goto(`/?invite=${invite}`);
      await gs.shot('invite-page', 1500);
      await g.goto(`/?reset=${reset}`);
      await gs.shot('reset-password-page', 1500);
      await g.goto('/?live=nope0000000000000000000');
      await gs.shot('live-link-not-found', 1500);
      await guest.close();
      test.info().annotations.push({
        type: 'missed',
        description: [...missed, ...gs.missed].join('\n') || 'none',
      });
      if (missed.length) console.log(missed.join('\n'));
    });
  });
}
