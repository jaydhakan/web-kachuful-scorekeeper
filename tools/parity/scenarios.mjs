// Every screen and sheet, driven only by visible text and aria-labels so the same script runs on both apps.
import { seeds } from './fixture.mjs';

const btn = (page, name) => page.getByRole('button', { name, exact: true });
const text = (page, t) => page.getByText(t).first();
const pause = (page, ms = 450) => page.waitForTimeout(ms);

async function toBidAll(page) {
  await btn(page, 'Bid 1').click();
  await pause(page);
  await btn(page, 'Bid 1').click();
  await pause(page);
}

async function toResults(page) {
  await btn(page, 'Start playing').click();
  await pause(page, 700);
  await btn(page, 'Enter results').click();
  await pause(page, 700);
}

/** The prototype confirms New Game; Phase 2 goes straight to setup (Undo after Deal instead). */
async function startNew(page) {
  await pause(page, 400);
  const b = btn(page, 'Start new');
  if (await b.count()) await b.click();
}

export const scenarios = [
  {
    seed: 'home',
    run: async ({ page, shot }) => {
      await shot('home');
      await btn(page, 'New Game').click();
      await shot('home-new-game-modal');
      await startNew(page);
      await pause(page, 700);
      await shot('setup-1');
      await page.locator('button', { hasText: /^5$/ }).click();
      await pause(page, 600);
      await shot('setup-1-n5');
    },
  },
  {
    seed: 'home',
    run: async ({ page, shot }) => {
      await btn(page, 'How to play').click();
      await pause(page, 700);
      await shot('sheet-rules');
    },
  },
  {
    seed: 'home',
    run: async ({ page, shot }) => {
      await btn(page, 'New Game').click();
      await startNew(page);
      await pause(page, 700);
      await page.locator('button', { hasText: /Use last group/ }).click();
      await pause(page, 800);
      await shot('setup-3');
      await page.getByText('Game length').click();
      await pause(page, 500);
      await shot('setup-3-length-open');
    },
  },
  {
    seed: 'home',
    run: async ({ page, shot }) => {
      await btn(page, 'New Game').click();
      await startNew(page);
      await pause(page, 700);
      await page.locator('button', { hasText: /^6$/ }).click();
      await pause(page, 500);
      await btn(page, 'Next').click();
      await pause(page, 800);
      await shot('setup-2-empty');
      const input = page.locator('input#nm');
      for (const n of ['Aarav', 'Riya']) {
        await input.fill(n);
        await input.press('Enter');
        await pause(page, 700);
      }
      await shot('setup-2');
      await page.locator('[data-seat="0"]').click();
      await pause(page, 700);
      await shot('sheet-seat');
      await text(page, 'Change avatar').click();
      await pause(page, 900);
      await shot('sheet-avatar');
      await btn(page, 'Done').click();
      await pause(page, 600);
      await page.locator('[data-seat="1"]').click();
      await pause(page, 600);
      await text(page, 'Rename').click();
      await pause(page, 800);
      await shot('sheet-rename');
    },
  },
  {
    seed: 'demo',
    run: async ({ page, shot }) => {
      await shot('bidding');
      await btn(page, 'Menu').click();
      await pause(page, 800);
      await shot('sheet-menu');
      await text(page, 'Upcoming rounds').click();
      await pause(page, 900);
      await shot('sheet-upcoming');
      await btn(page, 'Close').click();
      await pause(page, 600);
      await btn(page, 'Scoreboard').click();
      await pause(page, 900);
      await shot('sheet-board');
      await page.locator('tbody tr').first().click();
      await pause(page, 900);
      await shot('sheet-edit');
    },
  },
  {
    seed: 'demo',
    run: async ({ page, shot }) => {
      await toBidAll(page);
      await shot('bidding-dealer-locked');
      await btn(page, 'Bid 3').click();
      await pause(page, 700);
      await shot('bidding-all-in');
      await toResults(page);
      await shot('results-empty');
      await page.getByText('✓ Made').nth(0).click();
      await page.getByText('✗ Missed').nth(1).click();
      await page.getByText('✓ Made').nth(2).click();
      await page.getByText('✗ Missed').nth(3).click();
      await page.getByText('✗ Missed').nth(4).click();
      await pause(page, 600);
      await shot('results-filled');
      await page.getByRole('switch').click();
      await pause(page, 700);
      await shot('results-exact');
      await page.getByRole('switch').click();
      await pause(page, 500);
      await btn(page, 'Confirm round').click();
      await pause(page, 1800);
      await shot('summary');
      await btn(page, 'End game').click();
      await pause(page, 500);
      await shot('summary-end-modal');
      await btn(page, 'End game').last().click();
      await pause(page, 4200);
      await shot('winner');
      await btn(page, 'Share').click();
      await pause(page, 1500);
      await shot('sheet-share');
    },
  },
  {
    seed: 'demo',
    run: async ({ page, shot }) => {
      await toBidAll(page);
      await btn(page, 'Bid 3').click();
      await pause(page, 700);
      await btn(page, 'Start playing').click();
      await pause(page, 900);
      await shot('play');
    },
  },
];

export { seeds };
