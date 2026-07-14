import { expect, test, type Page } from '@playwright/test';

async function dispatchKey(page: Page, type: 'keydown' | 'keyup', code: string): Promise<void> {
  await page.evaluate(
    ({ eventType, eventCode }) =>
      window.dispatchEvent(new KeyboardEvent(eventType, { code: eventCode })),
    { eventType: type, eventCode: code },
  );
}

async function enterAndApproachExit(page: Page, withAudio = false): Promise<void> {
  await page.goto(
    `/?debug=1&exitNow=1&seed=phase-8-controlled-exit${withAudio ? '' : '&noAudio=1'}`,
  );
  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-exit-spawned', 'true');
  await expect(app).toHaveAttribute('data-exit-forced', 'true');
  await expect(app).toHaveAttribute('data-exit-force-reason', 'debug');
  await expect(app).toHaveAttribute('data-exit-protected', 'true');
  await expect
    .poll(async () => Number(await app.getAttribute('data-exit-visual-meshes')))
    .toBeGreaterThanOrEqual(6);

  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(app).toHaveAttribute('data-game-state', 'playing');
  await page.waitForTimeout(500);
  await app.evaluate((element) =>
    element.dispatchEvent(new CustomEvent('backrooms:debug-approach-exit')),
  );
  await expect(app).toHaveAttribute('data-debug-exit-approach', 'ready');
  await expect(app).toHaveAttribute(
    'data-current-room-id',
    (await app.getAttribute('data-exit-room-id')) ?? '',
  );
  await expect
    .poll(async () => Number(await app.getAttribute('data-exit-distance')))
    .toBeLessThan(1.4);
}

test('la salida forzada se protege, se cruza sin tecla de uso y permite repetir la semilla', async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  await enterAndApproachExit(page);
  const app = page.locator('#app');
  const firstReservation = await app.evaluate((element) => ({
    roomId: element.dataset.exitRoomId,
    surfaceId: element.dataset.exitSurfaceId,
    seed: element.dataset.seed,
  }));

  await dispatchKey(page, 'keydown', 'KeyW');
  await expect(app).toHaveAttribute('data-game-state', 'exitTransition');
  await dispatchKey(page, 'keyup', 'KeyW');
  await expect(app).toHaveAttribute('data-game-state', 'ended');
  await expect(app).toHaveAttribute('data-game-completed', 'true');
  await expect(app).toHaveAttribute('data-exit-fade-opacity', '1.0000');
  await expect(page.getByRole('heading', { name: 'THRESHOLD' })).toBeVisible();
  await expect(page.getByText('Gracias por jugar.')).toBeVisible();
  await expect(page.locator('.end-screen__seed')).toHaveText('phase-8-controlled-exit');
  await expect(page.locator('.end-screen__rooms')).not.toHaveText('0');
  await page.locator('.debug-hud').evaluate((element) => element.setAttribute('hidden', ''));
  if (!process.env.CI) {
    await expect(page).toHaveScreenshot('visual-end-screen.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
      threshold: 0.15,
    });
  }

  await page.getByRole('button', { name: 'Repetir esta semilla' }).click();
  await expect(app).toHaveAttribute('data-game-state', 'playing');
  await expect(app).toHaveAttribute('data-game-completed', 'false');
  await expect(app).toHaveAttribute('data-exit-spawned', 'true');
  const repeatedReservation = await app.evaluate((element) => ({
    roomId: element.dataset.exitRoomId,
    surfaceId: element.dataset.exitSurfaceId,
    seed: element.dataset.seed,
  }));
  expect(repeatedReservation).toEqual(firstReservation);
  expect(runtimeErrors).toEqual([]);
});

test('el beacon direccional se inicializa y corta su zumbido durante la transición', async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  await enterAndApproachExit(page, true);
  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-audio-state', 'running');
  await expect(app).toHaveAttribute('data-exit-audio-nodes', '13');
  await expect(app).toHaveAttribute('data-exit-audio-active', 'true');

  await dispatchKey(page, 'keydown', 'KeyW');
  await expect(app).toHaveAttribute('data-game-state', 'exitTransition');
  await dispatchKey(page, 'keyup', 'KeyW');
  await expect(app).toHaveAttribute('data-game-state', 'ended');
  await expect(app).toHaveAttribute('data-exit-audio-transition-played', 'true');
  await expect(app).toHaveAttribute('data-audio-mix-state', 'paused');
  expect(runtimeErrors).toEqual([]);
});

test('la pared de salida conserva el lenguaje visual de Level 0', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  await enterAndApproachExit(page);
  await page.evaluate(() => document.exitPointerLock());
  await expect(page.locator('#app')).toHaveAttribute('data-game-state', 'paused');
  await page.locator('.pause-menu, .debug-hud').evaluateAll((elements) => {
    for (const element of elements) element.setAttribute('hidden', '');
  });
  await page.waitForTimeout(100);

  if (!process.env.CI) {
    await expect(page.locator('#game-canvas')).toHaveScreenshot('visual-exit.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.035,
      threshold: 0.22,
    });
  }
  expect(runtimeErrors).toEqual([]);
});
