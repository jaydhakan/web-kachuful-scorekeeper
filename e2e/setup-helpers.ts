import type { Locator, Page } from '@playwright/test';
import { openSeeded, seedGame } from './fixtures';
import { btn } from './helpers';

/** Seeds a saved group and recent names (as a returning player has), then opens Setup 1. */
export async function toSetup1(page: Page, n: number) {
  await page.goto('/');
  await openSeeded(page, seedGame(n, 'bidding'), 'home');
  await btn(page, 'New Game').click();
}

/** True when the screen's own content region has nothing to scroll. */
export const fits = (page: Page) =>
  page.evaluate(() => {
    const el = document.querySelector('[role="region"]')!;
    return el.scrollHeight <= el.clientHeight + 1;
  });

export async function inView(page: Page, loc: Locator) {
  const b = (await loc.boundingBox())!;
  const vp = page.viewportSize()!;
  return b.x >= 0 && b.y >= 0 && b.x + b.width <= vp.width + 1 && b.y + b.height <= vp.height + 1;
}
