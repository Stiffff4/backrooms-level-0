import { Engine } from '@babylonjs/core/Engines/engine';

export class EngineBootstrap {
  private readonly handleResize = (): void => this.engine.resize();

  private constructor(
    public readonly engine: Engine,
    private readonly canvas: HTMLCanvasElement,
  ) {}

  public static create(canvas: HTMLCanvasElement): EngineBootstrap {
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

    const bootstrap = new EngineBootstrap(engine, canvas);
    window.addEventListener('resize', bootstrap.handleResize, { passive: true });
    bootstrap.handleResize();
    return bootstrap;
  }

  public start(render: () => void): void {
    this.engine.runRenderLoop(render);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    this.engine.stopRenderLoop();
    this.engine.dispose();
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}
