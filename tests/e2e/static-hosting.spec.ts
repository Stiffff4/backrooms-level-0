import { expect, test } from '@playwright/test';

test('la build autosuficiente funciona bajo subruta con headers y final jugable', async ({
  page,
  request,
}) => {
  const runtimeErrors: string[] = [];
  const externalRequests: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('request', (resource) => {
    const url = new URL(resource.url());
    if (url.origin !== 'http://127.0.0.1:4174') externalRequests.push(resource.url());
  });

  const response = await page.goto('./?debug=1&exitNow=1&noAudio=1&seed=phase-9-static-hosting');
  expect(response?.status()).toBe(200);
  expect(response?.headers()['content-security-policy']).toContain("default-src 'self'");
  expect(response?.headers()['cache-control']).toContain('no-store');
  expect(response?.headers()['x-content-type-options']).toBe('nosniff');
  expect(response?.headers()['cross-origin-opener-policy']).toBe('same-origin');
  expect(response?.headers()['cross-origin-resource-policy']).toBe('same-origin');
  expect(response?.headers()['x-frame-options']).toBe('DENY');
  expect(response?.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(response?.headers()['permissions-policy']).toContain('microphone=()');
  await expect(page.locator('#app')).toHaveAttribute('data-game-state', 'title');
  await expect(page.locator('#app')).toHaveAttribute('data-textures-ready', 'true');

  const entryUrl = await page.locator('script[type="module"]').getAttribute('src');
  expect(entryUrl).toMatch(/^\/threshold\/assets\/index-[\w-]+\.js$/);
  const entryResponse = await request.get(entryUrl ?? '');
  expect(entryResponse.status()).toBe(200);
  expect(entryResponse.headers()['cache-control']).toContain('immutable');
  expect(entryResponse.headers()['content-type']).toContain('text/javascript');
  const favicon = await request.get('/threshold/favicon.svg');
  expect(favicon.status()).toBe(200);
  expect(favicon.headers()['content-type']).toContain('image/svg+xml');
  const texture = await request.get('/threshold/assets/generated/wall-paper.png');
  expect(texture.status()).toBe(200);
  expect(texture.headers()['cache-control']).not.toContain('immutable');
  const legalNotice = await request.get('/threshold/legal/NOTICE.txt');
  expect(legalNotice.status()).toBe(200);
  expect(legalNotice.headers()['content-type']).toContain('text/plain');
  expect((await request.get('/package.json')).status()).toBe(404);

  const app = page.locator('#app');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(app).toHaveAttribute('data-game-state', 'playing');
  await app.evaluate((element) =>
    element.dispatchEvent(new CustomEvent('backrooms:debug-approach-exit')),
  );
  await expect(app).toHaveAttribute('data-debug-exit-approach', 'ready');
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })));
  await expect(app).toHaveAttribute('data-game-state', 'ended');
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })));
  await expect(page.getByRole('dialog', { name: 'THRESHOLD' })).toBeVisible();

  expect(externalRequests).toEqual([]);
  expect(runtimeErrors).toEqual([]);
});
