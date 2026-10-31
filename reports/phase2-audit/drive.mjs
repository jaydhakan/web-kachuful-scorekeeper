// Drives the dev app at two viewports, screenshots every screen and measures tap targets.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = process.argv[2] ?? 'reports/phase2-audit/shots';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/';
const VPS = [
  { w: 390, h: 844, names: ['Aarav', 'Riya', 'Kabir', 'Meera', 'Dev'] },
  { w: 360, h: 740, names: ['Aarav', 'Riya', 'Kabir', 'Meera', 'Dev', 'Isha', 'Zoravar Singh'] },
];
const report = [];
const browser = await chromium.launch({ channel: 'chrome' });

const measure = (page, tag) =>
  page.evaluate((tag) => {
    const out = [];
    const sel = 'button,[role="button"],[role="switch"],a[href],input,[tabindex="0"]';
    document.querySelectorAll(sel).forEach((el) => {
      if (el.closest('[inert]')) return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      if (r.bottom < 0 || r.top > innerHeight) return;
      if (el.getAttribute('role') === 'region') return;
      if (r.width < 44 || r.height < 44) {
        out.push({
          tag,
          label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30),
          w: Math.round(r.width),
          h: Math.round(r.height),
          y: Math.round(r.top),
        });
      }
    });
    return out;
  }, tag);

for (const vp of VPS) {
  const dir = `${OUT}/${vp.w}`;
  mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    serviceWorkers: 'block',
  });
  const page = await ctx.newPage();
  const btn = (name) => page.getByRole('button', { name, exact: typeof name === 'string' });
  const shot = async (name) => {
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${dir}/${name}.png` });
    report.push(...(await measure(page, `${vp.w}:${name}`)));
  };
  await page.goto(BASE);
  await shot('01-home-firstrun');
  await page.getByText('Resume game').click();
  await shot('02-demo-bidding');
  await btn('Scoreboard').click();
  await shot('03-sheet-board');
  await page.getByRole('row', { name: /Edit round 1/ }).click();
  await shot('04-sheet-edit');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await btn('Menu').click().catch(() => {});
  await shot('05-sheet-menu');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  // fresh game
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.goto(BASE);
  await page.waitForTimeout(600);
  await btn('New Game').click();
  await page.waitForTimeout(300);
  await shot('06-newgame-confirm');
  await btn('Start new').click();
  await shot('07-setup1-empty');
  await btn(`${vp.names.length} players`).click();
  await shot('08-setup1');
  await btn('Next').click();
  await shot('09-setup2-empty');
  const input = page.getByLabel('Player name');
  for (const [i, n] of vp.names.entries()) {
    await input.fill(n);
    if (i === 1) {
      await shot('10-setup2-typing');
    }
    await input.press('Enter');
    await page.getByText(`${i + 1} of ${vp.names.length} seated`).waitFor();
  }
  await input.fill('aarav').catch(() => {});
  await shot('11-setup2-full');
  await btn('Next').click();
  await shot('12-setup3');
  await page.getByRole('button', { name: /Game length/ }).click();
  await shot('13-setup3-length');
  await btn('Deal!').click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${dir}/14-roundstart-a.png` });
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${dir}/14-roundstart-b.png` });
  await btn('Skip the deal animation').click().catch(() => {});
  await shot('15-bidding-first');
  // bid everyone 1 except the dealer
  for (let i = 0; i < 20; i++) {
    if (await btn('Start playing').isVisible()) break;
    const locked = await page.getByRole('button', { name: /^Locked/ }).count();
    if (locked && i < 15) {
      await shot('16-bidding-dealer');
      const lockedName = await page.getByRole('button', { name: /^Locked/ }).first().getAttribute('aria-label');
      await page.getByRole('button', { name: lockedName }).click();
      await page.waitForTimeout(150);
      await page.screenshot({ path: `${dir}/17-bidding-locked-tap.png` });
      const pick = lockedName === 'Locked 1' ? 'Bid 0' : 'Bid 1';
      await btn(pick).click();
    } else await btn('Bid 1').click();
    await page.waitForTimeout(350);
  }
  await shot('18-bidding-all');
  await btn('Start playing').click();
  await shot('19-play');
  await btn('Enter results').click();
  await shot('20-results-empty');
  const made = page.getByRole('button', { name: '✓ Made', exact: true });
  const cnt = await made.count();
  for (let k = 0; k < cnt; k++) await made.nth(k).click();
  await page.getByRole('button', { name: '✗ Missed', exact: true }).first().click();
  await shot('21-results-filled');
  await page.getByRole('switch').click();
  await shot('22-results-exact');
  await page.getByRole('switch').click();
  await btn('Confirm round').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/23-summary-a.png` });
  await page.waitForTimeout(3400);
  await shot('23-summary-b');
  await btn('End game').click();
  await page.waitForTimeout(300);
  await shot('24-endgame-confirm');
  await page.getByRole('alertdialog').getByRole('button', { name: 'End game' }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${dir}/25-winner-a.png` });
  await page.waitForTimeout(2200);
  await shot('25-winner-b');
  await btn(/Share/).click();
  await page.waitForTimeout(1200);
  await shot('26-sheet-share');
  await ctx.close();
}
await browser.close();
writeFileSync(`${OUT}/small-targets.json`, JSON.stringify(report, null, 1));
console.log('small targets:', report.length);
