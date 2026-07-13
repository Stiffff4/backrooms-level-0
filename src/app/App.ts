import type { Scene } from '@babylonjs/core/scene';
import { EngineBootstrap } from '../engine/EngineBootstrap';
import { createFoundationScene } from '../engine/SceneFactory';
import { renderErrorScreen } from '../ui/ErrorScreen';
import { GameStateMachine } from './GameStateMachine';

export class App {
  private readonly stateMachine = new GameStateMachine();
  private engineBootstrap: EngineBootstrap | null = null;
  private scene: Scene | null = null;

  public constructor(
    private readonly root: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
  ) {}

  public async start(): Promise<void> {
    try {
      this.stateMachine.transition('loading');
      this.engineBootstrap = EngineBootstrap.create(this.canvas);
      this.scene = createFoundationScene(this.engineBootstrap.engine);
      this.engineBootstrap.start(() => this.scene?.render());
      this.stateMachine.transition('title');
      this.renderFoundationStatus();
      await Promise.resolve();
    } catch (error: unknown) {
      this.showFatalError(error);
    }
  }

  public dispose(): void {
    this.scene?.dispose();
    this.scene = null;
    this.engineBootstrap?.dispose();
    this.engineBootstrap = null;
  }

  private renderFoundationStatus(): void {
    const status = this.root.querySelector<HTMLElement>('#boot-status');
    if (!status) {
      return;
    }

    status.innerHTML = `
      <p class="eyebrow">LEVEL 0</p>
      <h1>THRESHOLD</h1>
      <p class="foundation-note">Fundación del motor lista.</p>
    `;
  }

  private showFatalError(error: unknown): void {
    if (this.stateMachine.canTransition('fatalError')) {
      this.stateMachine.transition('fatalError');
    }
    renderErrorScreen(this.root, error);
  }
}
