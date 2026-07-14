import { expect, test } from '@playwright/test';

test('la build de fundación inicializa Babylon y muestra un canvas dimensionado', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');

  await expect(page).toHaveTitle('LEVEL 0 — THRESHOLD');
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  await expect(page.locator('#app')).toHaveAttribute('data-game-state', 'title');
  await page.screenshot({ path: 'test-results/phase1-title.png', fullPage: true });
  await page.getByRole('button', { name: 'Créditos' }).click();
  await expect(page.getByRole('heading', { name: 'Créditos' })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar' }).click();
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
  expect(pageErrors).toEqual([]);
});
