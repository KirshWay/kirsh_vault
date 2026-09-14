import { defineConfig, devices } from '@playwright/test';

import { PRODUCTION_BASE_PATH } from './lib/config/site.mjs';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  workers: process.env.CI ? 1 : 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: `http://localhost:4173${PRODUCTION_BASE_PATH}/`, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: {
    command: 'node tests/serve-export.mjs',
    url: `http://localhost:4173${PRODUCTION_BASE_PATH}/`,
    reuseExistingServer: !process.env.CI,
  },
});
