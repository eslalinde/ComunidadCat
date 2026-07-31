import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/electron',
  outputDir: './e2e/test-results-electron',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'electron-windows' }],
});
