import { defineConfig } from '@playwright/test';

/**
 * Screenshots of every screen for design review: `npx playwright test -c tools/screens` → screenshots/. Runs against
 * the dev server on localhost:5173 (started if not running), which proxies /api to a backend on 127.0.0.1:8000 for
 * the signed-in screens; those reset the backend's demo data first.
 */
export default defineConfig({
  testDir: '.',
  workers: 1,
  timeout: 300_000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
    serviceWorkers: 'block',
    actionTimeout: 6000,
  },
  webServer: {
    command: 'npm run dev -- --host localhost --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
