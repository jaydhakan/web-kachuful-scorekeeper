import { expect, test, type Page } from '@playwright/test';
import { NAMES7, bidEveryone, btn, startGame } from './helpers';
import { ishBtn, openIshaara, readyGame, TEAM } from './ishaara-helpers';

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
      // A radio or checkbox inside its label is hit through the label.
      const r = ((el.matches('input') && el.closest('label')) || el).getBoundingClientRect();
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

/** Waits out the outgoing screen's fade and every finite animation (scroll-driven fades never finish). */
async function settle(page: Page) {
  await page.waitForTimeout(500);
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => {
      const t = a.effect?.getTiming();
      return t?.iterations === Infinity || t?.duration === 'auto' || a.playState !== 'running';
    }),
  );
  await page.waitForTimeout(200);
}

for (const [w, h, names] of [
  [390, 844, NAMES7.slice(0, 5)],
  [360, 740, NAMES7],
] as const) {
  test(`every control is at least 44px at ${w}×${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const found: Small[] = [];
    const check = async (screen: string) => {
      // The outgoing screen fades for 420 ms; measure once it and every finite animation are done.
      await page.waitForTimeout(500);
      await page.waitForFunction(() =>
        document
          .getAnimations()
          .every((a) => a.effect?.getTiming().iterations === Infinity || a.playState !== 'running'),
      );
      await page.waitForTimeout(200);
      found.push(...(await smallControls(page, screen)));
    };

    await page.goto('/kachuful');
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
    // Closing a sheet steps the history back; navigating before that lands aborts the navigation.
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.waitForTimeout(300);

    await page.evaluate(() => localStorage.clear());
    await page.goto('/kachuful');
    await startGame(page, [...names], async (step) => check(step));
    await check('bidding');
    await bidEveryone(page);
    await btn(page, 'Start playing').click();
    await check('play');
    await btn(page, 'Enter results').click();
    await check('results');
    // A real set of results: the first player made their 1, everyone else missed (the tricks can be shared out).
    await page.getByRole('button', { name: /Made/ }).first().click();
    const missed = page.getByRole('button', { name: /Missed/ });
    for (let k = 1; k < names.length; k++) await missed.nth(k).click();
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

/**
 * Ishaara's open findings below 44px, by size. Anything else fails; so does a listed one that no longer shows,
 * so the fix must delete its line here.
 */
const ISH_KNOWN: { id: string; screen: string; label: RegExp; at: number }[] = [];

for (const [w, h] of [
  [390, 844],
  [360, 740],
] as const) {
  test(`every Ishaara control is at least 44px at ${w}×${h}`, async ({ page, browser }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: w, height: h });
    const found: Small[] = [];
    const check = async (on: Page, screen: string) => {
      await settle(on);
      found.push(...(await smallControls(on, screen)));
    };

    await openIshaara(page, 'admin');
    await check(page, 'home');
    await ishBtn(page, 'New game').click();
    await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible();
    await check(page, 'setup teams');
    await page.goto('/ishaara');

    const phone = { viewport: { width: w, height: h }, hasTouch: true, isMobile: true };
    const { phones, t, close } = await readyGame(page, browser, {
      phone: { ...phone, reducedMotion: 'reduce' },
    });
    const them = t === 'sun' ? phones.moon : phones.sun;
    await check(page, 'board');
    await phones[t].getByLabel('Your clue · one word').fill('Quasar');
    await ishBtn(phones[t], '2').click();
    await check(phones[t], 'clue entry');
    await ishBtn(phones[t], 'Send QUASAR · 2').click();
    await expect(phones[t].getByText('Your clue: QUASAR · 2')).toBeVisible();
    await check(phones[t], 'clue key, guessing');
    await check(them, 'clue key, their turn');
    await page
      .getByRole('list', { name: 'Words', exact: true })
      .getByRole('button')
      .first()
      .click();
    await check(page, 'board, confirm');
    await ishBtn(page, 'Menu').click();
    await check(page, 'board menu');
    await ishBtn(page, `${TEAM[t]} resigns`).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Resign' }).click();
    await expect(page.getByText(`${TEAM[t]} resigned.`)).toBeVisible({ timeout: 10_000 });
    await check(page, 'win');
    await check(phones[t], 'clue key, finished');
    await close();

    const known = (f: Small) =>
      ISH_KNOWN.some((k) => k.at === w && k.screen === f.screen && k.label.test(f.label));
    expect(
      found.filter((f) => !known(f)),
      JSON.stringify(found, null, 1),
    ).toEqual([]);
    for (const k of ISH_KNOWN.filter((k) => k.at === w))
      expect(
        found.some((f) => f.screen === k.screen && k.label.test(f.label)),
        `${k.id} no longer shows at ${w}×${h}: delete it from ISH_KNOWN`,
      ).toBe(true);
  });
}
