import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import { deriveSeed, SeededRandom } from '../procedural/SeedBank';
import type { Vector3Like } from '../procedural/procedural.types';
import { exitPresentationConfig } from './exit.presentation.config';
import type { ExitWallPlacement, ExitWallVisualSample } from './exit.presentation.types';
import { normalizeExitWallPlacement, translateExitWallPlacement } from './ExitPlacement';
import { ExitTransitionTrigger } from './ExitTransitionTrigger';

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

const WALL_TEXTURE_METERS_PER_TILE = 1.8;

function positiveFraction(value: number): number {
  return ((value % 1) + 1) % 1;
}

function cloneTextureForPlacement(
  texture: Texture | null,
  name: string,
  placement: ExitWallPlacement,
): Texture | null {
  if (!texture) {
    return null;
  }
  const clone = texture.clone();
  clone.name = name;
  clone.uScale = placement.width / WALL_TEXTURE_METERS_PER_TILE;
  clone.vScale = placement.height / WALL_TEXTURE_METERS_PER_TILE;
  clone.uOffset = positiveFraction(
    (placement.center.x + placement.center.z) / WALL_TEXTURE_METERS_PER_TILE,
  );
  clone.vOffset = positiveFraction(placement.center.y / WALL_TEXTURE_METERS_PER_TILE);
  return clone;
}

function cloneExitMaterial(
  source: StandardMaterial,
  name: string,
  placement: ExitWallPlacement,
): StandardMaterial {
  const material = source.clone(name);
  material.name = name;
  material.id = name;
  material.backFaceCulling = false;
  material.disableLighting = false;
  material.diffuseTexture = cloneTextureForPlacement(
    source.diffuseTexture instanceof Texture ? source.diffuseTexture : null,
    `${name}.diffuse`,
    placement,
  );
  material.bumpTexture = cloneTextureForPlacement(
    source.bumpTexture instanceof Texture ? source.bumpTexture : null,
    `${name}.normal`,
    placement,
  );
  return material;
}

/**
 * Owns the single exit-wall overlay.
 * It deliberately creates no dynamic light; the existing LightPool reserves
 * exit priority by overriding nearby fixtures with the `exit` profile.
 */
export class ExitWallPresentation {
  public readonly root: TransformNode;
  public readonly wallMesh: Mesh;
  public readonly trigger: ExitTransitionTrigger;

  private placementValue: ExitWallPlacement;
  private readonly wallMaterial: StandardMaterial;
  private readonly baseDiffuse: Color3;
  private readonly baseEmissive: Color3;
  private readonly baseDiffuseTextureOffset: Readonly<{ u: number; v: number }>;
  private readonly baseNormalTextureOffset: Readonly<{ u: number; v: number }>;
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

    this.wallMaterial = cloneExitMaterial(
      baseWallMaterial,
      `${this.root.name}.wall-material`,
      this.placementValue,
    );
    this.baseDiffuse = baseWallMaterial.diffuseColor.clone();
    this.baseEmissive = baseWallMaterial.emissiveColor.clone();
    this.baseDiffuseTextureOffset = Object.freeze({
      u:
        this.wallMaterial.diffuseTexture instanceof Texture
          ? this.wallMaterial.diffuseTexture.uOffset
          : 0,
      v:
        this.wallMaterial.diffuseTexture instanceof Texture
          ? this.wallMaterial.diffuseTexture.vOffset
          : 0,
    });
    this.baseNormalTextureOffset = Object.freeze({
      u:
        this.wallMaterial.bumpTexture instanceof Texture ? this.wallMaterial.bumpTexture.uOffset : 0,
      v:
        this.wallMaterial.bumpTexture instanceof Texture ? this.wallMaterial.bumpTexture.vOffset : 0,
    });

