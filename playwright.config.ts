import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: 'static-hosting.spec.ts',
  fullyParallel: false,
  // Babylon/WebGL scenarios share a finite GPU budget; serial browser workers
  // keep movement timing, screenshots and long streaming checks deterministic.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    // Headless Chromium no longer opts into its trusted software WebGL fallback
    // automatically. The explicit flag prevents context-loss flakes on CI and
    // local machines without a browser-visible GPU.
    launchOptions: { args: ['--enable-unsafe-swiftshader'] },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
