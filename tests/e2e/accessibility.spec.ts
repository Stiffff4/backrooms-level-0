import { expect, test } from '@playwright/test';

async function findBasicAccessibilityIssues(
  page: import('@playwright/test').Page,
): Promise<string[]> {
  return page.locator('body').evaluate((body) => {
    const issues: string[] = [];
    const ids = [...body.querySelectorAll<HTMLElement>('[id]')].map((element) => element.id);
    for (const id of new Set(ids)) {
      if (ids.filter((candidate) => candidate === id).length > 1) issues.push(`duplicate-id:${id}`);
    }
    for (const element of body.querySelectorAll<HTMLElement>('button, a[href], input, select')) {
      if (element.closest('[hidden]')) continue;
      if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
        if (element.labels?.length === 0 && !element.getAttribute('aria-label')) {
          issues.push(`unlabelled-control:${element.id || element.tagName}`);
        }
        continue;
      }
      const name = element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '';
      if (!name) issues.push(`unnamed-action:${element.tagName}`);
    }
    return issues;
  });
}

test('preferencias del sistema, nombres accesibles y foco modal funcionan con teclado', async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?debug=1&noAudio=1&seed=phase-9-accessibility');
  const app = page.locator('#app');

  await page.getByText('Ajustes', { exact: true }).click();
  await expect(page.locator('#title-reduced-flashing')).toBeChecked();
  await expect(app).toHaveAttribute('data-lighting-reduced-flashing', 'true');

  const creditsTrigger = page.getByRole('button', { name: 'Créditos' });
  await creditsTrigger.click();
  const credits = page.getByRole('dialog', { name: 'Créditos' });
  await expect(credits).toHaveAttribute('aria-modal', 'true');
  await expect(credits).toHaveAttribute('aria-hidden', 'false');
  await expect(page.getByRole('button', { name: 'Cerrar' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: /fuente y atribución/i })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Cerrar' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(credits).toBeHidden();
  await expect(creditsTrigger).toBeFocused();

  expect(await findBasicAccessibilityIssues(page)).toEqual([]);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(app).toHaveAttribute('data-game-state', 'playing');
  await page.evaluate(() => document.exitPointerLock());
  const pause = page.getByRole('dialog', { name: 'Pausa' });
  await expect(pause).toBeVisible();
  await expect(pause).toHaveAttribute('aria-modal', 'true');
  await expect(page.getByRole('button', { name: 'Reanudar' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(await pause.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  expect(await findBasicAccessibilityIssues(page)).toEqual([]);
  expect(runtimeErrors).toEqual([]);
});

test('la pantalla final expone estadísticas y acciones en un diálogo navegable', async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  await page.goto('/?debug=1&exitNow=1&noAudio=1&seed=phase-9-accessible-end');
  const app = page.locator('#app');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(app).toHaveAttribute('data-game-state', 'playing');
  await app.evaluate((element) =>
    element.dispatchEvent(new CustomEvent('backrooms:debug-approach-exit')),
  );
  await expect(app).toHaveAttribute('data-debug-exit-approach', 'ready');
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })));
  await expect(app).toHaveAttribute('data-game-state', 'ended');
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })));

  const end = page.getByRole('dialog', { name: 'THRESHOLD' });
  await expect(end).toHaveAttribute('aria-modal', 'true');
  await expect(end).toHaveAttribute('aria-hidden', 'false');
  await expect(page.getByRole('button', { name: 'Nueva partida' })).toBeFocused();
  await expect(page.locator('.end-screen__elapsed')).not.toBeEmpty();
  await expect(page.locator('.end-screen__rooms')).not.toBeEmpty();
  await expect(page.locator('.end-screen__seed')).toHaveText('phase-9-accessible-end');
  expect(await findBasicAccessibilityIssues(page)).toEqual([]);
  expect(runtimeErrors).toEqual([]);
});
