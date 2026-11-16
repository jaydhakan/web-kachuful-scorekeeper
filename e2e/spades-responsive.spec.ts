import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { legalPlays } from '../src/games/spades/domain/legal';
import type { Seat } from '../src/games/spades/domain/types';
import { auditScreen, type ScreenReport } from './audit';
import { violations } from './audit-rules';
import { REAL } from './backend';
import { accounts, act, phone, seatedTable, viewOf } from './spades-helpers';

/**
 * Spades' screens at the phone sizes plan §10 names (320×568 to 430×932, and on its side): the scorekeeper from setup
 * to History and a player's page, and online play from the lobby through bidding, a trick, the summary and the winner.
 * Each screen is measured by the shared audit and must come out clean, apart from the hand's card strips (below).
 * RESPONSIVE=1 writes the reports and screenshots without failing. Mock only.
 */
test.skip(REAL, 'runs against the mock API');

const LABEL = process.env.RESPONSIVE_LABEL ?? 'current';
const OUT = `reports/responsive/raw/${LABEL}`;
const REPORT_ONLY = !!process.env.RESPONSIVE;
const SIZES = [
  [320, 568],
  [360, 640],
  [390, 844],
  [430, 932],
  [740, 360],
  [844, 390],
] as const;

// The hand fans its 13 cards: each card's visible strip is narrower than 44px, and a tap lifts the card to full size
// (plan §10, the documented exception). Spades' own buttons still have to reach 44px.
const HAND_STRIP = /^button "(?:[AKQJ2-9]|10) of (?:spades|hearts|diamonds|clubs)/;
const allowed = (v: string) => / target under 44px: /.test(v) && HAND_STRIP.test(v.split(': ')[1]);

const settle = (page: Page) => page.waitForTimeout(700);

const GROUP = {
  players: [
    { name: 'Riya', emoji: '🐯', color: '#60a5fa' },
    { name: 'Arjun', emoji: '🦊', color: '#ff8a65' },
    { name: 'Dev', emoji: '🐵', color: '#f87171' },
    { name: 'Meera', emoji: '🦉', color: '#2dd4bf' },
  ],
  direction: 'cw',
  rules: { target: 200, timerSec: null, nil: true, blindNil: false, minTeamBid: null, mercy: null },
  at: 1,
};

