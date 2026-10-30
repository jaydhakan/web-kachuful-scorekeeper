import { expect, test, type Page } from '@playwright/test';
import { NAMES7, bidEveryone, btn, startGame } from './helpers';

interface Small {
  screen: string;
  label: string;
  w: number;
  h: number;
}

/** Every visible control outside inert layers, smaller than 44 × 44. */
const smallControls = (page: Page, screen: string): Promise<Small[]> =>
  page.evaluate((screen) => {
    const out: Small[] = [];
    const sel = 'button,[role="button"],[role="switch"],a[href],input';
    document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      if (el.closest('[inert]')) return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) return;
      if (r.width < 44 || r.height < 44)
        out.push({
          screen,
          label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40),
          w: Math.round(r.width),
          h: Math.round(r.height),
        });
    });
    return out;
  }, screen);

for (const [w, h, names] of [
  [390, 844, NAMES7.slice(0, 5)],
  [360, 740, NAMES7],
] as const) {
  test(`every control is at least 44px at ${w}×${h}`, async ({ page }) => {
    test.fail(true, 'Phase 2 item 6 brings every control to 44px');
    await page.setViewportSize({ width: w, height: h });
    const found: Small[] = [];
    const check = async (screen: string) => {
      // The outgoing screen fades for 420 ms; measure after it has gone.
      await page.waitForTimeout(700);
      found.push(...(await smallControls(page, screen)));
    };

    await page.goto('/');
    await check('home');
    await page.getByText(/Resume game|Try the demo/).click();
    await check('demo bidding');
    for (let i = 0; i < 6 && !(await page.getByRole('button', { name: /^Locked/ }).count()); i++) {
      await btn(page, 'Bid 1').click();
      await page.waitForTimeout(350);
    }
    await check('dealer locked');
    await btn(page, 'Scoreboard').click();
    await check('board sheet');
    await page.getByRole('row', { name: /Edit round 1/ }).click();
    await check('edit sheet');
    await page.keyboard.press('Escape');
    await btn(page, 'Menu').click();
    await check('menu sheet');
    await page.keyboard.press('Escape');

    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    await startGame(page, [...names], async (step) => check(step));
    await check('bidding');
    await bidEveryone(page);
    await btn(page, 'Start playing').click();
    await check('play');
    await btn(page, 'Enter results').click();
    await check('results');
    await page.getByRole('switch').click();
    await check('results exact');
    await page.getByRole('switch').click();
    const made = page.getByRole('button', { name: /Made/ });
    for (let k = 0; k < names.length - 1; k++) await made.nth(k).click();
    await page
      .getByRole('button', { name: /Missed/ })
      .last()
      .click();
    await btn(page, 'Confirm round').click();
    await check('summary');
    await btn(page, 'End game').click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'End game' }).click();
    await check('winner');
    await btn(page, /Share/).click();
    await check('share sheet');

    expect(found, JSON.stringify(found, null, 1)).toEqual([]);
  });
}
