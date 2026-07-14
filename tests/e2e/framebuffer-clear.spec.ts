import { expect, test, type Locator, type Page } from '@playwright/test';

interface PersistenceMetrics {
  readonly changedPixelRatio: number;
  readonly eligiblePixelRatio: number;
  readonly initialLuminanceStdDev: number;
  readonly initialLuminanceRange: number;
  readonly persistenceProjection: number;
  readonly normalizedResidual: number;
  readonly ghostPixelRatio: number;
}

const CASES = [
  { name: 'low', internalHeight: 240, reducedFlashing: false },
  { name: 'default', internalHeight: 360, reducedFlashing: false },
  { name: 'high', internalHeight: 480, reducedFlashing: false },
  { name: 'default-reduced', internalHeight: 360, reducedFlashing: true },
] as const;

async function waitForFrames(page: Page, count: number): Promise<void> {
  await page.evaluate(async (frameCount) => {
    for (let index = 0; index < frameCount; index += 1) {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    }
  }, count);
}

async function measurePersistence(
  page: Page,
  initial: Buffer,
  rotated: Buffer,
  cleanReference: Buffer,
): Promise<PersistenceMetrics> {
  return page.evaluate(
    async (encoded) => {
      const decode = async (base64: string): Promise<ImageData> => {
        const image = new Image();
        image.src = `data:image/png;base64,${base64}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
          throw new Error('Canvas2D unavailable while decoding framebuffer regression images.');
        }
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, canvas.width, canvas.height);
      };

      const [first, finalFrame, reference] = await Promise.all([
        decode(encoded.initial),
        decode(encoded.rotated),
        decode(encoded.cleanReference),
      ]);
      if (
        first.width !== reference.width ||
        first.height !== reference.height ||
        finalFrame.width !== reference.width ||
        finalFrame.height !== reference.height
      ) {
        throw new Error('Framebuffer regression images must have identical dimensions.');
      }

      const minimumInitialDeltaSquared = 75 * 75;
      let changedPixels = 0;
      let eligiblePixels = 0;
      let ghostPixels = 0;
      let projectionNumerator = 0;
      let initialEnergy = 0;
      let residualEnergy = 0;
      let luminanceSum = 0;
      let luminanceSquaredSum = 0;
      const luminanceHistogram = new Uint32Array(256);
      const pixelCount = reference.width * reference.height;

      for (let offset = 0; offset < reference.data.length; offset += 4) {
        const luminance =
          0.2126 * (first.data[offset] ?? 0) +
          0.7152 * (first.data[offset + 1] ?? 0) +
          0.0722 * (first.data[offset + 2] ?? 0);
        luminanceSum += luminance;
        luminanceSquaredSum += luminance * luminance;
        const luminanceBin = Math.round(luminance);
        luminanceHistogram[luminanceBin] = (luminanceHistogram[luminanceBin] ?? 0) + 1;
        let initialDeltaSquared = 0;
        let residualSquared = 0;
        let localProjectionNumerator = 0;
        for (let channel = 0; channel < 3; channel += 1) {
          const initialDelta =
            (first.data[offset + channel] ?? 0) - (reference.data[offset + channel] ?? 0);
          const residual =
            (finalFrame.data[offset + channel] ?? 0) - (reference.data[offset + channel] ?? 0);
          initialDeltaSquared += initialDelta * initialDelta;
          residualSquared += residual * residual;
          localProjectionNumerator += residual * initialDelta;
        }
        if (initialDeltaSquared <= minimumInitialDeltaSquared) {
          continue;
        }

        changedPixels += 1;
        eligiblePixels += 1;
        projectionNumerator += localProjectionNumerator;
        initialEnergy += initialDeltaSquared;
        residualEnergy += residualSquared;
        const localProjection = localProjectionNumerator / initialDeltaSquared;
        const residualRms = Math.sqrt(residualSquared / 3);
        if (localProjection > 0.1 && residualRms > 8) {
          ghostPixels += 1;
        }
      }

      if (initialEnergy <= 0 || eligiblePixels === 0) {
        throw new Error(
          'Camera rotation did not expose enough changed pixels for regression analysis.',
        );
      }

      const meanLuminance = luminanceSum / pixelCount;
      const initialLuminanceStdDev = Math.sqrt(
        Math.max(0, luminanceSquaredSum / pixelCount - meanLuminance * meanLuminance),
      );
      const percentile = (ratio: number): number => {
        const target = Math.ceil(pixelCount * ratio);
        let accumulated = 0;
        for (let value = 0; value < luminanceHistogram.length; value += 1) {
          accumulated += luminanceHistogram[value] ?? 0;
          if (accumulated >= target) {
            return value;
          }
        }
        return 255;
      };

      return {
        changedPixelRatio: changedPixels / pixelCount,
        eligiblePixelRatio: eligiblePixels / pixelCount,
        initialLuminanceStdDev,
        initialLuminanceRange: percentile(0.99) - percentile(0.01),
        persistenceProjection: Math.max(0, projectionNumerator / initialEnergy),
        normalizedResidual: Math.sqrt(residualEnergy / initialEnergy),
        ghostPixelRatio: ghostPixels / eligiblePixels,
      };
    },
    {
      initial: initial.toString('base64'),
      rotated: rotated.toString('base64'),
      cleanReference: cleanReference.toString('base64'),
    },
  );
}

async function rotateCameraWithPointer(page: Page, app: Locator): Promise<number> {
  const initialYaw = Number(await app.getAttribute('data-camera-yaw'));
  for (const x of [640, 800, 960, 1120]) {
    await page.mouse.move(x, 360);
    await waitForFrames(page, 1);
  }
  const finalYaw = Number(await app.getAttribute('data-camera-yaw'));
  return Math.abs(finalYaw - initialYaw);
}

for (const scenario of CASES) {
  test(`limpia color, depth y stencil tras rotar en ${scenario.name}`, async ({
    page,
  }, testInfo) => {
    const runtimeErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        runtimeErrors.push(message.text());
      }
    });
    page.on('pageerror', (error) => runtimeErrors.push(error.message));

    const quality = scenario.name === 'default-reduced' ? 'default' : scenario.name;
    await page.goto(`/?debug=1&noAudio=1&seed=framebuffer-clear-regression&quality=${quality}`);
    const app = page.locator('#app');
    const canvas = page.locator('#game-canvas');
    await expect(app).toHaveAttribute('data-textures-ready', 'true');
    await expect(canvas).toHaveAttribute(
      'data-pixel-buffer-height',
      String(scenario.internalHeight),
    );

    if (scenario.reducedFlashing) {
      await page.locator('summary').filter({ hasText: 'Ajustes' }).click();
      await page.getByLabel('Reducir parpadeos y destellos').first().check();
      await expect(app).toHaveAttribute('data-lighting-reduced-flashing', 'true');
    }

    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(app).toHaveAttribute('data-game-state', 'playing');
    await expect
      .poll(() => page.evaluate(() => document.pointerLockElement?.id))
      .toBe('game-canvas');
    await waitForFrames(page, 8);
    const initial = await canvas.screenshot();

    const yawDelta = await rotateCameraWithPointer(page, app);
    expect(yawDelta).toBeGreaterThan(1);
    await page.keyboard.press('Escape');
    if ((await app.getAttribute('data-game-state')) === 'playing') {
      await page.evaluate(() => document.exitPointerLock());
    }
    await expect(app).toHaveAttribute('data-game-state', 'paused');
    await page.locator('.pause-menu').evaluate((element) => element.setAttribute('hidden', ''));
    await waitForFrames(page, 8);
    const rotated = await canvas.screenshot();

    await app.evaluate((element) =>
      element.dispatchEvent(new CustomEvent('backrooms:debug-force-frame-clear')),
    );
    await expect(app).toHaveAttribute('data-debug-frame-clear', '1');
    await waitForFrames(page, 2);
    const cleanReference = await canvas.screenshot();
    const metrics = await measurePersistence(page, initial, rotated, cleanReference);
    await testInfo.attach('framebuffer-persistence-metrics', {
      body: JSON.stringify(metrics, null, 2),
      contentType: 'application/json',
    });

    expect(metrics.changedPixelRatio).toBeGreaterThan(0.15);
    expect(metrics.eligiblePixelRatio).toBeGreaterThan(0.15);
    // A flat clear/fog buffer can still change after rotation and would make the
    // temporal comparison vacuously pass. The fixed seed must contain the room's
    // expected dark ceiling, lit wallpaper and floor contrast before we compare.
    expect(metrics.initialLuminanceStdDev).toBeGreaterThan(30);
    expect(metrics.initialLuminanceRange).toBeGreaterThan(100);
    expect(metrics.persistenceProjection).toBeLessThan(0.015);
    // 240p uses a non-integer 5.333x CSS scale at 1280x720; allow its tiny
    // capture-resampling residual while keeping ample distance from real trails.
    expect(metrics.normalizedResidual).toBeLessThan(0.04);
    expect(metrics.ghostPixelRatio).toBeLessThan(0.005);
    expect(runtimeErrors).toEqual([]);
  });
}
