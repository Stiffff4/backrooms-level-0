import type { Scene } from '@babylonjs/core/scene';
import { SceneInstrumentation } from '@babylonjs/core/Instrumentation/sceneInstrumentation';

export class DebugHud {
  private readonly element: HTMLPreElement;
  private readonly instrumentation: SceneInstrumentation;
  private lastUpdate = 0;

  public constructor(
    root: HTMLElement,
    private readonly scene: Scene,
  ) {
    this.element = document.createElement('pre');
    this.element.className = 'debug-hud';
    this.element.setAttribute('aria-hidden', 'true');
    root.append(this.element);
    this.instrumentation = new SceneInstrumentation(scene);
    this.instrumentation.captureFrameTime = true;
  }

  public get frameTimeMs(): number {
    return this.instrumentation.frameTimeCounter.current;
  }

  public get drawCalls(): number {
    return this.instrumentation.drawCallsCounter.current;
  }

  public get visibleTriangles(): number {
    return Math.floor(this.scene.getActiveIndices() / 3);
  }

  public get activeMeshes(): number {
    return this.scene.getActiveMeshes().length;
  }

  public update(nowMs: number, extraLines: readonly string[] = []): void {
    if (nowMs - this.lastUpdate < 250) {
      return;
    }
    this.lastUpdate = nowMs;

    const fps = this.scene.getEngine().getFps();
    this.element.textContent = [
      `FPS ${fps.toFixed(0)}`,
      `SCENE CPU ${this.frameTimeMs.toFixed(1)} ms`,
      `MESHES ${this.activeMeshes}`,
      `TRIANGLES ${this.visibleTriangles}`,
      `DRAW CALLS ${this.drawCalls}`,
      ...extraLines,
    ].join('\n');
  }

  public dispose(): void {
    this.instrumentation.dispose();
    this.element.remove();
  }
}
