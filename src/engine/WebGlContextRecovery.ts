export type WebGlRecoveryPhase = 'ready' | 'lost' | 'restoring' | 'failed' | 'disposed';

export interface WebGlRecoverySnapshot {
  readonly phase: WebGlRecoveryPhase;
  readonly lossCount: number;
  readonly recoveryCount: number;
  readonly contextReturned: boolean;
  readonly canRequestRestore: boolean;
  readonly lastError: string | null;
}

export interface WebGlContextRecoveryCallbacks {
  /** Pause simulation, input and audio without destroying session state. */
  readonly onPause: () => void;
  /**
   * Optional engine-level barrier. For Babylon, resolve this from
   * `engine.onContextRestoredObservable` before custom reconstruction starts.
   */
  readonly waitForRenderer?: () => void | Promise<void>;
  /** Rebuild custom resources after the renderer-level barrier has completed. */
  readonly restoreResources: () => void | Promise<void>;
  /** Restore the pre-loss state only after all resources are ready. */
  readonly onResume: () => void | Promise<void>;
  readonly onStateChange?: (snapshot: Readonly<WebGlRecoverySnapshot>) => void;
}

interface LoseContextExtension {
  restoreContext(): void;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'No se pudieron reconstruir los recursos gráficos.';
}

function waitForNextTask(): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, 0));
}

/**
 * Owns the WebGL context-loss lifecycle, but delegates game-state and resource
 * work to callbacks so it stays independent from Babylon and App.
 */
export class WebGlContextRecovery {
  private phaseValue: WebGlRecoveryPhase = 'ready';
  private lossCountValue = 0;
  private recoveryCountValue = 0;
  private contextReturnedValue = true;
  private lastErrorValue: string | null = null;
  private restoreExtension: LoseContextExtension | null = null;
  private generation = 0;
  private started = false;
  private recoveryTask: Promise<void> | null = null;

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    if (!this.started || this.phaseValue === 'disposed') {
      return;
    }

    this.generation += 1;
    this.lossCountValue += 1;
    this.contextReturnedValue = false;
    this.lastErrorValue = null;
    this.phaseValue = 'lost';
    this.restoreExtension ??= this.findRestoreExtension();

    try {
      this.callbacks.onPause();
    } catch (error: unknown) {
      this.lastErrorValue = `El juego no pudo pausarse limpiamente: ${errorMessage(error)}`;
    }
    this.notify();
  };

  private readonly handleContextRestored = (): void => {
    if (!this.started || this.phaseValue === 'disposed') {
      return;
    }
    if (this.contextReturnedValue && this.phaseValue !== 'failed') {
      return;
    }

    this.contextReturnedValue = true;
    this.restoreExtension = null;
    this.phaseValue = 'restoring';
    this.lastErrorValue = null;
    const generation = this.generation;
    this.notify();
    this.recoveryTask = this.finishRecovery(generation);
  };

  public constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly callbacks: WebGlContextRecoveryCallbacks,
  ) {}

  public get snapshot(): Readonly<WebGlRecoverySnapshot> {
    return Object.freeze({
      phase: this.phaseValue,
      lossCount: this.lossCountValue,
      recoveryCount: this.recoveryCountValue,
      contextReturned: this.contextReturnedValue,
      canRequestRestore: !this.contextReturnedValue && this.restoreExtension !== null,
      lastError: this.lastErrorValue,
    });
  }

  public start(): void {
    if (this.started || this.phaseValue === 'disposed') {
      return;
    }
    this.started = true;
    // WEBGL_lose_context can become undiscoverable once the context is lost,
    // so retain the healthy-context extension for an explicit retry.
    this.restoreExtension = this.findRestoreExtension();
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
    this.notify();
  }

  /**
   * Retries custom reconstruction if the context already returned, otherwise
   * requests restoration through WEBGL_lose_context when the browser exposes it.
   */
  public async retry(): Promise<boolean> {
    if (
      !this.started ||
      this.phaseValue === 'disposed' ||
      this.phaseValue === 'ready' ||
      this.phaseValue === 'restoring'
    ) {
      return false;
    }

    if (this.contextReturnedValue) {
      const generation = this.generation;
      this.phaseValue = 'restoring';
      this.lastErrorValue = null;
      this.notify();
      this.recoveryTask = this.finishRecovery(generation);
      await this.recoveryTask;
      return this.snapshot.phase === 'ready';
    }

    const extension = this.restoreExtension ?? this.findRestoreExtension();
    this.restoreExtension = extension;
    if (!extension) {
      this.fail(
        'El navegador no permite solicitar la restauración. Recarga la página para continuar.',
      );
      return false;
    }

    this.phaseValue = 'restoring';
    this.lastErrorValue = null;
    this.notify();
    try {
      extension.restoreContext();
      return true;
    } catch (error: unknown) {
      this.fail(errorMessage(error));
      return false;
    }
  }

  public async whenSettled(): Promise<void> {
    await this.recoveryTask;
  }

  public dispose(): void {
    if (this.phaseValue === 'disposed') {
      return;
    }

    this.generation += 1;
    if (this.started) {
      this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
      this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    }
    this.started = false;
    this.phaseValue = 'disposed';
    this.restoreExtension = null;
    this.recoveryTask = null;
    this.notify();
  }

  private async finishRecovery(generation: number): Promise<void> {
    try {
      if (this.callbacks.waitForRenderer) {
        await this.callbacks.waitForRenderer();
      } else {
        // Babylon schedules its own GPU rebuild in the first post-event task.
        await waitForNextTask();
      }
      if (!this.isCurrent(generation)) {
        return;
      }
      await this.callbacks.restoreResources();
      if (!this.isCurrent(generation)) {
        return;
      }
      await this.callbacks.onResume();
      if (!this.isCurrent(generation)) {
        return;
      }

      this.recoveryCountValue += 1;
      this.phaseValue = 'ready';
      this.lastErrorValue = null;
      this.restoreExtension = this.findRestoreExtension();
      this.notify();
    } catch (error: unknown) {
      if (this.isCurrent(generation)) {
        this.fail(errorMessage(error));
      }
    }
  }

  private isCurrent(generation: number): boolean {
    return this.started && this.phaseValue !== 'disposed' && generation === this.generation;
  }

  private findRestoreExtension(): LoseContextExtension | null {
    try {
      const context = this.canvas.getContext('webgl2');
      const extension = context?.getExtension('WEBGL_lose_context');
      if (
        extension &&
        typeof (extension as Partial<LoseContextExtension>).restoreContext === 'function'
      ) {
        return extension as LoseContextExtension;
      }
    } catch {
      // A lost or security-restricted context may reject all queries.
    }
    return null;
  }

  private fail(message: string): void {
    this.phaseValue = 'failed';
    this.lastErrorValue = message;
    this.notify();
  }

  private notify(): void {
    try {
      this.callbacks.onStateChange?.(this.snapshot);
    } catch {
      // Presentation failures must not invalidate an otherwise recovered renderer.
    }
  }
}