    this.wallMesh = MeshBuilder.CreatePlane(
      `${this.root.name}.wall`,
      {
        width: this.placementValue.width,
        height: this.placementValue.height,
        sideOrientation: Mesh.DOUBLESIDE,
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
    this.applySample(this.evaluate(0, Number.POSITIVE_INFINITY));
  }

  public get placement(): ExitWallPlacement {
    return this.placementValue;
  }

  public get sample(): ExitWallVisualSample {
    return this.sampleValue;
  }

  public get meshes(): readonly Mesh[] {
    return Object.freeze([this.wallMesh]);
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

    const slowWave = Math.sin(elapsedSeconds * 1.947 + this.seedPhaseA);
    const driftWave = Math.sin(elapsedSeconds * 0.483 + this.seedPhaseB);
    const irregularWave = Math.sin(elapsedSeconds * 7.913 + this.seedPhaseA * 0.41);
    const pulseWave = Math.sin(elapsedSeconds * 17.2 + this.seedPhaseB * 0.73);
    const rawDepth = 0.055 + proximity * 0.022 + this.transitionProgressValue * 0.03;
    const depth = this.reducedFlashingValue
      ? rawDepth * exitPresentationConfig.visual.reducedGlitchScale
      : rawDepth;
    const responseCenter = 0.43 + driftWave * 0.018;
    const minimumResponse = this.reducedFlashingValue
      ? exitPresentationConfig.visual.reducedMinimumLightResponse
      : exitPresentationConfig.visual.minimumLightResponse;
    const lightResponse = Math.min(
      exitPresentationConfig.visual.maximumLightResponse,
      Math.max(
        minimumResponse,
        responseCenter + slowWave * depth + irregularWave * depth * 0.18 + pulseWave * 0.01,
      ),
    );
    const glitchStrength = clampUnit(
      0.045 +
        Math.abs(irregularWave) *
          (0.035 + proximity * 0.018 + this.transitionProgressValue * 0.03) *
          (this.reducedFlashingValue ? exitPresentationConfig.visual.reducedGlitchScale : 1),
    );
    const emissiveStrength = Math.min(
      exitPresentationConfig.visual.maximumEmissiveStrength,
      exitPresentationConfig.visual.baseEmissiveStrength + proximity * 0.004,
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
    this.wallMaterial.dispose(false, true);
  }

  private applySample(sample: ExitWallVisualSample): void {
    // Keep the exit consistently darker than the surrounding paper so it is
    // immediately legible, then add subtle UV jitter and distortion so it
    // reads as a glitched patch of reality instead of a portal prop.
    const diffuseScale = 0.34 + sample.lightResponse * 0.4;
    this.wallMaterial.diffuseColor.copyFrom(this.baseDiffuse).scaleInPlace(diffuseScale);
    this.wallMaterial.emissiveColor.copyFrom(this.baseEmissive);
    this.wallMaterial.emissiveColor.scaleInPlace(0.2 + sample.emissiveStrength * 3.2);

    const diffuseTexture = this.wallMaterial.diffuseTexture;
    if (diffuseTexture instanceof Texture) {
      const horizontalJitter =
        Math.round(Math.sin(sample.elapsedSeconds * 21.7 + this.seedPhaseA) * sample.glitchStrength * 24) /
        1024;
      const verticalJitter =
        Math.round(Math.sin(sample.elapsedSeconds * 12.9 + this.seedPhaseB) * sample.glitchStrength * 10) /
        1024;
      diffuseTexture.uOffset = this.baseDiffuseTextureOffset.u + horizontalJitter;
      diffuseTexture.vOffset = this.baseDiffuseTextureOffset.v + verticalJitter;
    }
    const bumpTexture = this.wallMaterial.bumpTexture;
    if (bumpTexture instanceof Texture) {
      bumpTexture.uOffset = this.baseNormalTextureOffset.u + sample.glitchStrength * 0.0035;
      bumpTexture.vOffset = this.baseNormalTextureOffset.v - sample.glitchStrength * 0.0015;
    }

    const transitionWave = Math.sin(sample.elapsedSeconds * 18.1 + this.seedPhaseB);
    this.root.scaling.x =
      1 +
      transitionWave * sample.transitionProgress * exitPresentationConfig.visual.transitionScaleX;
    this.root.scaling.y =
      1 - sample.transitionProgress * exitPresentationConfig.visual.transitionScaleY;
    this.wallMesh.scaling.x =
      1 + Math.sin(sample.elapsedSeconds * 3.31 + this.seedPhaseA) * sample.glitchStrength * 0.026;
    this.wallMesh.position.x =
      Math.sin(sample.elapsedSeconds * 11.7 + this.seedPhaseA * 1.7) * sample.glitchStrength * 0.018;
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
