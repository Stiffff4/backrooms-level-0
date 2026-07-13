import type { Camera } from '@babylonjs/core/Cameras/camera';
import type { RenderQualityPreset } from '../config/rendering.config';
import type { CssViewportSize, PixelBufferMetrics } from './pixelRenderSizing';

export interface PixelCanvasTarget {
  readonly style: Pick<CSSStyleDeclaration, 'removeProperty' | 'setProperty'>;
  readonly dataset: DOMStringMap;
  getBoundingClientRect(): Pick<DOMRect, 'height' | 'width'>;
}

export interface PixelPostProcessSettings {
  readonly dithering: boolean;
  readonly ditherStrength: number;
  readonly grainStrength: number;
}

export interface PixelUserEffects {
  readonly dithering: boolean;
  readonly reducedFlashing: boolean;
}

export interface EffectivePixelEffects extends PixelPostProcessSettings, PixelUserEffects {}

export interface PixelRenderAdapter {
  setBufferSize(metrics: PixelBufferMetrics): void;
  setPostProcessSettings(settings: PixelPostProcessSettings): void;
  attach(camera: Camera): void;
  detach(camera: Camera): void;
  dispose(): void;
}

export interface PixelRenderRuntime {
  measure(target: PixelCanvasTarget): CssViewportSize;
  observe(target: PixelCanvasTarget, onResize: (size: CssViewportSize) => void): () => void;
  requestFrame(callback: FrameRequestCallback): number;
  cancelFrame(handle: number): void;
}

export interface PixelRenderPipelineOptions {
  readonly canvas: PixelCanvasTarget;
  readonly adapter: PixelRenderAdapter;
  readonly quality?: RenderQualityPreset;
  readonly runtime?: PixelRenderRuntime;
}
