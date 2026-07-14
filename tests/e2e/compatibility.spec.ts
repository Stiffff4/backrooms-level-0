import { expect, test } from '@playwright/test';

test('WebGL2, Web Audio, pointer lock y UI funcionan en el navegador actual', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  await page.goto('/?debug=1&seed=phase-9-browser-matrix');
  const app = page.locator('#app');
  await expect(page).toHaveTitle('LEVEL 0 — THRESHOLD');
  await expect(app).toHaveAttribute('data-game-state', 'title');
  await expect(app).toHaveAttribute('data-layout-valid', 'true');
  await expect(app).toHaveAttribute('data-textures-ready', 'true');

  await page.getByRole('button', { name: 'Créditos' }).click();
  await expect(page.getByRole('dialog', { name: 'Créditos' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Créditos' })).toBeHidden();

  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(app).toHaveAttribute('data-game-state', 'playing', { timeout: 10_000 });
  await expect(app).toHaveAttribute('data-audio-state', 'running');
  await expect
    .poll(async () => Number(await app.getAttribute('data-audio-node-count')))
    .toBeGreaterThan(8);
  // Chromium-based headless browsers perform one transparent software-WebGL
  // handoff after startup. Measure input only once that renderer is settled.
  await page.waitForTimeout(2_000);

  const before = Number(await app.getAttribute('data-player-z'));
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })));
  await page.waitForTimeout(700);
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })));
  await expect
    .poll(async () => Number(await app.getAttribute('data-player-z')))
    .toBeGreaterThan(before + 0.1);

  await page.evaluate(() => document.exitPointerLock());
  await expect(app).toHaveAttribute('data-game-state', 'paused');
  await expect(page.getByRole('heading', { name: 'Pausa' })).toBeVisible();
  await expect(app).toHaveAttribute('data-audio-mix-state', 'paused');
  expect(runtimeErrors).toEqual([]);
});

test('un navegador sin WebGL muestra un fallback accesible antes de iniciar Babylon', async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => null,
    });
  });

  await page.goto('/?seed=phase-9-incompatible-browser');
  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-compatibility-status', 'incompatible');
  await expect(app).toHaveAttribute('data-capability-webgl2', 'false');
  await expect(app).not.toHaveAttribute('data-game-state', /.+/);
  const fallback = page.getByRole('alertdialog', {
    name: 'Este navegador no puede cruzar el umbral',
  });
  await expect(fallback).toBeVisible();
  await expect(fallback).toContainText('WebGL2 no está disponible');
  await expect(page.getByRole('button', { name: 'Volver a comprobar' })).toBeFocused();
  expect(runtimeErrors).toEqual([]);
});
