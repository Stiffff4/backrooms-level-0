import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import { deriveSeed, SeededRandom } from '../procedural/SeedBank';
import type { Vector3Like } from '../procedural/procedural.types';
import { exitPresentationConfig } from './exit.presentation.config';
import type { ExitWallPlacement, ExitWallVisualSample } from './exit.presentation.types';
import { normalizeExitWallPlacement, translateExitWallPlacement } from './ExitPlacement';
import { ExitTransitionTrigger } from './ExitTransitionTrigger';

interface ExitGlitchStrip {
  readonly mesh: Mesh;
  readonly baseX: number;
  readonly phase: number;
  readonly direction: -1 | 1;
}

interface MutableVisualSample {
  elapsedSeconds: number;
  lightResponse: number;
  emissiveStrength: number;
  glitchStrength: number;
  proximity: number;
  transitionProgress: number;
  reducedFlashingApplied: boolean;
}

export interface ExitWallPresentationOptions {
  readonly reducedFlashing?: boolean;
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function finiteNonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be finite and non-negative.`);
  }
  return value;
}

function cloneExitMaterial(source: StandardMaterial, name: string): StandardMaterial {
  const material = source.clone(name);
  material.name = name;
  material.id = name;
  material.backFaceCulling = true;
  material.disableLighting = false;
  return material;
}

/**
 * Owns the single exit-wall overlay and its deterministic discontinuity strips.
 * It deliberately creates no dynamic light; the existing LightPool reserves
 * exit priority by overriding nearby fixtures with the `exit` profile.
 */
export class ExitWallPresentation {
  public readonly root: TransformNode;
  public readonly wallMesh: Mesh;
  public readonly trigger: ExitTransitionTrigger;

  private placementValue: ExitWallPlacement;
  private readonly wallMaterial: StandardMaterial;
  private readonly glitchMaterial: StandardMaterial;
  private readonly glitchStrips: readonly ExitGlitchStrip[];
  private readonly baseDiffuse: Color3;
  private readonly baseEmissive: Color3;
  private readonly seedPhaseA: number;
  private readonly seedPhaseB: number;
  private readonly sampleValue: MutableVisualSample = {
    elapsedSeconds: 0,
    lightResponse: 1,
    emissiveStrength: exitPresentationConfig.visual.baseEmissiveStrength,
    glitchStrength: 0,
    proximity: 0,
    transitionProgress: 0,
    reducedFlashingApplied: false,
  };
  private reducedFlashingValue: boolean;
  private transitionProgressValue = 0;
  private disposed = false;

  public constructor(
    scene: Scene,
    placement: ExitWallPlacement,
    baseWallMaterial: StandardMaterial,
    options: ExitWallPresentationOptions = {},
  ) {
    this.placementValue = normalizeExitWallPlacement(placement);
    this.reducedFlashingValue = options.reducedFlashing ?? false;
    this.trigger = new ExitTransitionTrigger(this.placementValue);
    this.root = new TransformNode(
      `exit.${this.placementValue.roomId}.${this.placementValue.surfaceId}`,
      scene,
    );
    this.root.position.copyFrom(this.toVector3(this.placementValue.center));
    this.root.rotation.y = Math.atan2(
      this.placementValue.inwardNormal.x,
      this.placementValue.inwardNormal.z,
    );

    this.wallMaterial = cloneExitMaterial(baseWallMaterial, `${this.root.name}.wall-material`);
    this.glitchMaterial = cloneExitMaterial(
      baseWallMaterial,
      `${this.root.name}.discontinuity-material`,
    );
    this.baseDiffuse = baseWallMaterial.diffuseColor.clone();
    this.baseEmissive = baseWallMaterial.emissiveColor.clone();

    this.wallMesh = MeshBuilder.CreateBox(
      `${this.root.name}.wall`,
      {
        width: this.placementValue.width,
        height: this.placementValue.height,
        depth: exitPresentationConfig.visual.thickness,
      },
      scene,
    );
    this.wallMesh.position.z = exitPresentationConfig.visual.surfaceOffset;
    this.wallMesh.material = this.wallMaterial;
    this.wallMesh.parent = this.root;
    this.wallMesh.isPickable = false;
    this.wallMesh.checkCollisions = false;

    const rng = new SeededRandom(
      deriveSeed(this.placementValue.seed, 'exit-wall-presentation', this.placementValue.surfaceId),
    );
    this.seedPhaseA = rng.next() * Math.PI * 2;
    this.seedPhaseB = rng.next() * Math.PI * 2;
    this.glitchStrips = Object.freeze(
      Array.from({ length: exitPresentationConfig.visual.glitchStripCount }, (_, index) =>
        this.createGlitchStrip(scene, rng, index),
      ),
    );
    this.applySample(this.evaluate(0, Number.POSITIVE_INFINITY));
  }

  public get placement(): ExitWallPlacement {
    return this.placementValue;
  }

  public get sample(): ExitWallVisualSample {
    return this.sampleValue;
  }

  public get meshes(): readonly Mesh[] {
    return Object.freeze([this.wallMesh, ...this.glitchStrips.map((strip) => strip.mesh)]);
  }

  public setReducedFlashing(reducedFlashing: boolean): void {
    this.assertActive();
    this.reducedFlashingValue = reducedFlashing;
  }

  public setTransitionProgress(progress: number): void {
    this.assertActive();
    if (!Number.isFinite(progress)) {
      throw new RangeError('Exit transition progress must be finite.');
    }
    this.transitionProgressValue = clampUnit(progress);
  }

  public evaluate(elapsedSeconds: number, cameraDistance: number): ExitWallVisualSample {
    this.assertActive();
    finiteNonNegative(elapsedSeconds, 'Exit wall elapsedSeconds');
    const distance = Number.isFinite(cameraDistance)
      ? finiteNonNegative(cameraDistance, 'Exit wall cameraDistance')
      : Number.POSITIVE_INFINITY;
    const proximity =
      distance === Number.POSITIVE_INFINITY
        ? 0
        : 1 - clampUnit(distance / exitPresentationConfig.visual.proximityRange);

    const slowWave = Math.sin(elapsedSeconds * 2.387 + this.seedPhaseA);
    const driftWave = Math.sin(elapsedSeconds * 0.619 + this.seedPhaseB);
    const irregularWave = Math.sin(elapsedSeconds * 5.713 + this.seedPhaseA * 0.41);
    const rawDepth = 0.048 + proximity * 0.03 + this.transitionProgressValue * 0.052;
    const depth = this.reducedFlashingValue
      ? rawDepth * exitPresentationConfig.visual.reducedGlitchScale
      : rawDepth;
    const responseCenter = 0.56 + driftWave * 0.05;
    const minimumResponse = this.reducedFlashingValue
      ? exitPresentationConfig.visual.reducedMinimumLightResponse
      : exitPresentationConfig.visual.minimumLightResponse;
    const lightResponse = Math.min(
      exitPresentationConfig.visual.maximumLightResponse,
      Math.max(minimumResponse, responseCenter + slowWave * depth + irregularWave * depth * 0.22),
    );
    const glitchStrength = clampUnit(
      0.28 +
        Math.abs(irregularWave) *
          (0.18 + proximity * 0.14 + this.transitionProgressValue * 0.22) *
          (this.reducedFlashingValue ? exitPresentationConfig.visual.reducedGlitchScale : 1),
    );
    const emissiveStrength = Math.min(
      exitPresentationConfig.visual.maximumEmissiveStrength,
      exitPresentationConfig.visual.baseEmissiveStrength +
        (1 - lightResponse) * 0.46 +
        proximity * 0.042,
    );

    this.sampleValue.elapsedSeconds = elapsedSeconds;
    this.sampleValue.lightResponse = lightResponse;
    this.sampleValue.emissiveStrength = emissiveStrength;
    this.sampleValue.glitchStrength = glitchStrength;
    this.sampleValue.proximity = proximity;
    this.sampleValue.transitionProgress = this.transitionProgressValue;
    this.sampleValue.reducedFlashingApplied = this.reducedFlashingValue;
    return this.sampleValue;
  }

  public update(elapsedSeconds: number, cameraDistance: number): ExitWallVisualSample {
    const sample = this.evaluate(elapsedSeconds, cameraDistance);
    this.applySample(sample);
    return sample;
  }

  public translate(delta: Vector3Like): void {
    this.assertActive();
    this.placementValue = translateExitWallPlacement(this.placementValue, delta);
    this.root.position.addInPlace(this.toVector3(delta));
    this.trigger.translate(delta);
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.root.dispose(false, false);
    this.wallMaterial.dispose(false, false);
    this.glitchMaterial.dispose(false, false);
  }

  private createGlitchStrip(scene: Scene, rng: SeededRandom, index: number): ExitGlitchStrip {
    const width = this.placementValue.width * (0.3 + rng.next() * 0.5);
    const height = 0.018 + rng.next() * 0.034;
    const availableX = Math.max(0, (this.placementValue.width - width) / 2);
    const baseX = (rng.next() * 2 - 1) * availableX;
    const availableY = Math.max(0, (this.placementValue.height - height) / 2 - 0.08);
    const baseY = (rng.next() * 2 - 1) * availableY;
    const mesh = MeshBuilder.CreateBox(
      `${this.root.name}.discontinuity.${index}`,
      { width, height, depth: 0.009 },
      scene,
    );
    mesh.position.set(
      baseX,
      baseY,
      exitPresentationConfig.visual.surfaceOffset +
        exitPresentationConfig.visual.thickness / 2 +
        0.008,
    );
    mesh.material = this.glitchMaterial;
    mesh.parent = this.root;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    return Object.freeze({
      mesh,
      baseX,
      phase: rng.next() * Math.PI * 2,
      direction: rng.next() < 0.5 ? -1 : 1,
    });
  }

  private applySample(sample: ExitWallVisualSample): void {
    const diffuseScale = 0.28 + sample.lightResponse * 0.16;
    this.wallMaterial.diffuseColor.copyFrom(this.baseDiffuse).scaleInPlace(diffuseScale);
    this.wallMaterial.emissiveColor.copyFrom(this.baseEmissive);
    this.wallMaterial.emissiveColor.r += sample.emissiveStrength * 0.82;
    this.wallMaterial.emissiveColor.g += sample.emissiveStrength * 0.88;
    this.wallMaterial.emissiveColor.b += sample.emissiveStrength * 0.52;

    this.glitchMaterial.diffuseColor.copyFrom(this.baseDiffuse).scaleInPlace(diffuseScale * 0.62);
    this.glitchMaterial.emissiveColor.copyFrom(this.baseEmissive);
    this.glitchMaterial.emissiveColor.r += sample.emissiveStrength * 1.1;
    this.glitchMaterial.emissiveColor.g += sample.emissiveStrength * 1.16;
    this.glitchMaterial.emissiveColor.b += sample.emissiveStrength * 0.7;

    const transitionWave = Math.sin(sample.elapsedSeconds * 18.1 + this.seedPhaseB);
    this.root.scaling.x =
      1 +
      transitionWave * sample.transitionProgress * exitPresentationConfig.visual.transitionScaleX;
    this.root.scaling.y =
      1 - sample.transitionProgress * exitPresentationConfig.visual.transitionScaleY;
    const maximumOffset = exitPresentationConfig.visual.maximumGlitchOffset;
    for (const strip of this.glitchStrips) {
      const wave = Math.sin(sample.elapsedSeconds * 7.17 + strip.phase);
      strip.mesh.position.x =
        strip.baseX + strip.direction * wave * sample.glitchStrength * maximumOffset;
    }
  }

  private toVector3(vector: Vector3Like): Vector3 {
    return new Vector3(vector.x, vector.y, vector.z);
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error('ExitWallPresentation has been disposed.');
    }
  }
}
