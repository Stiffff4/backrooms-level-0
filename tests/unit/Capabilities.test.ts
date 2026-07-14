import { describe, expect, it, vi } from 'vitest';
import {
  assessGameCapabilities,
  detectGameCapabilities,
  probeGameCapabilities,
  type BrowserCapabilityEnvironment,
  type GameCapabilityProbe,
} from '../../src/engine/Capabilities';

const compatibleProbe: Readonly<GameCapabilityProbe> = Object.freeze({
  webGl2: true,
  webGl1: true,
  pointerLock: true,
  webAudio: true,
  persistentStorage: true,
  prefersReducedMotion: false,
});

describe('assessGameCapabilities', () => {
  it('acepta un navegador con todas las capacidades esenciales', () => {
    const report = assessGameCapabilities(compatibleProbe);

    expect(report.status).toBe('compatible');
    expect(report.issues).toEqual([]);
    expect(report.blockingIssues).toEqual([]);
  });

  it('bloquea WebGL2, pointer lock y Web Audio cuando faltan', () => {
    const report = assessGameCapabilities({
      ...compatibleProbe,
      webGl2: false,
      pointerLock: false,
      webAudio: false,
      persistentStorage: false,
    });

    expect(report.status).toBe('incompatible');
    expect(report.blockingIssues.map((issue) => issue.code)).toEqual([
      'webgl2-unavailable',
      'pointer-lock-unavailable',
      'web-audio-unavailable',
    ]);
    expect(report.warnings.map((issue) => issue.code)).toEqual(['persistent-storage-unavailable']);
  });

  it('degrada sin bloquear cuando solo falla la persistencia', () => {
    const report = assessGameCapabilities({
      ...compatibleProbe,
      persistentStorage: false,
    });

    expect(report.status).toBe('degraded');
    expect(report.blockingIssues).toHaveLength(0);
    expect(report.warnings[0]?.code).toBe('persistent-storage-unavailable');
  });

  it('permite ajustar la política para QA silencioso y almacenamiento obligatorio', () => {
    const silentReport = assessGameCapabilities(
      { ...compatibleProbe, webAudio: false },
      { requireWebAudio: false },
    );
    const storageReport = assessGameCapabilities(
      { ...compatibleProbe, persistentStorage: false },
      { requirePersistentStorage: true },
    );

    expect(silentReport.status).toBe('degraded');
    expect(silentReport.warnings[0]?.code).toBe('web-audio-unavailable');
    expect(storageReport.status).toBe('incompatible');
  });

  it('propaga la preferencia del sistema como recomendación de parpadeo reducido', () => {
    const report = assessGameCapabilities({
      ...compatibleProbe,
      prefersReducedMotion: true,
    });

    expect(report.status).toBe('compatible');
    expect(report.recommendedReducedFlashing).toBe(true);
  });
});

describe('probeGameCapabilities', () => {
  it('prueba APIs sin iniciar audio ni solicitar pointer lock', () => {
    const setItem = vi.fn();
    const removeItem = vi.fn();
    const getContext = vi.fn((contextId: string) =>
      contextId === 'webgl2' ? { contextId } : null,
    );
    const requestPointerLock = vi.fn();
    const canvas = { getContext, requestPointerLock } as unknown as HTMLCanvasElement;
    const documentProbe = { pointerLockElement: null } as unknown as Document;
    const environment: BrowserCapabilityEnvironment = {
      document: documentProbe,
      audioContextAvailable: true,
      storage: { setItem, removeItem },
      matchMedia: () => ({ matches: true }),
    };

    const probe = probeGameCapabilities(canvas, environment);

    expect(probe).toEqual({
      webGl2: true,
      webGl1: true,
      pointerLock: true,
      webAudio: true,
      persistentStorage: true,
      prefersReducedMotion: true,
    });
    expect(requestPointerLock).not.toHaveBeenCalled();
    expect(setItem).toHaveBeenCalledOnce();
    expect(removeItem).toHaveBeenCalledOnce();
  });

  it('convierte excepciones de contexto, storage y media query en capacidades ausentes', () => {
    const canvas = {
      getContext: vi.fn(() => {
        throw new Error('GPU denied');
      }),
      requestPointerLock: vi.fn(),
    } as unknown as HTMLCanvasElement;
    const environment: BrowserCapabilityEnvironment = {
      document: { pointerLockElement: null } as unknown as Document,
      audioContextAvailable: false,
      storage: {
        setItem: () => {
          throw new Error('storage denied');
        },
        removeItem: vi.fn(),
      },
      matchMedia: () => {
        throw new Error('media query denied');
      },
    };

    const report = detectGameCapabilities(canvas, {}, environment);

    expect(report.probe.webGl2).toBe(false);
    expect(report.probe.webGl1).toBe(false);
    expect(report.probe.persistentStorage).toBe(false);
    expect(report.probe.prefersReducedMotion).toBe(false);
    expect(report.status).toBe('incompatible');
  });
});
