import { expect, test, type Locator, type Page } from '@playwright/test';
import { btn } from './helpers';

// Android shrinks the layout viewport when the keyboard opens (interactive-widget=resizes-content), which
// is what cutting the height does here. A real keyboard cannot be summoned in this runner.
const KEYBOARD = { width: 360, height: 380 };

/** Fully on screen, and the element at its centre is itself (nothing is laid over it). */
async function reachable(page: Page, el: Locator, what: string) {
  const box = (await el.boundingBox())!;
  expect(box, `${what} has a box`).toBeTruthy();
  const vp = page.viewportSize()!;
  expect(box.y, `${what} top`).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height, `${what} bottom`).toBeLessThanOrEqual(vp.height + 0.5);
  const hit = await el.evaluate((node) => {
    const r = node.getBoundingClientRect();
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return !!top && (node === top || node.contains(top) || top.contains(node));
  });
  expect(hit, `${what} is not covered`).toBe(true);
}

/** The service worker's "Ready to work offline" toast is not what is under test and can sit over a field. */
const quiet = (page: Page) =>
  expect(page.getByText('Ready to work offline')).toHaveCount(0, { timeout: 8000 });

test('Setup 2: the name field and Add stay visible with the keyboard open', async ({ page }) => {
  await page.goto('/');
  await btn(page, 'New Game').click();
  await btn(page, '5 players').click();
  await btn(page, 'Next').click();
  await quiet(page);
  const input = page.getByLabel('Player name');
  await page.setViewportSize(KEYBOARD);
  await input.focus();
  await page.waitForTimeout(500);
  await reachable(page, input, 'the name field');
  await reachable(page, btn(page, 'Add'), 'Add');
  // They are in view where the screen starts, not only after the browser scrolled them there.
  const region = page.getByRole('region', { name: 'Content' });
  expect(await region.evaluate((el) => el.scrollTop)).toBe(0);
  // The field keeps its focus while the layout resizes around it.
  await expect(input).toBeFocused();
  await input.fill('Riya');
  await input.press('Enter');
  // The table is out of the way, so the prompt is what shows the name was seated.
  await expect(page.getByText(/sitting on Riya/)).toBeVisible();
  await reachable(page, input, 'the name field after adding');
});

test('Rename: the field and Save stay visible with the keyboard open', async ({ page }) => {
  await page.goto('/');
  await btn(page, 'New Game').click();
  await btn(page, '3 players').click();
  await btn(page, 'Next').click();
  const input = page.getByLabel('Player name');
  await input.fill('Riya');
  await input.press('Enter');
  await quiet(page);
  await page.locator('[data-table="su2"] [data-seat="0"]').click();
  await btn(page, 'Rename').click();
  const field = page.getByRole('dialog').getByRole('textbox');
  await field.focus();
  await page.setViewportSize(KEYBOARD);
  await page.waitForTimeout(500);
  await reachable(page, field, 'the rename field');
  await reachable(
    page,
    page.getByRole('dialog').getByRole('button', { name: /Save|Done|OK/ }),
    'Save',
  );
  await expect(field).toBeFocused();
});
