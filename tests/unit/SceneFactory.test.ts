import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { describe, expect, it } from 'vitest';
import { createGameplayScene } from '../../src/engine/SceneFactory';

describe('createGameplayScene', () => {
  it('mantiene color, depth y stencil en limpieza automática por frame', () => {
    const engine = new NullEngine();
    const scene = createGameplayScene(engine);

    try {
      expect(scene.autoClear).toBe(true);
      expect(scene.autoClearDepthAndStencil).toBe(true);
      expect(scene.clearColor.a).toBe(1);
    } finally {
      scene.dispose();
      engine.dispose();
    }
  });
});
