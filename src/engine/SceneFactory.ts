import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Scene } from '@babylonjs/core/scene';
import type { Engine } from '@babylonjs/core/Engines/engine';

import { gameConfig } from '../config/game.config';

export function createGameplayScene(engine: Engine): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.215, 0.205, 0.125, 1);
  scene.autoClear = true;
  scene.autoClearDepthAndStencil = true;
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogStart = gameConfig.world.fogStart;
  scene.fogEnd = gameConfig.world.fogEnd;
  scene.fogColor = new Color3(0.215, 0.205, 0.125);

  const ambient = new HemisphericLight('level-zero-ambient-fill', new Vector3(0, 1, 0), scene);
  // A slightly stronger static fill prevents rooms without a proxy light from
  // becoming pitch-black while the bounded light pool serves nearer fixtures.
  ambient.intensity = 0.62;
  ambient.diffuse = new Color3(0.84, 0.79, 0.52);
  ambient.groundColor = new Color3(0.25, 0.235, 0.145);

  return scene;
}
