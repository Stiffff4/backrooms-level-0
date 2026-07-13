import type { Camera } from '@babylonjs/core/Cameras/camera';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { describe, expect, it, vi } from 'vitest';
import { renderQualityPresets } from '../../src/config/rendering.config';
import {
  BabylonPixelRenderAdapter,
  PIXEL_GRADE_FRAGMENT_SHADER,
} from '../../src/rendering/BabylonPixelRenderAdapter';
import { PixelRenderPipeline } from '../../src/rendering/PixelRenderPipeline';
import { calculatePixelBufferMetrics } from '../../src/rendering/pixelRenderSizing';
import type {
  PixelCanvasTarget,
  PixelPostProcessSettings,
  PixelRenderAdapter,
  PixelRenderRuntime,
} from '../../src/rendering/pixelRendering.types';

class FakeAdapter implements PixelRenderAdapter {
  public readonly sizes: NonNullable<PixelRenderPipeline['metrics']>[] = [];
  public readonly settings: PixelPostProcessSettings[] = [];
  public readonly attached: Camera[] = [];
  public readonly detached: Camera[] = [];
  public disposeCount = 0;

  public setBufferSize(metrics: NonNullable<PixelRenderPipeline['metrics']>): void {
    this.sizes.push(metrics);
  }

  public setPostProcessSettings(settings: PixelPostProcessSettings): void {
    this.settings.push(settings);
  }

  public attach(camera: Camera): void {
    this.attached.push(camera);
  }

  public detach(camera: Camera): void {
    this.detached.push(camera);
  }

  public dispose(): void {
    this.disposeCount += 1;
  }
}

class FakeRuntime implements PixelRenderRuntime {
  public viewport = { width: 1920, height: 1080 };
  public observeCount = 0;
  public disconnectCount = 0;
  public cancelCount = 0;
  private resizeCallback: ((size: { width: number; height: number }) => void) | null = null;
  private readonly frames = new Map<number, FrameRequestCallback>();
  private nextFrame = 1;

  public measure(): { width: number; height: number } {
    return { ...this.viewport };
  }

  public observe(
    _target: PixelCanvasTarget,
    onResize: (size: { width: number; height: number }) => void,
  ): () => void {
    this.observeCount += 1;
    this.resizeCallback = onResize;
    return (): void => {
      this.disconnectCount += 1;
      this.resizeCallback = null;
    };
  }

  public requestFrame(callback: FrameRequestCallback): number {
    const handle = this.nextFrame;
    this.nextFrame += 1;
    this.frames.set(handle, callback);
    return handle;
  }

  public cancelFrame(handle: number): void {
    this.cancelCount += 1;
    this.frames.delete(handle);
  }

  public emitResize(width: number, height: number): void {
    this.viewport = { width, height };
    this.resizeCallback?.({ width, height });
  }

  public flushFrame(): void {
    const scheduled = [...this.frames.entries()];
    this.frames.clear();
    for (const [, callback] of scheduled) {
      callback(0);
    }
  }

  public get pendingFrameCount(): number {
    return this.frames.size;
  }
}

function createCanvas(): {
  canvas: PixelCanvasTarget;
  css: Map<string, string>;
  dataset: Record<string, string>;
} {
  const css = new Map<string, string>();
  const dataset: Record<string, string> = {};
  return {
    canvas: {
      getBoundingClientRect: () => ({ width: 1920, height: 1080 }),
      style: {
        setProperty: (property: string, value: string) => css.set(property, value),
        removeProperty: (property: string) => {
          const previous = css.get(property) ?? '';
          css.delete(property);
          return previous;
        },
      },
      dataset: dataset as DOMStringMap,
    },
    css,
    dataset,
  };
}

describe('pixel render sizing', () => {
  it('calcula un buffer real por aspect ratio y rechaza viewports ocultos', () => {
    expect(
      calculatePixelBufferMetrics({ width: 1920, height: 1080 }, 360, 'default'),
    ).toMatchObject({
      cssWidth: 1920,
      cssHeight: 1080,
      bufferWidth: 640,
      bufferHeight: 360,
      scaleX: 3,
      scaleY: 3,
      preset: 'default',
    });
    expect(
      calculatePixelBufferMetrics({ width: 3440, height: 1440 }, 360, 'default'),
    ).toMatchObject({
      bufferWidth: 860,
      bufferHeight: 360,
      scaleX: 4,
      scaleY: 4,
    });
    expect(calculatePixelBufferMetrics({ width: 0, height: 720 }, 360, 'default')).toBeNull();
    expect(
      calculatePixelBufferMetrics({ width: 1280, height: Number.NaN }, 360, 'default'),
    ).toBeNull();
  });
});

