import { expect, test } from '@playwright/test';
import { openSeeded, seedGame } from './fixtures';
import { btn, nameField } from './helpers';

const h1 = (page: import('@playwright/test').Page, name: string) =>
  page.getByRole('heading', { level: 1, name, exact: true });

test.describe('Kachuful and the system Back', () => {
  test('steps back through setup, asks before dropping seated players, then reaches Home', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /^Kachuful.*Play$/ }).click();
    await expect(h1(page, 'Kachuful')).toBeVisible();
    await btn(page, 'New Game').click();
    await btn(page, '4 players').click();
    await btn(page, 'Next').click();
    const field = await nameField(page);
    await field.fill('Aarav');
    await field.press('Enter');
    await page.getByText('1 of 4 seated').waitFor();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    // Step 2 → step 1, still in Kachuful.
    await page.goBack();
    await expect(btn(page, '4 players')).toBeVisible();
    await expect(page).toHaveURL(/\/kachuful$/);
    // Someone is seated: Back asks first, and Back again closes the question.
    await page.goBack();
    const ask = page.getByRole('alertdialog');
    await expect(ask).toBeVisible();
    await page.goBack();
    await expect(ask).toBeHidden();
    await expect(btn(page, '4 players')).toBeVisible();
    // Leaving through the question lands on Home, and one more Back reaches the landing page.
    await page.goBack();
    await ask.getByRole('button', { name: 'Leave setup' }).click();
    await expect(h1(page, 'Kachuful')).toBeVisible();
    await page.goBack();
    await expect(h1(page, 'Pick a game')).toBeVisible();
  });

  test('in a round it opens the menu instead of leaving the game', async ({ page }) => {
    await page.goto('/kachuful');
    await openSeeded(page, seedGame(4, 'bidding'), 'round');
    const menu = page.getByRole('dialog');
    await expect(menu).toBeHidden();
    await page.goBack();
    await expect(menu).toBeVisible();
    await expect(page).toHaveURL(/\/kachuful$/);
    await page.goBack();
    await expect(menu).toBeHidden();
    await expect(page).toHaveURL(/\/kachuful$/);
  });
});

test.describe('links that open a page once', () => {
  test('after signing in from the landing page, the Kachuful tile opens the game', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'Sign in' }).click();
    await page.getByLabel('Email').fill('admin@kachuful.test');
    await page.getByLabel('Password', { exact: true }).fill('admin-demo');
    await btn(page, 'Sign in').click();
    await expect(h1(page, 'Pick a game')).toBeVisible();
    // Landing back says it worked, so the return doesn't read as a reload.
    await expect(page.getByRole('status').filter({ hasText: 'Signed in as Jay' })).toBeVisible();
    await page.getByRole('link', { name: /^Kachuful.*Play$/ }).click();
    await expect(h1(page, 'Kachuful')).toBeVisible();
    await expect(h1(page, 'Sign in')).toHaveCount(0);
  });
});

/** Records, every frame, whether any page is on screen with content, and whether the loader is showing. */
async function watchFrames(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __frames: { blank: number; loader: number; frames: number } };
    w.__frames = { blank: 0, loader: 0, frames: 0 };
    const tick = () => {
      const pages = [...document.querySelectorAll<HTMLElement>('#root [data-page]')];
      const shown = pages.some(
        (p) => parseFloat(getComputedStyle(p).opacity) > 0.9 && p.innerText.trim(),
      );
      const loader = [...document.querySelectorAll('.sq-loader')].some(
        (l) => parseFloat(getComputedStyle(l).opacity) > 0.05,
      );
      w.__frames.frames++;
      if (!shown) w.__frames.blank++;
      if (loader) w.__frames.loader++;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
const frames = (page: import('@playwright/test').Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __frames: { blank: number; loader: number; frames: number } })
        .__frames,
  );

test.describe('moving between pages', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('a game tile opens its game with no blank frame and no loader, and Back the same', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(h1(page, 'Pick a game')).toBeVisible();
    await watchFrames(page);
    await page.getByRole('link', { name: /^Kaali Teeri/ }).click();
    await expect(h1(page, 'Kaali Teeri')).toBeVisible();
    await page.goBack();
    await expect(h1(page, 'Pick a game')).toBeVisible();
    await page.waitForTimeout(500);
    const f = await frames(page);
    expect(f.frames).toBeGreaterThan(10);
    expect(f.blank).toBe(0);
    expect(f.loader).toBe(0);
  });

  test('a slow page keeps the current one up with a progress bar until it is ready', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(h1(page, 'Pick a game')).toBeVisible();
    // Every script from now on takes 1.2s: the landing page's own warm-up can't have fetched Spades yet.
    await page.route('**/assets/*.js', async (r) => {
      await new Promise((ok) => setTimeout(ok, 1200));
      await r.continue();
    });
    await page.getByRole('link', { name: /^Spades/ }).click();
    await expect(page.locator('[data-nav-progress]')).toBeVisible();
    await expect(h1(page, 'Pick a game')).toBeVisible();
    await expect(h1(page, 'Spades')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-nav-progress]')).toHaveCount(0);
  });
});

test('a cold start paints the landing outline, then the page replaces it', async ({ page }) => {
  const html = await (await page.request.get('/')).text();
  expect(html).toContain('class="boot ');
  await page.goto('/');
  await expect(h1(page, 'Pick a game')).toBeVisible();
  await expect(page.locator('.boot')).toHaveCount(0);
});
