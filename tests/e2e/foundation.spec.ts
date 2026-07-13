import { expect, test } from '@playwright/test';

test('la build de fundación inicializa Babylon y muestra un canvas dimensionado', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  await page.goto('/');

  await expect(page).toHaveTitle('LEVEL 0 — THRESHOLD');
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(page.locator('.foundation-note')).toHaveText('Fundación del motor lista.');
  await expect
    .poll(() =>
      page.locator('#game-canvas').evaluate((canvas: HTMLCanvasElement) => ({
        width: canvas.width,
        height: canvas.height,
      })),
    )
    .toMatchObject({ width: expect.any(Number), height: expect.any(Number) });

  const dimensions = await page.locator('#game-canvas').evaluate((canvas: HTMLCanvasElement) => ({
    width: canvas.width,
    height: canvas.height,
  }));
  expect(dimensions.width).toBeGreaterThan(0);
  expect(dimensions.height).toBeGreaterThan(0);
  expect(consoleErrors).toEqual([]);
});
