import type { PixelCanvasTarget, PixelRenderRuntime } from './pixelRendering.types';
import type { CssViewportSize } from './pixelRenderSizing';

function measure(target: PixelCanvasTarget): CssViewportSize {
  const bounds = target.getBoundingClientRect();
  return { width: bounds.width, height: bounds.height };
}

function observe(target: PixelCanvasTarget, onResize: (size: CssViewportSize) => void): () => void {
  if (typeof ResizeObserver === 'function') {
    const element = target as unknown as Element;
    const observer = new ResizeObserver((entries) => {
      const entry = entries.find((candidate) => candidate.target === element);
      if (entry !== undefined) {
        onResize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(element);
    return (): void => observer.disconnect();
  }

  const handleWindowResize = (): void => onResize(measure(target));
  window.addEventListener('resize', handleWindowResize, { passive: true });
  return (): void => window.removeEventListener('resize', handleWindowResize);
}

export const browserPixelRenderRuntime: PixelRenderRuntime = Object.freeze({
  measure,
  observe,
  requestFrame: (callback: FrameRequestCallback): number => window.requestAnimationFrame(callback),
  cancelFrame: (handle: number): void => window.cancelAnimationFrame(handle),
});
