import type { Camera } from '@babylonjs/core/Cameras/camera';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import {
  renderingConfig,
  renderQualityPresets,
  type RenderQualityPreset,
} from '../config/rendering.config';
import { BabylonPixelRenderAdapter } from './BabylonPixelRenderAdapter';
import { browserPixelRenderRuntime } from './browserPixelRenderRuntime';
import {
  calculatePixelBufferMetrics,
  type CssViewportSize,
  type PixelBufferMetrics,
} from './pixelRenderSizing';
import type {
  PixelCanvasTarget,
  EffectivePixelEffects,
  PixelRenderPipelineOptions,
  PixelRenderRuntime,
  PixelUserEffects,
} from './pixelRendering.types';

const CSS_METRICS = Object.freeze([
  '--pixel-buffer-width',
  '--pixel-buffer-height',
  '--pixel-scale-x',
  '--pixel-scale-y',
  '--pixel-internal-height',
] as const);

export interface BabylonPixelRenderPipelineOptions {
  readonly canvas: HTMLCanvasElement;
  readonly engine: AbstractEngine;
  readonly quality?: RenderQualityPreset;
}

export class PixelRenderPipeline {
  private readonly canvas: PixelCanvasTarget;
  private readonly adapter: PixelRenderPipelineOptions['adapter'];
  private readonly runtime: PixelRenderRuntime;
  private qualityValue: RenderQualityPreset;
  private attachedCamera: Camera | null = null;
  private stopObserving: (() => void) | null = null;
  private queuedFrame: number | null = null;
  private pendingViewport: CssViewportSize | null = null;
  private metricsSnapshot: PixelBufferMetrics | null = null;
  private userEffects: PixelUserEffects = Object.freeze({
    dithering: true,
    reducedFlashing: false,
  });
  private effectiveEffectsSnapshot: EffectivePixelEffects;
  private disposed = false;

  public constructor(options: PixelRenderPipelineOptions) {
    this.canvas = options.canvas;
    this.adapter = options.adapter;
    this.runtime = options.runtime ?? browserPixelRenderRuntime;
    this.qualityValue = options.quality ?? renderQualityPresets.default;
    this.effectiveEffectsSnapshot = this.syncPostProcessSettings();
  }

  public static create(options: BabylonPixelRenderPipelineOptions): PixelRenderPipeline {
    return new PixelRenderPipeline({
      canvas: options.canvas,
      adapter: new BabylonPixelRenderAdapter(options.engine),
      quality: options.quality ?? renderQualityPresets.default,
    });
  }

  public get quality(): RenderQualityPreset {
    return this.qualityValue;
  }

  public get metrics(): PixelBufferMetrics | null {
    return this.metricsSnapshot;
  }

  public get effects(): EffectivePixelEffects {
    return this.effectiveEffectsSnapshot;
  }

  public get isAttached(): boolean {
    return this.attachedCamera !== null;
  }

  public attach(camera: Camera): void {
    this.assertActive();
    if (this.attachedCamera !== camera) {
      if (this.attachedCamera !== null) {
        this.adapter.detach(this.attachedCamera);
      }
      this.adapter.attach(camera);
      this.attachedCamera = camera;
    }

    if (this.stopObserving === null) {
      this.stopObserving = this.runtime.observe(this.canvas, (size) => this.queueResize(size));
    }
    this.applyViewport(this.runtime.measure(this.canvas));
  }

  public detach(): void {
    if (this.disposed) {
      return;
    }
    this.stopResizeObservation();
    if (this.attachedCamera !== null) {
      this.adapter.detach(this.attachedCamera);
      this.attachedCamera = null;
    }
  }

  public setQuality(quality: RenderQualityPreset): void {
    this.assertActive();
    this.qualityValue = quality;
    this.effectiveEffectsSnapshot = this.syncPostProcessSettings();
    if (this.attachedCamera !== null) {
      this.queueResize(this.runtime.measure(this.canvas));
    }
  }