describe('PixelRenderPipeline', () => {
  it('combina el preset con dithering y reducedFlashing del usuario', () => {
    const adapter = new FakeAdapter();
    const runtime = new FakeRuntime();
    const { canvas } = createCanvas();
    const pipeline = new PixelRenderPipeline({ canvas, adapter, runtime });

    expect(pipeline.setUserEffects({ dithering: false, reducedFlashing: false })).toEqual({
      dithering: false,
      reducedFlashing: false,
      ditherStrength: 0.35,
      grainStrength: 0.008,
    });
    expect(pipeline.setUserEffects({ dithering: true, reducedFlashing: true })).toEqual({
      dithering: true,
      reducedFlashing: true,
      ditherStrength: 0.35,
      grainStrength: 0,
    });

    pipeline.setQuality(renderQualityPresets.low);
    expect(pipeline.effects).toEqual({
      dithering: false,
      reducedFlashing: true,
      ditherStrength: 0.35,
      grainStrength: 0,
    });
  });

  it('adjunta, dimensiona, coalesce ResizeObserver en rAF y cambia preset sin recrear adapter', () => {
    const adapter = new FakeAdapter();
    const runtime = new FakeRuntime();
    const { canvas, css, dataset } = createCanvas();
    const firstCamera = {} as Camera;
    const secondCamera = {} as Camera;
    const pipeline = new PixelRenderPipeline({ canvas, adapter, runtime });

    expect(adapter.settings).toEqual([
      { dithering: true, ditherStrength: 0.35, grainStrength: 0.008 },
    ]);
    expect(pipeline.effects).toEqual({
      dithering: true,
      reducedFlashing: false,
      ditherStrength: 0.35,
      grainStrength: 0.008,
    });
    pipeline.attach(firstCamera);
    expect(pipeline.isAttached).toBe(true);
    expect(adapter.attached).toEqual([firstCamera]);
    expect(adapter.sizes).toHaveLength(1);
    expect(adapter.sizes[0]).toMatchObject({ bufferWidth: 640, bufferHeight: 360 });
    expect(runtime.observeCount).toBe(1);
    expect(css.get('--pixel-buffer-width')).toBe('640px');
    expect(css.get('--pixel-scale-x')).toBe('3.0000');
    expect(dataset.pixelBufferHeight).toBe('360');
    expect(dataset.pixelPreset).toBe('default');

    runtime.emitResize(800, 600);
    runtime.emitResize(1200, 600);
    expect(runtime.pendingFrameCount).toBe(1);
    runtime.flushFrame();
    expect(adapter.sizes).toHaveLength(2);
    expect(adapter.sizes[1]).toMatchObject({ bufferWidth: 720, bufferHeight: 360 });

    pipeline.setQuality(renderQualityPresets.high);
    expect(runtime.pendingFrameCount).toBe(1);
    runtime.flushFrame();
    expect(adapter.settings.at(-1)).toEqual({
      dithering: true,
      ditherStrength: 0.35,
      grainStrength: 0.006,
    });
    expect(adapter.sizes.at(-1)).toMatchObject({
      preset: 'high',
      bufferWidth: 960,
      bufferHeight: 480,
    });

    expect(pipeline.setUserEffects({ dithering: false, reducedFlashing: true })).toEqual({
      dithering: false,
      reducedFlashing: true,
      ditherStrength: 0.35,
      grainStrength: 0,
    });
    expect(adapter.settings.at(-1)).toEqual({
      dithering: false,
      ditherStrength: 0.35,
      grainStrength: 0,
    });

    pipeline.attach(firstCamera);
    expect(adapter.attached).toHaveLength(1);
    pipeline.attach(secondCamera);
    expect(adapter.detached).toEqual([firstCamera]);
    expect(adapter.attached).toEqual([firstCamera, secondCamera]);

    pipeline.detach();
    expect(runtime.disconnectCount).toBe(1);
    expect(adapter.detached).toEqual([firstCamera, secondCamera]);
    expect(pipeline.isAttached).toBe(false);

    pipeline.dispose();
    pipeline.dispose();
    expect(adapter.disposeCount).toBe(1);
    expect(css.size).toBe(0);
    expect(dataset).toEqual({});
    expect(pipeline.metrics).toBeNull();
    expect(() => pipeline.refresh()).toThrow(/disposed/);
  });

  it('cancela un resize pendiente al desacoplarse e ignora tamaños cero', () => {
    const adapter = new FakeAdapter();
    const runtime = new FakeRuntime();
    const { canvas } = createCanvas();
    const pipeline = new PixelRenderPipeline({ canvas, adapter, runtime });
    pipeline.attach({} as Camera);

    runtime.emitResize(0, 0);
    runtime.flushFrame();
    expect(adapter.sizes).toHaveLength(1);

    runtime.emitResize(1000, 700);
    expect(runtime.pendingFrameCount).toBe(1);
    pipeline.detach();
    expect(runtime.cancelCount).toBe(1);
    expect(runtime.pendingFrameCount).toBe(0);
  });
});

describe('BabylonPixelRenderAdapter', () => {
  it('crea un solo postproceso estable, sin efectos VHS/bloom, y lo libera', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const camera = new FreeCamera('pixel-test-camera', Vector3.Zero(), scene);
    scene.activeCamera = camera;
    const adapter = new BabylonPixelRenderAdapter(engine);

    try {
      expect(engine.postProcesses).toHaveLength(1);
      expect(PIXEL_GRADE_FRAGMENT_SHADER).toContain('bayer4');
      expect(PIXEL_GRADE_FRAGMENT_SHADER).toContain('spatialNoise');
      expect(PIXEL_GRADE_FRAGMENT_SHADER).not.toMatch(/\btime\b/i);
      expect(PIXEL_GRADE_FRAGMENT_SHADER).not.toMatch(/vhs|bloom|scanline/i);

      const attach = vi.spyOn(camera, 'attachPostProcess');
      const detach = vi.spyOn(camera, 'detachPostProcess');
      adapter.attach(camera);
      adapter.attach(camera);
      expect(attach).toHaveBeenCalledTimes(1);
      expect(() => scene.render()).not.toThrow();
      adapter.detach(camera);
      expect(detach).toHaveBeenCalledTimes(1);
    } finally {
      adapter.dispose();
      scene.dispose();
      engine.dispose();
    }
    expect(engine.postProcesses).toHaveLength(0);
  });
});
