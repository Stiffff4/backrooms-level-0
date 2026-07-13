import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';

export interface RoomMaterialSet {
  readonly wall: StandardMaterial;
  readonly wallStained: StandardMaterial;
  readonly carpet: StandardMaterial;
  readonly carpetWet: StandardMaterial;
  readonly ceiling: StandardMaterial;
  readonly trim: StandardMaterial;
  readonly ceilingGrid: StandardMaterial;
  readonly fixtureHousing: StandardMaterial;
  readonly fixtureEmitter: StandardMaterial;
  readonly fixtureEmitterOff: StandardMaterial;
  readonly column: StandardMaterial;
}

/**
 * Owns the small, shared material palette used by every procedural room.
 * Keeping this palette outside individual room views prevents one material per
 * module and gives the later texture pipeline a single place to attach maps.
 */
export class RoomMaterialLibrary implements RoomMaterialSet {
  public readonly wall: StandardMaterial;
  public readonly wallStained: StandardMaterial;
  public readonly carpet: StandardMaterial;
  public readonly carpetWet: StandardMaterial;
  public readonly ceiling: StandardMaterial;
  public readonly trim: StandardMaterial;
  public readonly ceilingGrid: StandardMaterial;
  public readonly fixtureHousing: StandardMaterial;
  public readonly fixtureEmitter: StandardMaterial;
  public readonly fixtureEmitterOff: StandardMaterial;
  public readonly column: StandardMaterial;

  private readonly owned: readonly StandardMaterial[];
  private disposed = false;

  public constructor(private readonly scene: Scene) {
    this.wall = this.create('wall', new Color3(0.63, 0.56, 0.28), new Color3(0.05, 0.04, 0.014));
    this.wallStained = this.create(
      'wall-stained',
      new Color3(0.49, 0.44, 0.22),
      new Color3(0.035, 0.029, 0.01),
    );
    this.carpet = this.create(
      'carpet',
      new Color3(0.25, 0.235, 0.125),
      new Color3(0.014, 0.012, 0.005),
    );
    this.carpetWet = this.create(
      'carpet-wet',
      new Color3(0.16, 0.155, 0.09),
      new Color3(0.008, 0.007, 0.003),
    );
    this.ceiling = this.create(
      'ceiling',
      new Color3(0.59, 0.575, 0.4),
      new Color3(0.025, 0.023, 0.012),
    );
    this.trim = this.create('trim', new Color3(0.33, 0.29, 0.13), new Color3(0.012, 0.01, 0.004));
    this.ceilingGrid = this.create(
      'ceiling-grid',
      new Color3(0.3, 0.285, 0.19),
      new Color3(0.011, 0.01, 0.005),
    );
    this.fixtureHousing = this.create(
      'fixture-housing',
      new Color3(0.42, 0.4, 0.28),
      new Color3(0.025, 0.023, 0.012),
    );
    this.fixtureEmitter = this.create(
      'fixture-emitter',
      new Color3(0.96, 0.91, 0.61),
      new Color3(0.88, 0.75, 0.34),
    );
    this.fixtureEmitterOff = this.create(
      'fixture-emitter-off',
      new Color3(0.31, 0.3, 0.22),
      new Color3(0.018, 0.016, 0.008),
    );
    this.column = this.create(
      'column',
      new Color3(0.55, 0.49, 0.24),
      new Color3(0.038, 0.031, 0.011),
    );

    this.fixtureEmitter.disableLighting = true;
    this.fixtureEmitterOff.disableLighting = true;
    this.owned = Object.freeze([
      this.wall,
      this.wallStained,
      this.carpet,
      this.carpetWet,
      this.ceiling,
      this.trim,
      this.ceilingGrid,
      this.fixtureHousing,
      this.fixtureEmitter,
      this.fixtureEmitterOff,
      this.column,
    ]);
  }

  public get materialCount(): number {
    return this.owned.length;
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    for (const material of this.owned) {
      material.dispose(false, false);
    }
  }

  private create(id: string, diffuse: Color3, emissive: Color3): StandardMaterial {
    const material = new StandardMaterial(`level-zero.shared.${id}`, this.scene);
    material.diffuseColor.copyFrom(diffuse);
    material.emissiveColor.copyFrom(emissive);
    material.specularColor.set(0.035, 0.033, 0.02);
    material.roughness = 0.91;
    material.backFaceCulling = true;
    return material;
  }
}
