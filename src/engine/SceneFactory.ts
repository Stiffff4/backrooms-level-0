import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Scene } from '@babylonjs/core/scene';
import type { Engine } from '@babylonjs/core/Engines/engine';

export function createGameplayScene(engine: Engine): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.18, 0.17, 0.09, 1);

  const ambient = new HemisphericLight('level-zero-ambient-fill', new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.38;
  ambient.diffuse = new Color3(0.72, 0.67, 0.4);
  ambient.groundColor = new Color3(0.18, 0.16, 0.08);

  return scene;
}
