import { expect, test } from '@playwright/test';

test('streaming largo mantiene geometría acotada, protege visibilidad y rebasa sin salto', async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      runtimeErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  await page.goto('/?debug=1&noAudio=1&seed=phase-4-long-stream');
  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-layout-valid', 'true');
  await expect(app).toHaveAttribute('data-boot-duration-ms', /\d/);
  expect(Number(await app.getAttribute('data-boot-duration-ms'))).toBeLessThan(5_000);
  await expect
    .poll(async () => Number(await app.getAttribute('data-streaming-route-length')))
    .toBeGreaterThan(500);
  await expect(app).toHaveAttribute('data-fog-mode', 'linear');
  expect(Number(await app.getAttribute('data-fog-start'))).toBe(16);
  expect(Number(await app.getAttribute('data-fog-end'))).toBe(44);

  const startRoomId = await app.getAttribute('data-current-room-id');
  const signature = await app.getAttribute('data-layout-signature');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(app).toHaveAttribute('data-game-state', 'playing');

  await page.evaluate(() => {
    document
      .querySelector('#app')
      ?.dispatchEvent(
        new CustomEvent('backrooms:debug-advance-streaming', { detail: { steps: 180 } }),
      );
  });
  expect(runtimeErrors).toEqual([]);

  await expect
    .poll(async () => Number(await app.getAttribute('data-streaming-route-index')))
    .toBeGreaterThanOrEqual(180);
  await expect(app).toHaveAttribute('data-debug-streaming-pending', 'false');
  expect(await app.getAttribute('data-current-room-id')).not.toBe(startRoomId);
  expect(Number(await app.getAttribute('data-visited-rooms'))).toBeGreaterThanOrEqual(181);
  expect(Number(await app.getAttribute('data-stream-materialized-rooms'))).toBeLessThanOrEqual(60);
  expect(Number(await app.getAttribute('data-stream-peak-materialized-rooms'))).toBeLessThanOrEqual(
    60,
  );
  expect(Number(await app.getAttribute('data-world-active-rooms'))).toBeLessThanOrEqual(60);
  expect(Number(await app.getAttribute('data-world-pooled-rooms'))).toBeLessThanOrEqual(8);
  expect(Number(await app.getAttribute('data-stream-dematerializations'))).toBeGreaterThan(0);
  expect(Number(await app.getAttribute('data-visible-unload-violations'))).toBe(0);
  expect(Number(await app.getAttribute('data-floating-origin-rebases'))).toBeGreaterThan(0);
  expect(Number(await app.getAttribute('data-scene-meshes'))).toBeLessThan(800);

  const localX = Number(await app.getAttribute('data-player-x'));
  const localZ = Number(await app.getAttribute('data-player-z'));
  const threshold = Number(await app.getAttribute('data-floating-origin-threshold'));
  expect(Math.hypot(localX, localZ)).toBeLessThan(threshold + 0.01);
  await page.waitForTimeout(500);
  await expect.poll(async () => Number(await app.getAttribute('data-fps'))).toBeGreaterThan(20);
  await page.screenshot({ path: 'test-results/phase4-streaming-after-180-rooms.png' });

  await page.evaluate(() => document.exitPointerLock());
  await expect(app).toHaveAttribute('data-game-state', 'paused');
  await page.getByRole('button', { name: 'Reiniciar semilla' }).click();
  await expect(app).toHaveAttribute('data-game-state', 'playing');
  await expect(app).toHaveAttribute('data-current-room-id', startRoomId ?? '');
  await expect(app).toHaveAttribute('data-layout-signature', signature ?? '');
  await expect(app).toHaveAttribute('data-visited-rooms', '1');
  await expect(app).toHaveAttribute('data-stream-history-rooms', '1');
  await expect(app).toHaveAttribute('data-floating-origin-rebases', '0');
  await expect(app).toHaveAttribute('data-floating-origin-x', '0.0000');
  await expect(app).toHaveAttribute('data-floating-origin-z', '0.0000');
  expect(Number(await app.getAttribute('data-stream-materialized-rooms'))).toBeLessThanOrEqual(60);
  expect(runtimeErrors).toEqual([]);
});
