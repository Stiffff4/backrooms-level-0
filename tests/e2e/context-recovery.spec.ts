import { expect, test } from '@playwright/test';

test('una pérdida real de WebGL conserva la partida y reconstruye el renderer', async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  await page.goto('/?debug=1&noAudio=1&seed=phase-9-context-recovery');
  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-webgl-recovery-phase', 'ready');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(app).toHaveAttribute('data-game-state', 'playing');
  await page.waitForTimeout(1_000);
  await expect(app).toHaveAttribute('data-webgl-recovery-phase', 'ready');

  const positionBeforeLoss = Number(await app.getAttribute('data-player-z'));
  const lossesBefore = Number(await app.getAttribute('data-webgl-context-losses'));
  const recoveriesBefore = Number(await app.getAttribute('data-webgl-context-recoveries'));
  await app.evaluate((element) =>
    element.dispatchEvent(new CustomEvent('backrooms:debug-context-loss')),
  );
  await expect(app).toHaveAttribute('data-debug-context-loss', 'requested');
  await expect(app).toHaveAttribute('data-webgl-context-losses', String(lossesBefore + 1));
  await expect(app).toHaveAttribute('data-webgl-recovery-phase', 'lost');
  await expect(
    page.getByRole('alertdialog', { name: 'La imagen se ha interrumpido' }),
  ).toBeVisible();
  await expect(app).toHaveAttribute('data-game-state', 'paused');
  await expect
    .poll(async () => Number(await app.getAttribute('data-player-z')))
    .toBeCloseTo(positionBeforeLoss, 3);

  await page.getByRole('button', { name: 'Intentar recuperar' }).click();
  await expect(app).toHaveAttribute('data-webgl-recovery-phase', 'ready', { timeout: 15_000 });
  await expect(app).toHaveAttribute('data-webgl-context-recoveries', String(recoveriesBefore + 1));
  await expect(page.getByRole('alertdialog')).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Pausa' })).toBeVisible();
  await expect(app).toHaveAttribute('data-game-state', 'paused');
  await expect(app).toHaveAttribute('data-webgl-recovery-error', '');

  await page.getByRole('button', { name: 'Reanudar' }).click();
  await expect(app).toHaveAttribute('data-game-state', 'playing');
  const positionBeforeMove = Number(await app.getAttribute('data-player-z'));
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })));
  await expect
    .poll(async () => Number(await app.getAttribute('data-player-z')))
    .toBeGreaterThan(positionBeforeMove + 0.05);
  const recoveredFrame = await page.locator('#game-canvas').screenshot();
  expect(recoveredFrame.byteLength).toBeGreaterThan(1_000);
  expect(runtimeErrors).toEqual([]);
});
