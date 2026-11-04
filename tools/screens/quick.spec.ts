import { test } from '@playwright/test';
import { seedGame, type SeedView } from '../../e2e/fixtures';

// One seeded view per theme at 360×780, for a quick look: OUT=<dir> VIEWS=home,bidding,... (SHOT_PORT as screens).
const OUT = process.env.OUT!;
const VIEWS = (process.env.VIEWS ?? 'home,bidding').split(',');
const THEMES = (process.env.THEMES ?? 'sunset-glass,yerba-sun,editorial-paper,emerald-gilt').split(
  ',',
);
test.use({
  viewport: { width: 360, height: 780 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
for (const theme of THEMES)
  for (const view of VIEWS)
    test(`${theme} ${view}`, async ({ page }) => {
      await page.goto('/');
      await page.evaluate(
        ([th, v, g]) => {
          localStorage.clear();
          localStorage.setItem('kf.theme', th);
          if (v !== 'home') {
            localStorage.setItem('kachuful.v1', JSON.stringify(g));
            localStorage.setItem(
              'kachuful.screen',
              JSON.stringify(v === 'winner' ? 'winner' : 'round'),
            );
          }
        },
        [
          theme,
          view,
          view === 'home'
            ? null
            : seedGame(5, view as SeedView, ['Aarav', 'Riya', 'Kabir', 'Meera', 'Dev']),
        ] as const,
      );
      await page.reload();
      await page.waitForTimeout(1600);
      await page.screenshot({ path: `${OUT}/${theme}-${view}.png` });
    });
