import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { auditScreen, type ScreenReport } from './audit';
import { violations } from './audit-rules';
import { LONG_NAMES, openSeeded, seedGame } from './fixtures';
import { btn } from './helpers';

/** Every device class from docs/RESPONSIVE-PLAN.md §3. */
const VIEWPORTS = [
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
  [1024, 768],
  [1920, 1080],
] as const;
const MATRIX = FULL ? VIEWPORTS : SUBSET;
const PLAYERS = FULL ? [3, 5, 7] : [7];

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
        const close = () => btn(page, 'Close').last().click();
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

        await page.goto('/');
        await section('setup', async () => {
          await openSeeded(page, seedGame(n, 'bidding'), 'home');
          await shot('01-home', { primary: btn(page, 'New Game') });

          await btn(page, 'New Game').click();
          await btn(page, `${n} players`).click();
          await shot('02-setup1', { primary: btn(page, 'Next') });

          await btn(page, 'Next').click();
          const input = page.getByLabel('Player name');
          for (const name of LONG_NAMES.slice(0, 2)) {
            await input.fill(name);
            await input.press('Enter');
          }
          await shot('03-setup2', { primary: btn(page, 'Next') });
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
          for (const name of LONG_NAMES.slice(2, n)) {
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
