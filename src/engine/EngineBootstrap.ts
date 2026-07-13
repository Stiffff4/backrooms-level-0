import { Engine } from '@babylonjs/core/Engines/engine';

export type EngineResizeOwnership = 'bootstrap' | 'external';

export interface EngineBootstrapOptions {
  readonly resizeOwnership?: EngineResizeOwnership;
}

export class EngineBootstrap {
  private readonly handleResize = (): void => this.engine.resize();
  private resizeOwnershipValue: EngineResizeOwnership;

  private constructor(
    public readonly engine: Engine,
    private readonly canvas: HTMLCanvasElement,
    resizeOwnership: EngineResizeOwnership,
  ) {
    this.resizeOwnershipValue = resizeOwnership;
  }

  public static create(
    canvas: HTMLCanvasElement,
    options: EngineBootstrapOptions = {},
  ): EngineBootstrap {
    const webGl2 = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });

    if (!webGl2) {
      throw new Error(
        'THRESHOLD necesita WebGL2. Actualiza el navegador o activa la aceleración gráfica.',
      );
    }

    const engine = new Engine(canvas, false, {
      audioEngine: false,
      antialias: false,
      preserveDrawingBuffer: false,
      stencil: true,
      premultipliedAlpha: false,
    });
    engine.setHardwareScalingLevel(1);

    const resizeOwnership = options.resizeOwnership ?? 'bootstrap';
    const bootstrap = new EngineBootstrap(engine, canvas, resizeOwnership);
    if (resizeOwnership === 'bootstrap') {
      window.addEventListener('resize', bootstrap.handleResize, { passive: true });
      bootstrap.handleResize();
    }
    return bootstrap;
  }

  public get resizeOwnership(): EngineResizeOwnership {
    return this.resizeOwnershipValue;
  }

  /**
   * Stops the viewport-sized resize listener before a fixed-resolution pipeline
   * takes control of the canvas buffer. Safe to call more than once.
   */
  public releaseResizeOwnership(): void {
    if (this.resizeOwnershipValue === 'external') {
      return;
    }
    window.removeEventListener('resize', this.handleResize);
    this.resizeOwnershipValue = 'external';
  }

  public start(render: () => void): void {
    this.engine.runRenderLoop(render);
  }

  public dispose(): void {
    this.releaseResizeOwnership();
    this.engine.stopRenderLoop();
    this.engine.dispose();
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}
