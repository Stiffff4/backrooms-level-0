import { expect, test } from '@playwright/test';

test('el audio espera el gesto, acompaña los pasos y hace fade al pausar', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      runtimeErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  await page.goto('/?debug=1&seed=phase-2-audio');
  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-audio-state', 'uninitialized');
  await expect(app).toHaveAttribute('data-audio-node-count', '0');

  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(app).toHaveAttribute('data-game-state', 'playing');
  await expect(app).toHaveAttribute('data-audio-state', 'running');
  await expect
    .poll(async () => Number(await app.getAttribute('data-audio-node-count')))
    .toBeGreaterThan(8);
  await page.waitForTimeout(350);

  const beforeSteps = Number(await app.getAttribute('data-footstep-count'));
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })));
  await page.waitForTimeout(2_100);
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })));
  const audioDiagnostics = await app.evaluate((element) => ({ ...element.dataset }));
  await expect
    .poll(async () => Number(await app.getAttribute('data-footstep-count')), {
      message: JSON.stringify({ audioDiagnostics, runtimeErrors }),
    })
    .toBeGreaterThan(beforeSteps);

  await page.evaluate(() => document.exitPointerLock());
  await expect(app).toHaveAttribute('data-game-state', 'paused');
  await expect(app).toHaveAttribute('data-audio-mix-state', 'paused');

  expect(runtimeErrors).toEqual([]);
});

test('noAudio mantiene una ruta silenciosa sin crear AudioContext', async ({ page }) => {
  await page.goto('/?debug=1&noAudio=1');
  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-audio-state', 'disabled');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(app).toHaveAttribute('data-game-state', 'playing');
  await expect(app).toHaveAttribute('data-audio-state', 'disabled');
  await expect(app).toHaveAttribute('data-audio-node-count', '0');
});
