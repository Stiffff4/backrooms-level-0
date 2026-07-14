import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'static-hosting.spec.ts',
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-static-report' }]],
  use: {
    baseURL: 'http://127.0.0.1:4174/threshold/',
    launchOptions: { args: ['--enable-unsafe-swiftshader'] },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium-static', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command:
      'npm run typecheck && npx vite build --base=/threshold/ --outDir dist-static && node tools/serve-dist.mjs --root dist-static --base /threshold/ --port 4174',
    url: 'http://127.0.0.1:4174/threshold/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
