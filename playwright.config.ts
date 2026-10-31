import { defineConfig, devices } from '@playwright/test';

// Parallel runs (separate worktrees) each need their own server; set E2E_PORT to keep them apart.
const port = Number(process.env.E2E_PORT ?? 4173);
/**
 * E2E_API=local runs the online specs against a real backend on 127.0.0.1:8000 (HANDOFF §2): the app is served on
 * localhost:5173, the backend's APP_ORIGIN, and proxies /api to it. Each test resets the demo data, so one at a time.
 */
const real = !!process.env.E2E_API;
const base = real ? 'http://localhost:5173' : `http://127.0.0.1:${port}`;
const ONLINE = /(accounts|sync|global|share|photos)\.spec\.ts$/;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: !real,
  workers: real ? 1 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: base,
    // Locally use the installed Chrome so no browser download is needed.
    channel: process.env.CI ? undefined : 'chrome',
    trace: 'retain-on-failure',
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'phone',
      testIgnore: /\.desktop\.spec\.ts$/,
      ...(real && { testMatch: ONLINE }),
      use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } },
    },
    {
      // Mouse and keyboard: no touch, a fine pointer and real hover.
      name: 'desktop',
      testMatch: real ? /^$/ : /\.desktop\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: real
      ? 'npm run build && npm run preview -- --host localhost --port 5173 --strictPort'
      : `npm run build && npm run preview -- --mode mock --host 127.0.0.1 --port ${port} --strictPort`,
    url: base,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