for (const [w, h] of SIZES) {
  const viewport = { width: w, height: h };
  const phoneSize = Math.min(w, h) < 500;
  const check = (reports: ScreenReport[], what: string) => {
    writeFileSync(`${OUT}/${w}x${h}-spades-${what}.json`, JSON.stringify(reports, null, 1));
    const found = reports
      .flatMap((r) => violations(r, { width: w, height: h, players: 4 }))
      .filter((v) => !allowed(v));
    if (REPORT_ONLY) return console.log(`${w}x${h} ${what}:\n  ${found.join('\n  ')}`);
    expect(found, `${w}x${h}, Spades ${what}`).toEqual([]);
  };

  test.describe(`${w}×${h}`, () => {
    test.use({
      viewport,
      isMobile: phoneSize,
      hasTouch: true,
      deviceScaleFactor: 2,
      reducedMotion: 'reduce',
    });

    test('Spades scorekeeper: setup, bidding, tricks, summary, winner, History, player', async ({
      page,
    }) => {
      test.setTimeout(90_000);
      const dir = `${OUT}/${w}x${h}/spades`;
      mkdirSync(dir, { recursive: true });
      const reports: ScreenReport[] = [];
      const shot = async (screen: string, primary?: Locator) => {
        await settle(page);
        reports.push(await auditScreen(page, screen, { primary }));
        await page.screenshot({ path: `${dir}/${screen}.png` });
      };
      const tap = (name: string | RegExp) =>
        page.getByRole('button', { name, exact: typeof name === 'string' }).click();

      await page.addInitScript((g) => {
        if (!localStorage.getItem('spades.lastGroup'))
          localStorage.setItem('spades.lastGroup', JSON.stringify(g));
      }, GROUP);
      await page.goto('/spades');
      await shot('sp-home');
      await page.goto('/spades?keep');
      await shot('sp-setup', page.getByRole('button', { name: /Same four as last time/ }));
      await tap(/Same four as last time/);
      await shot('sp-setup-rules', page.getByRole('button', { name: 'Next', exact: true }));
      await tap('Next');
      await shot('sp-setup-start', page.getByRole('button', { name: 'Start the game' }));
      await tap('Start the game');
      const bidFor = (who: string) => page.getByRole('group', { name: `Bid for ${who}` });
      await expect(bidFor('Arjun')).toBeVisible();
      await shot('sp-bidding', bidFor('Arjun'));
      for (const [who, v] of [
        ['Arjun', '1'],
        ['Dev', '6'],
        ['Meera', '1'],
        ['Riya', '6'],
      ])
        await bidFor(who).getByRole('button', { name: v, exact: true }).click();
      await tap('Play the hand');
      await shot('sp-tricks', page.getByRole('button', { name: 'Save hand' }));
      await page
        .getByRole('group', { name: 'Tricks taken by Team A' })
        .getByRole('button', { name: '13 tricks' })
        .click();
      await tap('Save hand');
      await shot('sp-summary', page.getByRole('button', { name: /Next hand/ }));
      await tap(/Next hand/);
      for (const [who, v] of [
        ['Dev', '6'],
        ['Meera', '1'],
        ['Riya', '6'],
        ['Arjun', '1'],
      ])
        await bidFor(who).getByRole('button', { name: v, exact: true }).click();
      await tap('Play the hand');
      await page
        .getByRole('group', { name: 'Tricks taken by Team A' })
        .getByRole('button', { name: '13 tricks' })
        .click();
      await tap('Save hand');
      await tap('See the winner');
      await expect(page.getByRole('heading', { name: 'Riya & Dev win!' })).toBeVisible();
      await shot('sp-winner');
      await page.goto('/spades?keep&page=history');
      await expect(page.getByRole('button', { name: /Riya & Dev won/ })).toBeVisible();
      await shot('sp-history');
      await page.goto('/spades?keep&page=leaderboard');
      await shot('sp-leaderboard');
      await page.getByRole('button', { name: /Riya/ }).first().click();
      await expect(page.getByRole('heading', { name: 'Achievements' })).toBeVisible();
      await shot('sp-player');
      check(reports, 'table');
    });

    test('Spades online: lobby, bidding, a trick, the summary and the winner', async ({
      browser,
      baseURL,
    }) => {
      test.setTimeout(150_000);
      const dir = `${OUT}/${w}x${h}/spades-online`;
      mkdirSync(dir, { recursive: true });
      const reports: ScreenReport[] = [];
      const shot = async (on: Page, screen: string, primary?: Locator) => {
        await settle(on);
        reports.push(await auditScreen(on, screen, { primary }));
        await on.screenshot({ path: `${dir}/${screen}.png` });
      };
      const accs = await accounts(baseURL!);
      const phones = await Promise.all(accs.map((a) => phone(browser, a, '/spades', { viewport })));
      const [host] = phones;
      await shot(host, 'spo-home', host.getByRole('button', { name: 'Start a table' }));
      const { id, bySeat } = await seatedTable(phones, { draw: false });
      await expect(host.getByRole('button', { name: 'I’m ready' })).toBeVisible();
      await shot(host, 'spo-lobby', host.getByRole('button', { name: 'I’m ready' }));
      for (const p of phones) expect((await act(p, id, { type: 'ready' })).ok()).toBe(true);
      expect((await act(host, id, { type: 'drawForDeal' })).ok()).toBe(true);
      await expect(host.getByRole('heading', { level: 1, name: 'Hand 1' })).toBeVisible({
        timeout: 15_000,
      });
      const v0 = await viewOf(host, id);
      const dealer = bySeat[v0.table.dealer as Seat];
      await expect(dealer.getByRole('button', { name: 'Hold to shuffle & deal' })).toBeEnabled({
        timeout: 15_000,
      });
      await shot(
        dealer,
        'spo-deal',
        dealer.getByRole('button', { name: 'Hold to shuffle & deal' }),
      );
      expect((await act(dealer, id, { type: 'deal' })).ok()).toBe(true);

      const turnPage = async () => bySeat[(await viewOf(host, id)).table.turn as Seat];
      const first = await turnPage();
      const pad = first.getByRole('region', { name: 'Your bid' });
      await expect(pad).toBeVisible({ timeout: 15_000 });
      await shot(first, 'spo-bidding', pad);
      for (let i = 0; i < 4; i++) {
        const p = await turnPage();
        expect((await act(p, id, { type: 'bid', bid: 3 })).ok()).toBe(true);
      }
      const leader = await turnPage();
      await expect(leader.getByRole('group', { name: 'Your hand' })).toBeVisible();
      await shot(leader, 'spo-play', leader.getByRole('group', { name: 'Your hand' }));
      // The rest of the hand straight to the server.
      for (let guard = 0; guard < 400; guard++) {
        const { table } = await viewOf(host, id);
        if (table.phase !== 'playing') break;
        const p = bySeat[table.turn as Seat];
        const { me } = await viewOf(p, id);
        const r = await act(p, id, {
          type: 'play',
          card: legalPlays(me.hand!, table.trick, table.broken)[0],
        });
        if (!r.ok()) await p.waitForTimeout(150);
      }
      const sheet = host.getByRole('dialog', { name: 'Hand 1' });
      await expect(sheet).toBeVisible({ timeout: 20_000 });
      await shot(host, 'spo-summary');
      await sheet
        .getByRole('button', { name: /^(Done|Close)$/ })
        .first()
        .click();
      expect((await act(host, id, { type: 'endGame' })).ok()).toBe(true);
      await expect(host.getByRole('button', { name: /Rematch/ })).toBeVisible({ timeout: 15_000 });
      await shot(host, 'spo-winner', host.getByRole('button', { name: /Rematch/ }));
      for (const p of phones) await p.context().close();
      check(reports, 'online');
    });
  });
}
