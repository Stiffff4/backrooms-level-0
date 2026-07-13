import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Scene } from '@babylonjs/core/scene';
import type { Engine } from '@babylonjs/core/Engines/engine';

export function createFoundationScene(engine: Engine): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.055, 0.052, 0.027, 1);

  const camera = new FreeCamera('foundation-camera', new Vector3(0, 1.7, -4), scene);
  camera.setTarget(new Vector3(0, 1.7, 0));
  scene.activeCamera = camera;

  return scene;
}
