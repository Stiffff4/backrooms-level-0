export type CapabilityStatus = 'compatible' | 'degraded' | 'incompatible';

export type CapabilityIssueSeverity = 'blocking' | 'warning';

export type CapabilityIssueCode =
  | 'webgl2-unavailable'
  | 'pointer-lock-unavailable'
  | 'web-audio-unavailable'
  | 'persistent-storage-unavailable';

export interface CapabilityIssue {
  readonly code: CapabilityIssueCode;
  readonly severity: CapabilityIssueSeverity;
  readonly title: string;
  readonly message: string;
}

export interface GameCapabilityProbe {
  readonly webGl2: boolean;
  readonly webGl1: boolean;
  readonly pointerLock: boolean;
  readonly webAudio: boolean;
  readonly persistentStorage: boolean;
  readonly prefersReducedMotion: boolean;
}

export interface CapabilityPolicy {
  readonly requirePointerLock?: boolean;
  readonly requireWebAudio?: boolean;
  readonly requirePersistentStorage?: boolean;
}

export interface GameCapabilityReport {
  readonly status: CapabilityStatus;
  readonly probe: Readonly<GameCapabilityProbe>;
  readonly issues: readonly CapabilityIssue[];
  readonly blockingIssues: readonly CapabilityIssue[];
  readonly warnings: readonly CapabilityIssue[];
  readonly recommendedReducedFlashing: boolean;
}

interface StorageProbe {
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface MediaQueryProbe {
  readonly matches: boolean;
}

export interface BrowserCapabilityEnvironment {
  readonly document: Document;
  readonly audioContextAvailable: boolean;
  readonly storage: StorageProbe | null;
  readonly matchMedia: ((query: string) => MediaQueryProbe) | null;
}

const DEFAULT_POLICY = Object.freeze({
  requirePointerLock: true,
  requireWebAudio: true,
  requirePersistentStorage: false,
});

const WEBGL_CONTEXT_OPTIONS: WebGLContextAttributes = Object.freeze({
  alpha: false,
  antialias: false,
  depth: true,
  powerPreference: 'high-performance',
  premultipliedAlpha: false,
  preserveDrawingBuffer: false,
  stencil: true,
});

function resolveBrowserEnvironment(): BrowserCapabilityEnvironment {
  const browserWindow = window as Window &
    typeof globalThis & { readonly webkitAudioContext?: typeof AudioContext };

  let storage: StorageProbe | null;
  try {
    storage = browserWindow.localStorage;
  } catch {
    storage = null;
  }

  return {
    document: browserWindow.document,
    audioContextAvailable: Boolean(browserWindow.AudioContext ?? browserWindow.webkitAudioContext),
    storage,
    matchMedia:
      typeof browserWindow.matchMedia === 'function'
        ? (query: string) => browserWindow.matchMedia(query)
        : null,
  };
}

function canCreateContext(canvas: HTMLCanvasElement, contextId: 'webgl' | 'webgl2'): boolean {
  try {
    return canvas.getContext(contextId, WEBGL_CONTEXT_OPTIONS) !== null;
  } catch {
    return false;
  }
}

function canPersistSettings(storage: StorageProbe | null): boolean {
  if (!storage) {
    return false;
  }

  const key = '__threshold_capability_probe__';
  try {
    storage.setItem(key, '1');
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Probes browser APIs without starting audio or requesting pointer lock. The
 * WebGL probe intentionally asks the target canvas for a real context so a
 * disabled GPU or denied context is reported before Babylon starts.
 */
export function probeGameCapabilities(
  canvas: HTMLCanvasElement,
  environment: BrowserCapabilityEnvironment = resolveBrowserEnvironment(),
): Readonly<GameCapabilityProbe> {
  const webGl2 = canCreateContext(canvas, 'webgl2');
  const webGl1 = webGl2 ? true : canCreateContext(canvas, 'webgl');
  const pointerLock =
    'pointerLockElement' in environment.document && typeof canvas.requestPointerLock === 'function';

  let prefersReducedMotion: boolean;
  try {
    prefersReducedMotion =
      environment.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    prefersReducedMotion = false;
  }

  return Object.freeze({
    webGl2,
    webGl1,
    pointerLock,
    webAudio: environment.audioContextAvailable,
    persistentStorage: canPersistSettings(environment.storage),
    prefersReducedMotion,
  });
}

function issueSeverity(required: boolean): CapabilityIssueSeverity {
  return required ? 'blocking' : 'warning';
}

/** Converts a raw API probe into the product-level compatibility decision. */
export function assessGameCapabilities(
  probe: Readonly<GameCapabilityProbe>,
  policy: CapabilityPolicy = {},
): Readonly<GameCapabilityReport> {
  const resolvedPolicy = { ...DEFAULT_POLICY, ...policy };
  const issues: CapabilityIssue[] = [];

  if (!probe.webGl2) {
    issues.push({
      code: 'webgl2-unavailable',
      severity: 'blocking',
      title: 'WebGL2 no está disponible',
      message: probe.webGl1
        ? 'El navegador solo pudo crear un contexto WebGL antiguo. THRESHOLD necesita WebGL2.'
        : 'No se pudo crear un contexto gráfico. Comprueba la aceleración por hardware, el navegador y los controladores de video.',
    });
  }

  if (!probe.pointerLock) {
    issues.push({
      code: 'pointer-lock-unavailable',
      severity: issueSeverity(resolvedPolicy.requirePointerLock),
      title: 'Control de cámara no disponible',
      message:
        'El navegador no ofrece Pointer Lock en esta página. Usa un navegador de escritorio actualizado y revisa sus permisos.',
    });
  }

  if (!probe.webAudio) {
    issues.push({
      code: 'web-audio-unavailable',
      severity: issueSeverity(resolvedPolicy.requireWebAudio),
      title: 'Web Audio no está disponible',
      message:
        'La atmósfera y las señales de salida dependen del audio del navegador. Actualiza el navegador o revisa sus restricciones de audio.',
    });
  }

  if (!probe.persistentStorage) {
    issues.push({
      code: 'persistent-storage-unavailable',
      severity: issueSeverity(resolvedPolicy.requirePersistentStorage),
      title: 'Los ajustes no pueden guardarse',
      message:
        'La partida puede continuar, pero volumen, sensibilidad y accesibilidad volverán a sus valores iniciales al recargar.',
    });
  }

  const blockingIssues = issues.filter((issue) => issue.severity === 'blocking');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  const status: CapabilityStatus =
    blockingIssues.length > 0 ? 'incompatible' : warnings.length > 0 ? 'degraded' : 'compatible';

  return Object.freeze({
    status,
    probe: Object.freeze({ ...probe }),
    issues: Object.freeze(issues),
    blockingIssues: Object.freeze(blockingIssues),
    warnings: Object.freeze(warnings),
    recommendedReducedFlashing: probe.prefersReducedMotion,
  });
}

export function detectGameCapabilities(
  canvas: HTMLCanvasElement,
  policy: CapabilityPolicy = {},
  environment?: BrowserCapabilityEnvironment,
): Readonly<GameCapabilityReport> {
  const probe = environment
    ? probeGameCapabilities(canvas, environment)
    : probeGameCapabilities(canvas);
  return assessGameCapabilities(probe, policy);
}