  public setUserEffects(effects: PixelUserEffects): EffectivePixelEffects {
    this.assertActive();
    this.userEffects = Object.freeze({ ...effects });
    this.effectiveEffectsSnapshot = this.syncPostProcessSettings();
    return this.effectiveEffectsSnapshot;
  }

  /** Requests one coalesced size refresh on the next animation frame. */
  public refresh(): void {
    this.assertActive();
    if (this.attachedCamera !== null) {
      this.queueResize(this.runtime.measure(this.canvas));
    }
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.detach();
    this.adapter.dispose();
    this.clearCssMetrics();
    this.metricsSnapshot = null;
    this.disposed = true;
  }

  private queueResize(viewport: CssViewportSize): void {
    this.pendingViewport = viewport;
    if (this.queuedFrame !== null) {
      return;
    }
    this.queuedFrame = this.runtime.requestFrame(() => {
      this.queuedFrame = null;
      const pending = this.pendingViewport;
      this.pendingViewport = null;
      if (pending !== null && !this.disposed && this.attachedCamera !== null) {
        this.applyViewport(pending);
      }
    });
  }

  private applyViewport(viewport: CssViewportSize): void {
    const next = calculatePixelBufferMetrics(
      viewport,
      this.qualityValue.internalHeight,
      this.qualityValue.name,
    );
    if (next === null) {
      return;
    }

    const previous = this.metricsSnapshot;
    if (
      previous === null ||
      previous.bufferWidth !== next.bufferWidth ||
      previous.bufferHeight !== next.bufferHeight
    ) {
      this.adapter.setBufferSize(next);
    }
    this.metricsSnapshot = next;
    this.applyCssMetrics(next);
  }

  private syncPostProcessSettings(): EffectivePixelEffects {
    const effective = Object.freeze({
      dithering: this.qualityValue.dithering && this.userEffects.dithering,
      reducedFlashing: this.userEffects.reducedFlashing,
      ditherStrength: renderingConfig.ditherStrength,
      grainStrength: this.userEffects.reducedFlashing ? 0 : this.qualityValue.grainStrength,
    });
    this.adapter.setPostProcessSettings({
      dithering: effective.dithering,
      ditherStrength: effective.ditherStrength,
      grainStrength: effective.grainStrength,
    });
    return effective;
  }

  private stopResizeObservation(): void {
    this.stopObserving?.();
    this.stopObserving = null;
    if (this.queuedFrame !== null) {
      this.runtime.cancelFrame(this.queuedFrame);
      this.queuedFrame = null;
    }
    this.pendingViewport = null;
  }

  private applyCssMetrics(metrics: PixelBufferMetrics): void {
    this.canvas.style.setProperty('--pixel-buffer-width', `${String(metrics.bufferWidth)}px`);
    this.canvas.style.setProperty('--pixel-buffer-height', `${String(metrics.bufferHeight)}px`);
    this.canvas.style.setProperty('--pixel-scale-x', metrics.scaleX.toFixed(4));
    this.canvas.style.setProperty('--pixel-scale-y', metrics.scaleY.toFixed(4));
    this.canvas.style.setProperty('--pixel-internal-height', `${String(metrics.internalHeight)}px`);
    this.canvas.dataset.pixelBufferWidth = String(metrics.bufferWidth);
    this.canvas.dataset.pixelBufferHeight = String(metrics.bufferHeight);
    this.canvas.dataset.pixelScaleX = metrics.scaleX.toFixed(4);
    this.canvas.dataset.pixelScaleY = metrics.scaleY.toFixed(4);
    this.canvas.dataset.pixelPreset = metrics.preset;
  }

  private clearCssMetrics(): void {
    for (const property of CSS_METRICS) {
      this.canvas.style.removeProperty(property);
    }
    delete this.canvas.dataset.pixelBufferWidth;
    delete this.canvas.dataset.pixelBufferHeight;
    delete this.canvas.dataset.pixelScaleX;
    delete this.canvas.dataset.pixelScaleY;
    delete this.canvas.dataset.pixelPreset;
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error('PixelRenderPipeline has been disposed.');
    }
  }
}
