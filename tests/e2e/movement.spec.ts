import { expect, test } from '@playwright/test';

test('persisten FOV y sensibilidad entre recargas', async ({ page }) => {
  await page.goto('/');

  await page.getByText('Ajustes', { exact: true }).click();
  const fov = page.locator('#title-fov');
  const sensitivity = page.locator('#title-sensitivity');
  await fov.fill('94');
  await sensitivity.fill('1.25');
  await page.reload();
  await page.getByText('Ajustes', { exact: true }).click();

  await expect(page.locator('#title-fov')).toHaveValue('94');
  await expect(page.locator('#title-sensitivity')).toHaveValue('1.25');
});

test('pointer lock inicia la partida, WASD mueve y Escape pausa', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      runtimeErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  await page.goto('/?debug=1&noAudio=1');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-game-state', 'playing');
  await page.waitForTimeout(350);
  await page.screenshot({ path: 'test-results/phase1-gameplay.png' });

  const before = Number(await page.locator('#app').getAttribute('data-player-z'));
  await page.keyboard.down('w');
  await page.waitForTimeout(500);
  await page.keyboard.up('w');

  await expect
    .poll(async () => Number(await page.locator('#app').getAttribute('data-player-z')))
    .toBeGreaterThan(before + 0.2);

  await page.keyboard.press('Escape');
  if ((await page.locator('#app').getAttribute('data-game-state')) === 'playing') {
    // Headless Chromium does not always route the browser-reserved Escape key to pointer lock.
    await page.evaluate(() => document.exitPointerLock());
  }
  await expect(page.locator('#app')).toHaveAttribute('data-game-state', 'paused');
  await expect(page.getByRole('heading', { name: 'Pausa' })).toBeVisible();

  await page.getByRole('button', { name: 'Reanudar' }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-game-state', 'playing');

  await page.keyboard.down('Shift');
  await page.keyboard.down('w');
  await page.waitForTimeout(3_000);
  await page.keyboard.up('w');
  await page.keyboard.up('Shift');

  const finalZ = Number(await page.locator('#app').getAttribute('data-player-z'));
  const finalY = Number(await page.locator('#app').getAttribute('data-player-y'));
  expect(finalZ).toBeGreaterThan(4);
  expect(finalZ).toBeLessThan(5.8);
  expect(finalY).toBeGreaterThanOrEqual(-0.05);
  expect(finalY).toBeLessThan(0.15);

  await page.keyboard.down('Shift');
  await page.keyboard.down('d');
  await page.waitForTimeout(2_100);
  await page.keyboard.up('d');
  await page.keyboard.up('Shift');
  const eastX = Number(await page.locator('#app').getAttribute('data-player-x'));
  expect(eastX).toBeGreaterThan(6.5);
  expect(eastX).toBeLessThan(7.8);

  await page.keyboard.down('Shift');
  await page.keyboard.down('s');
  await page.waitForTimeout(3_100);
  await page.keyboard.up('s');
  await page.keyboard.up('Shift');
  const southZ = Number(await page.locator('#app').getAttribute('data-player-z'));
  expect(southZ).toBeGreaterThan(-5.8);
  expect(southZ).toBeLessThan(-4.5);

  await page.keyboard.down('Shift');
  await page.keyboard.down('a');
  await page.waitForTimeout(3_800);
  await page.keyboard.up('a');
  await page.keyboard.up('Shift');
  const westX = Number(await page.locator('#app').getAttribute('data-player-x'));
  expect(westX).toBeGreaterThan(-7.8);
  expect(westX).toBeLessThan(-6.5);
  expect(Number(await page.locator('#app').getAttribute('data-fps'))).toBeGreaterThan(50);

  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#app')).toHaveAttribute('data-game-state', 'paused');
  expect(runtimeErrors).toEqual([]);
});
