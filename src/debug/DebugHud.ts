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

  public update(nowMs: number, extraLines: readonly string[] = []): void {
    if (nowMs - this.lastUpdate < 250) {
      return;
    }
    this.lastUpdate = nowMs;

    const fps = this.scene.getEngine().getFps();
    const meshes = this.scene.getActiveMeshes().length;
    const triangles = Math.floor(this.scene.getActiveIndices() / 3);
    this.element.textContent = [
      `FPS ${fps.toFixed(0)}`,
      `FRAME ${this.instrumentation.frameTimeCounter.current.toFixed(1)} ms`,
      `MESHES ${meshes}`,
      `TRIANGLES ${triangles}`,
      `DRAW CALLS ${this.instrumentation.drawCallsCounter.current}`,
      ...extraLines,
    ].join('\n');
  }

  public dispose(): void {
    this.instrumentation.dispose();
    this.element.remove();
  }
}
