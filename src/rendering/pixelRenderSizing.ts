import type { InternalRenderHeight, QualityPresetName } from '../config/rendering.config';

export interface CssViewportSize {
  readonly width: number;
  readonly height: number;
}

export interface PixelBufferMetrics {
  readonly preset: QualityPresetName;
  readonly internalHeight: InternalRenderHeight;
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly bufferWidth: number;
  readonly bufferHeight: InternalRenderHeight;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly aspectRatio: number;
}

export function isRenderableViewport(size: CssViewportSize): boolean {
  return (
    Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0
  );
}

export function calculatePixelBufferMetrics(
  viewport: CssViewportSize,
  internalHeight: InternalRenderHeight,
  preset: QualityPresetName,
): PixelBufferMetrics | null {
  if (!isRenderableViewport(viewport)) {
    return null;
  }

  const cssWidth = Math.max(1, Math.round(viewport.width));
  const cssHeight = Math.max(1, Math.round(viewport.height));
  const aspectRatio = cssWidth / cssHeight;
  const bufferWidth = Math.max(1, Math.round(internalHeight * aspectRatio));

  return Object.freeze({
    preset,
    internalHeight,
    cssWidth,
    cssHeight,
    bufferWidth,
    bufferHeight: internalHeight,
    scaleX: cssWidth / bufferWidth,
    scaleY: cssHeight / internalHeight,
    aspectRatio,
  });
}
