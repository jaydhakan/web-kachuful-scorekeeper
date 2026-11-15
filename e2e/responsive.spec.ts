import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { auditScreen, type ScreenReport } from './audit';
import { violations } from './audit-rules';
import { LONG_NAMES_14, openSeeded, seedGame } from './fixtures';
import { btn, nameField, openAdvanced } from './helpers';
import { ishBtn, openIshaara, readyGame, TEAM } from './ishaara-helpers';

/**
 * Every device class that still gets the phone UI (docs/codebase/ARCHITECTURE.md, Layout). From 768×501 up the app shows the
 * large-screen UI (MQ.big), which large-screen.desktop.spec covers.
 */
const ALL = [
  [320, 568],
  [360, 640],
  [375, 667],
  [390, 844],
  [430, 932],
  [568, 320],
  [740, 360],
  [844, 390],
  [932, 430],
  [768, 1024],
  [820, 1180],
  [1024, 768],
  [1180, 820],
  [1280, 800],
  [1440, 900],
  [1920, 1080],
  [2560, 1440],
] as const;
const VIEWPORTS = ALL.filter(([w, h]) => w < 768 || h <= 500);

const LABEL = process.env.RESPONSIVE_LABEL ?? 'current';
const OUT = `reports/responsive/raw/${LABEL}`;

// By default a small subset runs and must be clean, so the normal e2e run (and CI) guards the layout.
// RESPONSIVE_FULL=1 runs every viewport and player count under the same rule; RESPONSIVE=1 runs all of them
// without failing, to write the reports and contact sheets (tools/responsive/report.mjs).
const REPORT_ONLY = !!process.env.RESPONSIVE && !process.env.RESPONSIVE_FULL;
const FULL = !!process.env.RESPONSIVE || !!process.env.RESPONSIVE_FULL;
const SUBSET = [
  [360, 640],
  [844, 390],
  [740, 360],
] as const;
const MATRIX = FULL ? VIEWPORTS : SUBSET;
const PLAYERS = FULL ? [3, 5, 7, 10, 14] : [7, 14];

const settle = (page: Page) => page.waitForTimeout(650);

