import { describe, expect, it, vi } from 'vitest';
import {
  WebGlContextRecovery,
  type WebGlRecoverySnapshot,
} from '../../src/engine/WebGlContextRecovery';

class FakeCanvas extends EventTarget {
  public readonly restoreContext = vi.fn();
  public exposeRestoreExtension = true;
  public contextLost = false;

  public getContext(contextId: string): { getExtension: (name: string) => unknown } | null {
    if (contextId !== 'webgl2') {
      return null;
    }
    return {
      getExtension: (name: string) =>
        name === 'WEBGL_lose_context' && this.exposeRestoreExtension && !this.contextLost
          ? { restoreContext: this.restoreContext }
          : null,
    };
  }
}

function dispatchContextEvent(canvas: FakeCanvas, type: string): Event {
  if (type === 'webglcontextlost') canvas.contextLost = true;
  if (type === 'webglcontextrestored') canvas.contextLost = false;
  const event = new Event(type, { cancelable: true });
  canvas.dispatchEvent(event);
  return event;
}

describe('WebGlContextRecovery', () => {
  it('previene el descarte, pausa y recupera recursos antes de reanudar', async () => {
    const canvas = new FakeCanvas();
    const order: string[] = [];
    const snapshots: WebGlRecoverySnapshot[] = [];
    const recovery = new WebGlContextRecovery(canvas as unknown as HTMLCanvasElement, {
      onPause: () => {
        order.push('pause');
      },
      restoreResources: () => {
        order.push('resources');
      },
      onResume: () => {
        order.push('resume');
      },
      onStateChange: (snapshot) => snapshots.push({ ...snapshot }),
    });
    recovery.start();

    const lostEvent = dispatchContextEvent(canvas, 'webglcontextlost');
    expect(lostEvent.defaultPrevented).toBe(true);
    expect(recovery.snapshot.phase).toBe('lost');
    expect(recovery.snapshot.canRequestRestore).toBe(true);
    expect(order).toEqual(['pause']);

    dispatchContextEvent(canvas, 'webglcontextrestored');
    await recovery.whenSettled();

    expect(order).toEqual(['pause', 'resources', 'resume']);
    expect(recovery.snapshot).toMatchObject({
      phase: 'ready',
      lossCount: 1,
      recoveryCount: 1,
      contextReturned: true,
      lastError: null,
    });
    expect(snapshots.map((snapshot) => snapshot.phase)).toEqual([
      'ready',
      'lost',
      'restoring',
      'ready',
    ]);
  });

  it('mantiene la partida pausada si la reconstrucción falla', async () => {
    const canvas = new FakeCanvas();
    const onResume = vi.fn();
    const recovery = new WebGlContextRecovery(canvas as unknown as HTMLCanvasElement, {
      onPause: vi.fn(),
      restoreResources: () => Promise.reject(new Error('shader rebuild failed')),
      onResume,
    });
    recovery.start();
    dispatchContextEvent(canvas, 'webglcontextlost');
    dispatchContextEvent(canvas, 'webglcontextrestored');
    await recovery.whenSettled();

    expect(recovery.snapshot.phase).toBe('failed');
    expect(recovery.snapshot.lastError).toBe('shader rebuild failed');
    expect(onResume).not.toHaveBeenCalled();
  });

  it('espera la señal del renderer antes de reconstruir recursos propios', async () => {
    const canvas = new FakeCanvas();
    const order: string[] = [];
    let releaseRenderer: (() => void) | undefined;
    const rendererReady = new Promise<void>((resolve) => {
      releaseRenderer = resolve;
    });
    const recovery = new WebGlContextRecovery(canvas as unknown as HTMLCanvasElement, {
      onPause: vi.fn(),
      waitForRenderer: () => {
        order.push('renderer-wait');
        return rendererReady;
      },
      restoreResources: () => {
        order.push('resources');
      },
      onResume: () => {
        order.push('resume');
      },
    });
    recovery.start();
    dispatchContextEvent(canvas, 'webglcontextlost');
    dispatchContextEvent(canvas, 'webglcontextrestored');
    await Promise.resolve();

    expect(order).toEqual(['renderer-wait']);
    releaseRenderer?.();
    await recovery.whenSettled();
    expect(order).toEqual(['renderer-wait', 'resources', 'resume']);
  });

  it('permite reintentar recursos después de un fallo con contexto restaurado', async () => {
    const canvas = new FakeCanvas();
    const restoreResources = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('first failure'))
      .mockResolvedValue(undefined);
    const onResume = vi.fn();
    const recovery = new WebGlContextRecovery(canvas as unknown as HTMLCanvasElement, {
      onPause: vi.fn(),
      restoreResources,
      onResume,
    });
    recovery.start();
    dispatchContextEvent(canvas, 'webglcontextlost');
    dispatchContextEvent(canvas, 'webglcontextrestored');
    await recovery.whenSettled();

    expect(recovery.snapshot.phase).toBe('failed');
    await expect(recovery.retry()).resolves.toBe(true);
    expect(recovery.snapshot.phase).toBe('ready');
    expect(restoreResources).toHaveBeenCalledTimes(2);
    expect(onResume).toHaveBeenCalledOnce();
  });

  it('solicita WEBGL_lose_context y ofrece fallo explícito si no existe', async () => {
    const canvas = new FakeCanvas();
    const recovery = new WebGlContextRecovery(canvas as unknown as HTMLCanvasElement, {
      onPause: vi.fn(),
      restoreResources: vi.fn(),
      onResume: vi.fn(),
    });
    recovery.start();
    dispatchContextEvent(canvas, 'webglcontextlost');

    await expect(recovery.retry()).resolves.toBe(true);
    expect(canvas.restoreContext).toHaveBeenCalledOnce();
    expect(recovery.snapshot.phase).toBe('restoring');

    const unavailableCanvas = new FakeCanvas();
    unavailableCanvas.exposeRestoreExtension = false;
    const unavailable = new WebGlContextRecovery(
      unavailableCanvas as unknown as HTMLCanvasElement,
      {
        onPause: vi.fn(),
        restoreResources: vi.fn(),
        onResume: vi.fn(),
      },
    );
    unavailable.start();
    dispatchContextEvent(unavailableCanvas, 'webglcontextlost');

    await expect(unavailable.retry()).resolves.toBe(false);
    expect(unavailable.snapshot.phase).toBe('failed');
    expect(unavailable.snapshot.lastError).toContain('Recarga');
  });

  it('elimina listeners y vuelve inertes las recuperaciones pendientes al disponer', async () => {
    const canvas = new FakeCanvas();
    const onPause = vi.fn();
    const recovery = new WebGlContextRecovery(canvas as unknown as HTMLCanvasElement, {
      onPause,
      restoreResources: vi.fn(),
      onResume: vi.fn(),
    });
    recovery.start();
    recovery.dispose();

    dispatchContextEvent(canvas, 'webglcontextlost');
    await recovery.whenSettled();

    expect(recovery.snapshot.phase).toBe('disposed');
    expect(recovery.snapshot.lossCount).toBe(0);
    expect(onPause).not.toHaveBeenCalled();
  });
});
