import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Scene } from '@babylonjs/core/scene';
import { afterEach, describe, expect, it } from 'vitest';
import type { ExitWallPlacement } from '../../src/exit/exit.presentation.types';
import { ExitWallPresentation } from '../../src/exit/ExitWallPresentation';

const disposables: { dispose(): void }[] = [];

function placement(seed: string | number = 'visual-exit'): ExitWallPlacement {
  return {
    roomId: 'room-visual',
    surfaceId: 'north-wall-left',
    center: { x: -3.6, y: 1.225, z: 5 },
    inwardNormal: { x: 0, y: 0, z: -1 },
    width: 2.6,
    height: 2.45,
    seed,
  };
}

function createFixture(seed: string | number = 'visual-exit', reducedFlashing = false) {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const material = new StandardMaterial('wall', scene);
  material.diffuseColor = new Color3(0.68, 0.61, 0.35);
  material.emissiveColor = new Color3(0.005, 0.006, 0.003);
  const presentation = new ExitWallPresentation(scene, placement(seed), material, {
    reducedFlashing,
  });
  disposables.push(presentation, scene, engine);
  return { engine, scene, material, presentation };
}

afterEach(() => {
  while (disposables.length > 0) {
    disposables.pop()?.dispose();
  }
});

describe('ExitWallPresentation', () => {
  it('construye una pared de papel y discontinuidades sin colliders ni luz dinámica', () => {
    const { scene, material, presentation } = createFixture();
    expect(presentation.meshes).toHaveLength(10);
    expect(presentation.meshes.every((mesh) => !mesh.checkCollisions && !mesh.isPickable)).toBe(
      true,
    );
    expect(presentation.wallMesh.material).not.toBe(material);
    expect(presentation.wallMesh.getBoundingInfo().boundingBox.extendSize.x * 2).toBeCloseTo(
      2.6,
      4,
    );
    expect(scene.lights).toHaveLength(0);
    expect(presentation.trigger.placement).toEqual(presentation.placement);
  });

  it('evalúa flicker irregular determinista y respeta reduced flashing', () => {
    const first = createFixture('same-seed').presentation;
    const second = createFixture('same-seed').presentation;
    const other = createFixture('other-seed').presentation;
    const firstSample = { ...first.update(8.375, 2.1) };
    const secondSample = { ...second.update(8.375, 2.1) };
    const otherSample = { ...other.update(8.375, 2.1) };
    expect(firstSample).toEqual(secondSample);
    expect(otherSample.lightResponse).not.toBeCloseTo(firstSample.lightResponse, 6);
    expect(firstSample.lightResponse).toBeGreaterThanOrEqual(0.66);
    expect(firstSample.glitchStrength).toBeLessThan(0.3);

    first.setReducedFlashing(true);
    const reduced = { ...first.update(8.375, 2.1) };
    expect(reduced.reducedFlashingApplied).toBe(true);
    expect(reduced.lightResponse).toBeGreaterThanOrEqual(0.9);
    expect(reduced.glitchStrength).toBeLessThan(firstSample.glitchStrength);
  });

  it('aumenta la señal solo en proximidad y aplica una transición breve sin flash', () => {
    const { presentation } = createFixture();
    const far = { ...presentation.update(4, Number.POSITIVE_INFINITY) };
    const near = { ...presentation.update(4, 0.5) };
    expect(far.proximity).toBe(0);
    expect(near.proximity).toBeGreaterThan(0.9);
    expect(near.emissiveStrength).toBeGreaterThan(far.emissiveStrength);

    presentation.setTransitionProgress(1);
    const transitioning = presentation.update(4.1, 0.2);
    expect(transitioning.transitionProgress).toBe(1);
    expect(transitioning.emissiveStrength).toBeLessThanOrEqual(0.18);
    expect(presentation.root.scaling.x).toBeGreaterThanOrEqual(0.978);
    expect(presentation.root.scaling.x).toBeLessThanOrEqual(1.022);
    expect(() => presentation.setTransitionProgress(Number.NaN)).toThrow(RangeError);
  });

  it('traslada presentación y trigger juntos durante un rebase y libera recursos', () => {
    const { presentation } = createFixture();
    presentation.translate({ x: -240, y: 0, z: 18 });
    expect(presentation.root.position.asArray()).toEqual([-243.6, 1.225, 23]);
    expect(presentation.placement.center).toEqual({ x: -243.6, y: 1.225, z: 23 });
    expect(presentation.trigger.placement.center).toEqual(presentation.placement.center);

    const wall = presentation.wallMesh;
    presentation.dispose();
    presentation.dispose();
    expect(wall.isDisposed()).toBe(true);
    expect(() => presentation.update(1, 1)).toThrow(/disposed/);
  });
});