for (const [w, h] of MATRIX) {
  const phone = Math.min(w, h) < 500,
    touch = Math.max(w, h) <= 1180;
  test.describe(`${w}×${h}`, () => {
    test.use({
      viewport: { width: w, height: h },
      isMobile: phone,
      hasTouch: touch,
      deviceScaleFactor: phone ? 2 : 1,
      actionTimeout: 5000,
    });
    for (const n of PLAYERS) {
      test(`${n} players`, async ({ page }) => {
        test.setTimeout(180_000);
        const dir = `${OUT}/${w}x${h}/${n}`;
        mkdirSync(dir, { recursive: true });
        const reports: ScreenReport[] = [];
        const shot = async (
          screen: string,
          opts: { primary?: Locator | null; controls?: Locator } = {},
        ) => {
          await settle(page);
          reports.push(await auditScreen(page, screen, opts));
          await page.screenshot({ path: `${dir}/${screen}.png` });
        };
        // Closing a sheet steps the history back; a reload before that lands is aborted, so wait for it.
        const close = async () => {
          await btn(page, 'Close').last().click();
          await expect(page.getByRole('dialog')).toHaveCount(0);
          await page.waitForTimeout(300);
        };
        // A control the layout makes unreachable is itself a finding: record it and go on to the next section.
        const section = async (name: string, run: () => Promise<void>) => {
          try {
            await run();
          } catch (e) {
            reports.push({
              ...(await auditScreen(page, `blocked-${name}`)),
              primary: `blocked: ${String(e).split('\n')[0].slice(0, 160)}`,
            });
            await page.screenshot({ path: `${dir}/blocked-${name}.png` });
          }
        };

        await page.goto('/kachuful');
        await section('setup', async () => {
          await openSeeded(page, seedGame(n, 'bidding'), 'home');
          await shot('01-home', { primary: btn(page, 'New Game') });

          await btn(page, 'New Game').click();
          if (n > 7) {
            await openAdvanced(page);
            await btn(page, '2 decks').click();
            // The fit check is for the default, collapsed Setup 1.
            await btn(page, /^Advanced/).click();
          }
          await btn(page, `${n} players`).click();
          await shot('02-setup1', { primary: btn(page, 'Next') });

          await btn(page, 'Next').click();
          const input = await nameField(page);
          for (const name of LONG_NAMES_14.slice(0, 2)) {
            await input.fill(name);
            await input.press('Enter');
          }
          await shot('03-sheet-add', {
            primary: page.getByRole('dialog').getByLabel('Player name'),
          });
          await close();
          await settle(page);
          await shot('03-setup2', { primary: btn(page, 'Add player') });
          await page.locator('[data-table="su2"] [data-seat="0"]').click();
          await shot('04-sheet-seat', { primary: btn(page, 'Close').last() });
          await btn(page, 'Rename').click();
          await shot('05-sheet-rename', { primary: btn(page, 'Close').last() });
          await close();
          await settle(page);
          await page.locator('[data-table="su2"] [data-seat="0"]').click();
          await btn(page, 'Change avatar').click();
          await shot('06-sheet-avatar', { primary: btn(page, 'Close').last() });
          await close();
          await settle(page);
          await nameField(page);
          for (const name of LONG_NAMES_14.slice(2, n)) {
            await input.fill(name);
            await input.press('Enter');
          }
          await btn(page, 'Next').click();
          await shot('07-setup3', { primary: btn(page, 'Deal!') });

          await btn(page, 'Deal!').click();
          await page.waitForTimeout(150);
          reports.push(await auditScreen(page, '08-round-start'));
          await page.screenshot({ path: `${dir}/08-round-start.png` });
        });

        await section('bidding', async () => {
          await openSeeded(page, seedGame(n, 'bidding'), 'round');
          await shot('09-bidding', {
            primary: page.getByRole('button', { name: /bids in|Start playing/ }),
            controls: page.getByRole('button', { name: /^(Bid|Locked) \d+$/ }),
          });
          await btn(page, 'Menu').click();
          await shot('10-sheet-menu', { primary: btn(page, 'Close').last() });
          await btn(page, 'Rules').click();
          await shot('11-sheet-rules', { primary: btn(page, 'Close').last() });
          await close();
          await settle(page);
          await btn(page, 'Scoreboard').click();
          await shot('12-sheet-board', { primary: btn(page, 'Close').last() });
          await page.getByRole('row', { name: 'Edit round 1' }).click();
          await shot('13-sheet-edit', { primary: btn(page, 'Close').last() });
          await close();
          await settle(page);
          await btn(page, 'Menu').click();
          await btn(page, 'Upcoming rounds').click();
          await shot('14-sheet-upcoming', { primary: btn(page, 'Close').last() });
          await close();
        });

        await section('round', async () => {
          await openSeeded(page, seedGame(n, 'playing'), 'round');
          await shot('15-play', { primary: btn(page, 'Enter results') });
          await openSeeded(page, seedGame(n, 'results'), 'round');
          await shot('16-results', { primary: btn(page, 'Confirm round') });
          await openSeeded(page, seedGame(n, 'summary'), 'round');
          await shot('17-summary', { primary: btn(page, 'Next round') });
          await page.getByRole('button', { name: 'End game', exact: true }).first().click();
          await shot('18-modal-end', {
            primary: page.getByRole('alertdialog').getByRole('button', { name: 'End game' }),
          });
        });

        await section('winner', async () => {
          await openSeeded(page, seedGame(n, 'winner'), 'winner');
          await page.getByRole('button', { name: 'Rematch' }).waitFor();
          await shot('19-winner', { primary: btn(page, 'Rematch') });
          await page.getByRole('button', { name: /Share/ }).first().click();
          await shot('20-sheet-share', { primary: btn(page, 'Close').last() });
        });

        writeFileSync(`${OUT}/${w}x${h}-${n}.json`, JSON.stringify(reports, null, 1));
        expect(reports.length).toBeGreaterThan(0);
        if (!REPORT_ONLY) {
          const found = reports.flatMap((r) => violations(r, { width: w, height: h, players: n }));
          expect(found, `${w}x${h}, ${n} players`).toEqual([]);
        }
      });
    }
  });
}

/** Seats a known player from Ishaara's Add player sheet (known players need no email). */
async function seatIsh(page: Page, name: string) {
  const field = page.getByRole('dialog').getByLabel('Player name');
  await field.fill(name);
  await expect(
    page.getByText(`${name} is already in your games, so no email is needed.`),
  ).toBeVisible();
  await field.press('Enter');
  await expect(
    page.getByRole('dialog').getByRole('button', { name: `Remove ${name}`, exact: true }),
  ).toBeVisible();
}

/**
 * Ishaara's open audit findings (docs/DESIGN-AUDIT-PLAN.md), each with the sizes it shows at. Anything else fails
 * the test; so does a listed bug that no longer shows, so the fix must delete its line here.
 */
const ISH_KNOWN: { id: string; re: RegExp; at: string[] }[] = [
  { id: 'ISH-F10', re: /^ish-setup-teams word broken mid-word/, at: ['360x640'] },
  { id: 'ISH-F09', re: /^ish-key-clue (target under 44px|scrolls although)/, at: ['360x640'] },
];

