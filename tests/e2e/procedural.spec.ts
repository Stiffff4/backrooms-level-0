import { expect, test } from '@playwright/test';

test('la misma seed conserva el grafo y otra seed altera el layout', async ({ page }) => {
  const app = page.locator('#app');
  await page.goto('/?debug=1&noAudio=1&seed=phase-3-repeatable');
  await expect(app).toHaveAttribute('data-layout-valid', 'true');
  await expect.poll(async () => Number(await app.getAttribute('data-room-count'))).toBe(1024);
  expect(Number(await app.getAttribute('data-connection-count'))).toBe(1023);
  expect(Number(await app.getAttribute('data-stream-materialized-rooms'))).toBeLessThanOrEqual(60);
  expect(Number(await app.getAttribute('data-world-active-rooms'))).toBeLessThanOrEqual(60);
  expect(Number(await app.getAttribute('data-world-pooled-rooms'))).toBeLessThanOrEqual(8);
  expect(Number(await app.getAttribute('data-world-meshes'))).toBeLessThan(250);
  expect(Number(await app.getAttribute('data-world-colliders'))).toBeLessThan(100);
  expect(Number(await app.getAttribute('data-world-triangles'))).toBeLessThan(250_000);

  const firstSignature = await app.getAttribute('data-layout-signature');
  expect(firstSignature).toBeTruthy();
  await page.reload();
  await expect(app).toHaveAttribute('data-layout-signature', firstSignature ?? '');

  await page.goto('/?debug=1&noAudio=1&seed=phase-3-different');
  await expect(app).toHaveAttribute('data-layout-valid', 'true');
  const differentSignature = await app.getAttribute('data-layout-signature');
  expect(differentSignature).toBeTruthy();
  expect(differentSignature).not.toBe(firstSignature);
});

test('el jugador atraviesa una unión modular y activa la habitación vecina', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      runtimeErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  await page.goto('/?debug=1&noAudio=1&seed=phase-3-crossing');
  const app = page.locator('#app');
  const startRoom = await app.getAttribute('data-current-room-id');
  expect(startRoom).toBeTruthy();

  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(app).toHaveAttribute('data-game-state', 'playing');
  await page.waitForTimeout(350);
  await page.screenshot({ path: 'test-results/phase3-modular-start.png' });
  await page.keyboard.down('Shift');
  await page.keyboard.down('w');
  await expect
    .poll(async () => app.getAttribute('data-current-room-id'), { timeout: 7_000 })
    .not.toBe(startRoom);
  await page.keyboard.up('w');
  await page.keyboard.up('Shift');
  await page.screenshot({ path: 'test-results/phase3-modular-crossing.png' });

  await expect
    .poll(async () => Number(await app.getAttribute('data-visited-rooms')))
    .toBeGreaterThanOrEqual(2);
  await expect(app).toHaveAttribute('data-player-grounded', 'true');
  const layoutSignature = await app.getAttribute('data-layout-signature');

  await page.evaluate(() => document.exitPointerLock());
  await expect(app).toHaveAttribute('data-game-state', 'paused');
  await page.getByRole('button', { name: 'Reiniciar semilla' }).click();
  await expect(app).toHaveAttribute('data-game-state', 'playing');
  await expect(app).toHaveAttribute('data-current-room-id', startRoom ?? '');
  await expect(app).toHaveAttribute('data-visited-rooms', '1');
  await expect(app).toHaveAttribute('data-layout-signature', layoutSignature ?? '');
  expect(runtimeErrors).toEqual([]);
});
