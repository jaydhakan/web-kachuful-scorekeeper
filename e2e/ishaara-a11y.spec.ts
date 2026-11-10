import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { giveClue, ishBtn, openIshaara, readyGame, TEAM } from './ishaara-helpers';

// Ishaara's screens pass axe (no serious or critical violations), and the board and clue phone keep 44px targets.

/** Waits for the screen's entrance to finish, as app.spec.ts and targets.spec.ts do. */
async function settle(page: Page) {
  await page.waitForTimeout(500);
  // Scroll-driven edge fades (duration auto) never finish, so only timed animations are waited on.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => {
      const t = a.effect?.getTiming();
      return t?.iterations === Infinity || t?.duration === 'auto' || a.playState !== 'running';
    }),
  );
}

async function scan(page: Page, label: string) {
  await settle(page);
  const r = await new AxeBuilder({ page }).analyze();
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(
    bad.map(
      (v) => `${label}: ${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes[0].target.join(' ')}`,
    ),
  ).toEqual([]);
}

interface Small {
  screen: string;
  label: string;
  w: number;
  h: number;
}

/** Every visible control outside inert layers smaller than 44 × 44 (targets.spec.ts's measure). */
async function smallControls(page: Page, screen: string): Promise<Small[]> {
  await settle(page);
  return page.evaluate((screen) => {
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
}

test('setup, the board, the result, the clue key and history have no serious axe violations', async ({
  page,
  browser,
}) => {
  test.setTimeout(60_000);
  await openIshaara(page, 'admin');
  await scan(page, 'home');
  await ishBtn(page, 'New game').click();
  await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible();
  await scan(page, 'setup teams');
  await page.goto('/ishaara');
  await ishBtn(page, 'History').click();
  await expect(page.getByRole('heading', { name: 'History' }).first()).toBeVisible();
  await scan(page, 'history');

  const { phones, t, close } = await readyGame(page, browser);
  await scan(phones[t], 'clue entry');
  await giveClue(phones[t], 'Quasar', 2);
  await expect(phones[t].getByText('Your clue: QUASAR · 2')).toBeVisible();
  await scan(phones[t], 'clue key, guessing');
  const them = t === 'sun' ? phones.moon : phones.sun;
  await expect(ishBtn(them, 'Not allowed')).toBeEnabled();
  await scan(them, 'clue key, their turn');
  await scan(page, 'board');
  await ishBtn(page, 'Menu').click();
  await ishBtn(page, `${TEAM[t]} resigns`).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Resign' }).click();
  await expect(page.getByText(`${TEAM[t]} resigned.`)).toBeVisible({ timeout: 10_000 });
  await scan(page, 'win');
  await scan(phones[t], 'clue key, finished');
  await close();
});

test('every control on the board and the clue phone is at least 44px', async ({
  page,
  browser,
}) => {
  const { phones, t, close } = await readyGame(page, browser);
  const found: Small[] = [];
  found.push(...(await smallControls(phones[t], 'clue entry')));
  await giveClue(phones[t], 'Quasar', 2);
  await expect(phones[t].getByText('Your clue: QUASAR · 2')).toBeVisible();
  const them = t === 'sun' ? phones.moon : phones.sun;
  found.push(...(await smallControls(them, 'clue phone, Not allowed')));
  found.push(...(await smallControls(page, 'board')));
  await page
    .getByRole('button', { name: /, face down$/ })
    .first()
    .click();
  found.push(...(await smallControls(page, 'board, confirm')));
  await ishBtn(page, 'Menu').click();
  found.push(...(await smallControls(page, 'board menu')));
  expect(found, JSON.stringify(found, null, 1)).toEqual([]);
  await close();
});
