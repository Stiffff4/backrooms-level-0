import { expect, test } from '@playwright/test';

test('LightPool respeta presets y reduced flashing cambia el mismo runtime', async ({ page }) => {
  await page.goto('/?debug=1&noAudio=1&seed=phase-6-lighting-presets&quality=default');
  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-textures-ready', 'true');
  await expect(app).toHaveAttribute('data-light-pool-capacity', '8');
  await expect(app).toHaveAttribute('data-light-pool-budget', '6');
  await expect
    .poll(async () => Number(await app.getAttribute('data-lighting-fixtures')))
    .toBeGreaterThan(0);
  await expect
    .poll(async () => Number(await app.getAttribute('data-light-pool-active')))
    .toBeGreaterThan(0);
  expect(Number(await app.getAttribute('data-light-pool-active'))).toBeLessThanOrEqual(6);

  await page.locator('summary').filter({ hasText: 'Ajustes' }).click();
  const quality = page.getByLabel('Calidad visual').first();
  await quality.selectOption('low');
  await expect(app).toHaveAttribute('data-light-pool-budget', '4');
  await quality.selectOption('high');
  await expect(app).toHaveAttribute('data-light-pool-budget', '8');

  const reduced = page.getByLabel('Reducir parpadeos y destellos').first();
  await reduced.check();
  await expect(app).toHaveAttribute('data-lighting-reduced-flashing', 'true');
});

test('imagen, proxies y buzzing comparten el override determinista de una sala', async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      runtimeErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  await page.goto('/?debug=1&seed=phase-6-lighting-audio&quality=default');
  const app = page.locator('#app');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(app).toHaveAttribute('data-game-state', 'playing');
  await expect(app).toHaveAttribute('data-audio-state', 'running');
  await expect(app).toHaveAttribute('data-lighting-audio-voice-budget', '3');
  await expect
    .poll(async () => Number(await app.getAttribute('data-lighting-audio-voices')))
    .toBeGreaterThan(0);

  const initialLighting = Number(await app.getAttribute('data-lighting-audio-intensity'));
  const initialAudio = Number(await app.getAttribute('data-lighting-audio-modulation'));
  expect(initialAudio).toBeCloseTo(initialLighting, 3);
  expect(initialAudio).toBeGreaterThan(0.7);
  expect(await app.getAttribute('data-room-audio-profile-id')).toBeTruthy();

  await app.evaluate((element) => {
    element.dispatchEvent(
      new CustomEvent('backrooms:debug-lighting-override', { detail: { profile: 'off' } }),
    );
  });
  await expect(app).toHaveAttribute('data-debug-lighting-override', 'off');
  await expect(app).toHaveAttribute('data-active-room-light-proxies', '0');
  await expect(app).toHaveAttribute('data-lighting-audio-intensity', '0.0000');
  await expect(app).toHaveAttribute('data-lighting-audio-modulation', '0.0000');

  await app.evaluate((element) => {
    element.dispatchEvent(
      new CustomEvent('backrooms:debug-lighting-override', { detail: { profile: null } }),
    );
  });
  await expect(app).toHaveAttribute('data-debug-lighting-override', 'none');
  await expect
    .poll(async () => Number(await app.getAttribute('data-light-pool-active')))
    .toBeGreaterThan(0);
  await expect
    .poll(async () => Number(await app.getAttribute('data-lighting-audio-modulation')))
    .toBeGreaterThan(0.7);
  expect(runtimeErrors).toEqual([]);
});
