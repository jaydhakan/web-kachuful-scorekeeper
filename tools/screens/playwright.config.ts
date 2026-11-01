import { defineConfig } from '@playwright/test';

/**
 * Screenshots of every screen for design review: `npx playwright test -c tools/screens` → screenshots/. Runs against
 * the dev server on localhost:5173 (started if not running), which proxies /api to a backend on 127.0.0.1:8000 for
 * the signed-in screens; those reset the backend's demo data first.
 *
 * Options: SHOT_PORT (dev server port), SHOT_DIR (output root), SHOT_DEVICES (e.g. `p360,p412`), SHOT_THEME (the
 * `kf.theme` the app boots in).
 */
const PORT = process.env.SHOT_PORT ?? '5173';

export default defineConfig({
  testDir: '.',
  workers: 1,
  timeout: 300_000,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    serviceWorkers: 'block',
    actionTimeout: 6000,
  },
  webServer: {
    command: `npm run dev -- --host localhost --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
