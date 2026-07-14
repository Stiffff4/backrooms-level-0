import { expect, test } from '@playwright/test';

const PRESETS = [
  { name: 'low', width: 427, height: 240, fogEnd: 36, normalMaps: false },
  { name: 'default', width: 640, height: 360, fogEnd: 44, normalMaps: true },
  { name: 'high', width: 853, height: 480, fogEnd: 48, normalMaps: true },
] as const;

test('los presets usan buffers internos reales y mantienen la UI DOM a resolución nativa', async ({
  page,
}) => {
  for (const preset of PRESETS) {
    await page.goto(`/?noAudio=1&seed=phase-5-presets&quality=${preset.name}`);
    const app = page.locator('#app');
    const canvas = page.locator('#game-canvas');

    await expect(app).toHaveAttribute('data-textures-ready', 'true');
    await expect(app).toHaveAttribute('data-quality-preset', preset.name);
    await expect(app).toHaveAttribute('data-fog-end', String(preset.fogEnd));
    await expect(app).toHaveAttribute('data-render-normal-maps', String(preset.normalMaps));
    await expect(canvas).toHaveAttribute('data-pixel-buffer-width', String(preset.width));
    await expect(canvas).toHaveAttribute('data-pixel-buffer-height', String(preset.height));
    await expect(canvas).toHaveAttribute('data-pixel-preset', preset.name);
    await expect(app).toHaveAttribute('data-texture-ready-count', '12');
    await expect(app).toHaveAttribute('data-texture-failed-count', '0');

    const canvasBounds = await canvas.boundingBox();
    const titleBounds = await page.getByRole('heading', { name: 'THRESHOLD' }).boundingBox();
    expect(canvasBounds?.width).toBe(1280);
    expect(canvasBounds?.height).toBe(720);
    expect(titleBounds?.width ?? 0).toBeGreaterThan(100);
  }
});

test('calidad y dithering cambian en vivo sin reiniciar la sesión', async ({ page }) => {
  await page.goto('/?noAudio=1&seed=phase-5-live-quality');
  const app = page.locator('#app');
  const canvas = page.locator('#game-canvas');
  const quality = page.getByLabel('Calidad visual').first();
  const dithering = page.getByLabel('Dithering suave de imagen').first();

  await expect(app).toHaveAttribute('data-textures-ready', 'true');
  await page.locator('summary').filter({ hasText: 'Ajustes' }).click();
  await quality.selectOption('high');
  await expect(app).toHaveAttribute('data-quality-preset', 'high');
  await expect(canvas).toHaveAttribute('data-pixel-buffer-width', '853');
  await expect(canvas).toHaveAttribute('data-pixel-buffer-height', '480');
  await expect(app).toHaveAttribute('data-fog-end', '48');

  await dithering.uncheck();
  await expect(app).toHaveAttribute('data-render-dithering', 'false');
  await dithering.check();
  await expect(app).toHaveAttribute('data-render-dithering', 'true');

  await quality.selectOption('low');
  await expect(canvas).toHaveAttribute('data-pixel-buffer-height', '240');
  await expect(app).toHaveAttribute('data-render-dithering', 'false');
});

test('la imagen inmóvil conserva píxeles estables y una regresión visual versionada', async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      runtimeErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  await page.goto('/?noAudio=1&seed=phase-5-visual-regression&quality=default');
  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-textures-ready', 'true');
  // Keep the game in title state (no movement update) while exposing only the
  // canvas. Gameplay entry/pointer lock is covered by the movement suite.
  await page.locator('.title-screen').evaluate((element) => {
    element.setAttribute('hidden', '');
    element.setAttribute('aria-hidden', 'true');
  });
  await page.waitForTimeout(100);

  const firstFrame = await page.screenshot();
  await page.waitForTimeout(150);
  const secondFrame = await page.screenshot();
  expect(secondFrame.equals(firstFrame)).toBe(true);
  await expect(page).toHaveScreenshot('level-zero-default.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.01,
    threshold: 0.15,
  });
  expect(runtimeErrors).toEqual([]);
});
