import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    // Locally use the installed Chrome so no browser download is needed.
    channel: process.env.CI ? undefined : 'chrome',
    trace: 'retain-on-failure',
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'phone',
      testIgnore: /\.desktop\.spec\.ts$/,
      use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } },
    },
    {
      // Mouse and keyboard: no touch, a fine pointer and real hover.
      name: 'desktop',
      testMatch: /\.desktop\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
