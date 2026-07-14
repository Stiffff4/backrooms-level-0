import { expect, test } from '@playwright/test';

test('la curva permanece estable, escala por fases y sincroniza anomalías ambientales', async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  await page.goto('/?debug=1&seed=phase-7-tension-curve&quality=default');
  const app = page.locator('#app');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(app).toHaveAttribute('data-game-state', 'playing');
  await expect(app).toHaveAttribute('data-audio-state', 'running');
  await expect(app).toHaveAttribute('data-tension-phase', 'orientation');
  await expect(app).toHaveAttribute('data-tension-active-event', 'none');
  await expect(app).toHaveAttribute('data-tension-event-count', '0');
  expect(Number(await app.getAttribute('data-tension-intensity'))).toBeLessThan(0.14);
  await page.waitForTimeout(150);
  await page.screenshot({ path: 'test-results/phase7-before-anomalies.png' });
  await expect(app).toHaveAttribute('data-room-definition-count', '22');
  expect(Number(await app.getAttribute('data-advanced-room-count'))).toBeGreaterThan(0);

  const setTime = async (elapsedSeconds: number): Promise<void> => {
    await app.evaluate((element, seconds) => {
      element.dispatchEvent(
        new CustomEvent('backrooms:debug-tension-event', {
          detail: { type: null, elapsedSeconds: seconds },
        }),
      );
    }, elapsedSeconds);
  };

  const intensities: number[] = [];
  for (const [seconds, phase] of [
    [120, 'monotony'],
    [360, 'disorientation'],
    [600, 'escalation'],
    [960, 'resolution'],
  ] as const) {
    await setTime(seconds);
    await expect(app).toHaveAttribute('data-tension-phase', phase);
    intensities.push(Number(await app.getAttribute('data-tension-intensity')));
  }
  expect(intensities).toEqual([...intensities].sort((left, right) => left - right));

  await app.evaluate((element) => {
    element.dispatchEvent(
      new CustomEvent('backrooms:debug-tension-event', {
        detail: { type: 'silence', elapsedSeconds: 961 },
      }),
    );
  });
  await expect(app).toHaveAttribute('data-tension-active-event', 'silence');
  expect(Number(await app.getAttribute('data-ambient-silence-factor'))).toBeGreaterThanOrEqual(
    0.94,
  );

  await app.evaluate((element) => {
    element.dispatchEvent(
      new CustomEvent('backrooms:debug-tension-event', {
        detail: { type: 'palette-shift', elapsedSeconds: 970 },
      }),
    );
  });
  await expect(app).toHaveAttribute('data-tension-active-event', 'palette-shift');
  await expect
    .poll(async () => Number(await app.getAttribute('data-render-anomaly-strength')))
    .toBeGreaterThan(0);

  await app.evaluate((element) => {
    element.dispatchEvent(
      new CustomEvent('backrooms:debug-tension-event', {
        detail: { type: 'blackout', elapsedSeconds: 980 },
      }),
    );
  });
  await expect(app).toHaveAttribute('data-tension-active-event', 'blackout');
  await expect(app).toHaveAttribute('data-tension-blackout-count', '1');
  await expect(app).toHaveAttribute('data-active-room-light-proxies', '1');
  await expect(app).toHaveAttribute('data-lighting-audio-intensity', '0.0000');
  expect(Number(await app.getAttribute('data-ambient-silence-factor'))).toBeGreaterThan(0.98);
  await page.waitForTimeout(150);
  await page.screenshot({ path: 'test-results/phase7-controlled-blackout.png' });

  await setTime(990);
  await expect(app).toHaveAttribute('data-tension-active-event', 'none');
  await expect(app).toHaveAttribute('data-active-room-light-proxies', '6');
  await expect
    .poll(async () => Number(await app.getAttribute('data-ambient-silence-factor')))
    .toBeLessThan(0.1);
  expect(runtimeErrors).toEqual([]);
});

test('el recorrido largo materializa galerías de arcos y salas de pilares avanzadas', async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  await page.goto('/?debug=1&seed=phase-7-advanced-content&quality=default&noAudio=1');
  const app = page.locator('#app');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await app.evaluate((element) => {
    element.dispatchEvent(
      new CustomEvent('backrooms:debug-advance-streaming', { detail: { steps: 180 } }),
    );
  });
  await expect
    .poll(async () => Number(await app.getAttribute('data-streaming-route-index')))
    .toBeGreaterThanOrEqual(180);
  await expect(app).toHaveAttribute('data-debug-streaming-pending', 'false');
  const visitedDefinitions = (await app.getAttribute('data-visited-room-definitions')) ?? '';
  expect(visitedDefinitions).toMatch(/arch_gallery_(short|long)/);
  expect(visitedDefinitions).toMatch(/pillar_grid_(small|large)/);
  expect(visitedDefinitions).toContain('low_ceiling_section');
  expect(Number(await app.getAttribute('data-visible-unload-violations'))).toBe(0);
  expect(runtimeErrors).toEqual([]);
});

test('layout shift solo altera geometría cargada fuera de vista y conserva conectividad', async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  await page.goto('/?debug=1&seed=phase-7-layout-shift&quality=low&noAudio=1');
  const app = page.locator('#app');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(app).toHaveAttribute('data-game-state', 'playing');

  await app.evaluate((element) => {
    element.dispatchEvent(
      new CustomEvent('backrooms:debug-advance-streaming', { detail: { steps: 1 } }),
    );
  });
  await expect(app).toHaveAttribute('data-debug-streaming-pending', 'false');
  const currentRoomId = await app.getAttribute('data-current-room-id');

  await app.evaluate((element) => {
    element.dispatchEvent(
      new CustomEvent('backrooms:debug-tension-event', {
        detail: { type: 'layout-shift', elapsedSeconds: 620 },
      }),
    );
  });
  await expect(app).toHaveAttribute('data-debug-tension-event', 'layout-shift');
  await expect(app).toHaveAttribute('data-tension-layout-shifts', '1');
  await expect(app).toHaveAttribute('data-world-spatial-anomalies', '1');
  const targetRoomId = await app.getAttribute('data-tension-last-event-target');
  expect(targetRoomId).toBeTruthy();
  expect(targetRoomId).not.toBe(currentRoomId);
  expect(await app.getAttribute('data-world-spatial-anomaly-rooms')).toBe(targetRoomId);
  await expect(app).toHaveAttribute('data-visible-unload-violations', '0');
  await expect(app).toHaveAttribute('data-layout-valid', 'true');
  expect(runtimeErrors).toEqual([]);
});
