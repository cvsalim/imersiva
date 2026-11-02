import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8082',
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'php -S 127.0.0.1:8082 -t dist',
    url: 'http://127.0.0.1:8082',
    reuseExistingServer: false,
  },
});