// Ishaara under the same rules: the table and both clue phones at each phone size, setup to the win.
for (const [w, h] of MATRIX) {
  const phone = Math.min(w, h) < 500;
  const device = {
    viewport: { width: w, height: h },
    isMobile: phone,
    hasTouch: true,
    deviceScaleFactor: phone ? 2 : 1,
    reducedMotion: 'reduce' as const,
  };
  test.describe(`${w}×${h}`, () => {
    test.use({ ...device, actionTimeout: 5000 });
    test('Ishaara: setup, board, key and win', async ({ page, browser }) => {
      test.setTimeout(120_000);
      const dir = `${OUT}/${w}x${h}/ishaara`;
      mkdirSync(dir, { recursive: true });
      const reports: ScreenReport[] = [];
      const shot = async (on: Page, screen: string, primary?: Locator) => {
        await settle(on);
        reports.push(await auditScreen(on, screen, { primary }));
        await on.screenshot({ path: `${dir}/${screen}.png` });
      };

      await openIshaara(page, 'admin', { circle: true });
      await shot(page, 'ish-home', ishBtn(page, 'New game'));
      await ishBtn(page, 'New game').click();
      // Landscape hides the step headings, so wait on each step's own controls.
      await ishBtn(page, 'Add player').click();
      for (const n of ['Riya', 'Kabir', 'Asha', 'Om', 'Neha']) await seatIsh(page, n);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await shot(page, 'ish-setup-teams', ishBtn(page, 'Next: words'));
      await ishBtn(page, 'Next: words').click();
      await expect(ishBtn(page, 'Start game')).toBeVisible();
      await shot(page, 'ish-setup-words', ishBtn(page, 'Start game'));
      await page.goto('/ishaara');

      const { phones, t, close } = await readyGame(page, browser, { phone: device });
      const them = t === 'sun' ? phones.moon : phones.sun;
      await shot(page, 'ish-board');
      await phones[t].getByLabel('Your clue · one word').fill('Quasar');
      await ishBtn(phones[t], '2').click();
      await shot(phones[t], 'ish-key-clue', ishBtn(phones[t], 'Send QUASAR · 2'));
      await ishBtn(phones[t], 'Send QUASAR · 2').click();
      await expect(phones[t].getByText('Your clue: QUASAR · 2')).toBeVisible();
      await shot(them, 'ish-key-waiting');
      // Picking a card must not move or resize the grid under the finger.
      const words = page.getByRole('list', { name: 'Words', exact: true });
      // By position: a picked card's name changes, so a name-based locator would move to the next card.
      const card = words.getByRole('button').first();
      const before = [await words.boundingBox(), await card.boundingBox()];
      await card.click();
      await shot(page, 'ish-board-confirm', ishBtn(page, 'Confirm'));
      const after = [await words.boundingBox(), await card.boundingBox()];
      const box = (b: { x: number; y: number; width: number; height: number } | null) =>
        b ? [b.x, b.y, b.width, b.height].map(Math.round).join(',') : 'none';
      if (before.map(box).join(' ') !== after.map(box).join(' '))
        reports.push({
          ...reports[reports.length - 1],
          screen: 'ish-board-confirm',
          primary: `grid moved on a pick: ${before.map(box).join(' ')} → ${after.map(box).join(' ')}`,
          clipped: [],
          smallTargets: [],
          brokenWords: [],
          offscreen: [],
          pageOverflow: [],
          offscreenControls: [],
          overlaps: [],
          scrolls: [],
        });
      await ishBtn(page, 'Menu').click();
      await ishBtn(page, `${TEAM[t]} resigns`).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Resign' }).click();
      await expect(page.getByText(`${TEAM[t]} resigned.`)).toBeVisible({ timeout: 10_000 });
      await shot(page, 'ish-win', ishBtn(page, 'Rematch'));
      await shot(phones[t], 'ish-key-finished');
      await close();

      writeFileSync(`${OUT}/${w}x${h}-ishaara.json`, JSON.stringify(reports, null, 1));
      if (!REPORT_ONLY) {
        const found = reports.flatMap((r) => violations(r, { width: w, height: h, players: 6 }));
        const known = (v: string) => ISH_KNOWN.find((k) => k.re.test(v));
        expect(
          found.filter((v) => !known(v)),
          `${w}x${h}, Ishaara`,
        ).toEqual([]);
        for (const k of ISH_KNOWN.filter((k) => k.at.includes(`${w}x${h}`))) {
          test.info().annotations.push({ type: 'known bug', description: k.id });
          if (!FULL)
            expect(
              found.some((v) => k.re.test(v)),
              `${k.id} no longer shows at ${w}x${h}: delete it from ISH_KNOWN`,
            ).toBe(true);
        }
      }
    });
  });
}

test.describe('Ishaara across the large-screen line', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('turning a tablet keeps the setup in progress', async ({ page }) => {
    test.fail(true, 'ISH-F04: crossing 768px remounts Ishaara and drops what was being done');
    await openIshaara(page, 'admin', { circle: true });
    await ishBtn(page, 'New game').click();
    await ishBtn(page, 'Add player').click();
    await seatIsh(page, 'Riya');
    await page.keyboard.press('Escape');
    const riya = page.getByRole('button', { name: /^Riya\b.*move to/ });
    await expect(riya).toBeVisible();
    // Resize, then let the layout query flip and React render before looking again.
    const turn = async (width: number, height: number, big: boolean) => {
      await page.setViewportSize({ width, height });
      await page.waitForFunction(
        (b) => matchMedia('(min-width: 768px) and (min-height: 501px)').matches === b,
        big,
      );
      await page.waitForTimeout(400);
      await expect(riya).toBeVisible();
    };
    await turn(1024, 768, true);
    await turn(390, 844, false);
  });
});
