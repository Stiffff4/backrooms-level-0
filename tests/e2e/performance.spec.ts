import { expect, test } from '@playwright/test';

interface ResourceSample {
  segment: number;
  cumulativeTraversedRooms: number;
  visitedRooms: number;
  routeIndex: number;
  materializedRooms: number;
  peakMaterializedRooms: number;
  activeRooms: number;
  pooledRooms: number;
  activeWorldMeshes: number;
  meshes: number;
  materials: number;
  transformNodes: number;
  triangles: number;
  visibleUnloadViolations: number;
  rebases: number;
  fps: number;
  drawCalls: number;
  usedHeapBytes: number;
}

test('más de 900 entradas y un reinicio mantienen memoria y recursos acotados', async ({
  page,
}, testInfo) => {
  test.slow();
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  await page.goto('/?debug=1&noAudio=1&quality=default&seed=phase-9-thirty-minute-equivalent');
  const app = page.locator('#app');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(app).toHaveAttribute('data-game-state', 'playing');
  await page.waitForTimeout(2_000);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.enable');
  const samples: ResourceSample[] = [];
  let cumulativeTraversedRooms = 0;
  let previousRouteIndex = 0;
  for (let segment = 1; segment <= 6; segment += 1) {
    if (segment === 5) {
      previousRouteIndex = 0;
      await page.evaluate(() => document.exitPointerLock());
      await expect(app).toHaveAttribute('data-game-state', 'paused');
      await page.getByRole('button', { name: 'Reiniciar semilla' }).click();
      await expect(app).toHaveAttribute('data-game-state', 'playing');
    }
    await app.evaluate((element) =>
      element.dispatchEvent(
        new CustomEvent('backrooms:debug-advance-streaming', { detail: { steps: 180 } }),
      ),
    );
    await expect(app).toHaveAttribute('data-debug-streaming-pending', 'false', {
      timeout: 45_000,
    });
    await page.waitForTimeout(250);
    await cdp.send('HeapProfiler.collectGarbage');
    const heap = await cdp.send('Runtime.getHeapUsage');
    const currentRouteIndex = Number(
      (await app.getAttribute('data-streaming-route-index')) ?? previousRouteIndex,
    );
    const sessionTraversal = Math.max(0, currentRouteIndex - previousRouteIndex);
    const cumulativeAtSample = cumulativeTraversedRooms + sessionTraversal;
    samples.push(
      await app.evaluate(
        (element, input) => ({
          segment: input.segment,
          cumulativeTraversedRooms: input.cumulativeTraversedRooms,
          visitedRooms: Number(element.dataset.visitedRooms),
          routeIndex: Number(element.dataset.streamingRouteIndex),
          materializedRooms: Number(element.dataset.streamMaterializedRooms),
          peakMaterializedRooms: Number(element.dataset.streamPeakMaterializedRooms),
          activeRooms: Number(element.dataset.streamActiveRooms),
          pooledRooms: Number(element.dataset.worldPooledRooms),
          activeWorldMeshes: Number(element.dataset.worldMeshes),
          meshes: Number(element.dataset.sceneMeshes),
          materials: Number(element.dataset.sceneMaterials),
          transformNodes: Number(element.dataset.sceneTransformNodes),
          triangles: Number(element.dataset.worldTriangles),
          visibleUnloadViolations: Number(element.dataset.visibleUnloadViolations),
          rebases: Number(element.dataset.floatingOriginRebases),
          fps: Number(element.dataset.fps),
          drawCalls: Number(
            element.querySelector('.debug-hud')?.textContent?.match(/DRAW CALLS (\d+)/)?.[1] ??
              Number.NaN,
          ),
          usedHeapBytes: input.usedHeapBytes,
        }),
        {
          segment,
          cumulativeTraversedRooms: cumulativeAtSample,
          usedHeapBytes: heap.usedSize,
        },
      ),
    );
    cumulativeTraversedRooms = cumulativeAtSample;
    previousRouteIndex = currentRouteIndex;
  }

  const warm = samples[0];
  const final = samples.at(-1);
  expect(warm).toBeDefined();
  expect(final).toBeDefined();
  if (!warm || !final) throw new Error('Performance soak did not collect its boundary samples.');

  for (const sample of samples) {
    expect(sample.materializedRooms, JSON.stringify(sample)).toBeLessThanOrEqual(60);
    expect(sample.peakMaterializedRooms, JSON.stringify(sample)).toBeLessThanOrEqual(60);
    expect(sample.activeRooms, JSON.stringify(sample)).toBeLessThanOrEqual(60);
    expect(sample.pooledRooms, JSON.stringify(sample)).toBeLessThanOrEqual(8);
    expect(sample.activeWorldMeshes, JSON.stringify(sample)).toBeLessThan(200);
    expect(sample.meshes, JSON.stringify(sample)).toBeLessThan(400);
    expect(sample.materials, JSON.stringify(sample)).toBeLessThan(24);
    expect(sample.transformNodes, JSON.stringify(sample)).toBeLessThan(250);
    expect(sample.triangles, JSON.stringify(sample)).toBeLessThan(250_000);
    expect(sample.drawCalls, JSON.stringify(sample)).toBeLessThan(150);
    expect(sample.visibleUnloadViolations, JSON.stringify(sample)).toBe(0);
  }
  expect(final.cumulativeTraversedRooms).toBeGreaterThanOrEqual(900);
  expect(final.visitedRooms).toBeGreaterThanOrEqual(300);
  expect(final.rebases).toBeGreaterThan(0);
  expect(final.fps).toBeGreaterThan(45);
  expect(final.usedHeapBytes).toBeLessThanOrEqual(warm.usedHeapBytes + 20 * 1024 * 1024);
  expect(runtimeErrors).toEqual([]);

  await testInfo.attach('performance-soak.json', {
    body: Buffer.from(JSON.stringify(samples, null, 2)),
    contentType: 'application/json',
  });
});
