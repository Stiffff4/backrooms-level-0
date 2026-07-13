import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import type { BuiltRoom, RoomDimensions, SimpleRoomBuildOptions } from '../room.types';

interface ResolvedRoomOptions extends RoomDimensions {
  readonly name: string;
  readonly center: Vector3;
  readonly spawnOffset: Vector3;
  readonly wallThickness: number;
}

interface RoomMaterials {
  readonly wall: StandardMaterial;
  readonly carpet: StandardMaterial;
  readonly carpetWear: StandardMaterial;
  readonly ceiling: StandardMaterial;
  readonly trim: StandardMaterial;
  readonly ceilingGrid: StandardMaterial;
  readonly fixtureHousing: StandardMaterial;
  readonly fixtureEmitter: StandardMaterial;
  readonly all: readonly StandardMaterial[];
}

interface BoxSpec {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly position: Vector3;
}

const DEFAULT_ROOM = {
  name: 'level-zero-simple-room',
  width: 16,
  depth: 12,
  height: 3.1,
  wallThickness: 0.24,
  spawnHeight: 0.04,
} as const;

/**
 * Builds the deliberately small Phase 1 room without coupling it to the later
 * procedural catalog. All visual resources remain below one disposable root.
 */
export class SimpleRoomBuilder {
  public constructor(private readonly scene: Scene) {}

  public build(options: SimpleRoomBuildOptions = {}): BuiltRoom {
    const room = this.resolveOptions(options);
    const root = new TransformNode(room.name, this.scene);
    root.position.copyFrom(room.center);

    let materials: RoomMaterials | null = null;
    let disposed = false;

    root.onDisposeObservable.addOnce(() => {
      disposed = true;
      for (const material of materials?.all ?? []) {
        material.dispose();
      }
    });

    try {
      materials = this.createMaterials(room.name);
      this.createArchitecture(root, room, materials);
      this.createCeilingDetails(root, room, materials);
      this.createFixtures(root, room, materials);

      const colliders = Object.freeze(this.createColliders(root, room));
      const light = this.createLightProxy(root, room);
      const spawnPoint = room.center.add(room.spawnOffset);
      const dimensions: RoomDimensions = Object.freeze({
        width: room.width,
        depth: room.depth,
        height: room.height,
      });

      return {
        root,
        colliders,
        light,
        center: root.position,
        spawnPoint,
        dimensions,
        dispose: (): void => {
          if (!disposed) {
            root.dispose(false, false);
          }
        },
      };
    } catch (error: unknown) {
      root.dispose(false, false);
      throw error;
    }
  }

  private resolveOptions(options: SimpleRoomBuildOptions): ResolvedRoomOptions {
    const width = options.width ?? DEFAULT_ROOM.width;
    const depth = options.depth ?? DEFAULT_ROOM.depth;
    const height = options.height ?? DEFAULT_ROOM.height;
    const wallThickness = options.wallThickness ?? DEFAULT_ROOM.wallThickness;
    const center = options.center?.clone() ?? Vector3.Zero();
    const spawnOffset =
      options.spawnOffset?.clone() ?? new Vector3(0, DEFAULT_ROOM.spawnHeight, -depth * 0.27);
    const requestedName = options.name?.trim();
    const name = requestedName ? requestedName : DEFAULT_ROOM.name;

    this.assertFinitePositive('width', width, 6);
    this.assertFinitePositive('depth', depth, 6);
    this.assertFinitePositive('height', height, 2.3);
    this.assertFinitePositive('wallThickness', wallThickness, 0.08);

    if (wallThickness > Math.min(width, depth) * 0.1) {
      throw new RangeError('wallThickness is too large for the room footprint.');
    }
    if (!Number.isFinite(center.x) || !Number.isFinite(center.y) || !Number.isFinite(center.z)) {
      throw new RangeError('center must contain finite coordinates.');
    }
    if (
      !Number.isFinite(spawnOffset.x) ||
      !Number.isFinite(spawnOffset.y) ||
      !Number.isFinite(spawnOffset.z) ||
      Math.abs(spawnOffset.x) > width / 2 - 0.6 ||
      Math.abs(spawnOffset.z) > depth / 2 - 0.6 ||
      spawnOffset.y < 0 ||
      spawnOffset.y > height - 1.8
    ) {
      throw new RangeError('spawnOffset must place the player collider safely inside the room.');
    }

    return {
      name,
      center,
      spawnOffset,
      width,
      depth,
      height,
      wallThickness,
    };
  }

  private assertFinitePositive(label: string, value: number, minimum: number): void {
    if (!Number.isFinite(value) || value < minimum) {
      throw new RangeError(`${label} must be a finite number greater than or equal to ${minimum}.`);
    }
  }

  private createMaterials(prefix: string): RoomMaterials {
    const wall = this.createStandardMaterial(
      `${prefix}.material.wall`,
      new Color3(0.62, 0.56, 0.29),
      new Color3(0.045, 0.04, 0.018),
    );
    const carpet = this.createStandardMaterial(
      `${prefix}.material.carpet`,
      new Color3(0.25, 0.24, 0.14),
      new Color3(0.015, 0.014, 0.008),
    );
    const carpetWear = this.createStandardMaterial(
      `${prefix}.material.carpet-wear`,
      new Color3(0.18, 0.18, 0.105),
      new Color3(0.009, 0.009, 0.004),
    );
    const ceiling = this.createStandardMaterial(
      `${prefix}.material.ceiling`,
      new Color3(0.58, 0.57, 0.42),
      new Color3(0.025, 0.024, 0.014),
    );
    const trim = this.createStandardMaterial(
      `${prefix}.material.trim`,
      new Color3(0.32, 0.29, 0.14),
      new Color3(0.012, 0.011, 0.005),
    );
    const ceilingGrid = this.createStandardMaterial(
      `${prefix}.material.ceiling-grid`,
      new Color3(0.29, 0.28, 0.2),
      new Color3(0.012, 0.011, 0.007),
    );
    const fixtureHousing = this.createStandardMaterial(
      `${prefix}.material.fixture-housing`,
      new Color3(0.42, 0.41, 0.3),
      new Color3(0.025, 0.024, 0.015),
    );
    const fixtureEmitter = this.createStandardMaterial(
      `${prefix}.material.fixture-emitter`,
      new Color3(0.96, 0.91, 0.62),
      new Color3(0.9, 0.78, 0.4),
    );
    fixtureEmitter.specularColor.set(0.12, 0.11, 0.07);

    return {
      wall,
      carpet,
      carpetWear,
      ceiling,
      trim,
      ceilingGrid,
      fixtureHousing,
      fixtureEmitter,
      all: [wall, carpet, carpetWear, ceiling, trim, ceilingGrid, fixtureHousing, fixtureEmitter],
    };
  }

  private createStandardMaterial(
    name: string,
    diffuse: Color3,
    emissive: Color3,
  ): StandardMaterial {
    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor.copyFrom(diffuse);
    material.emissiveColor.copyFrom(emissive);
    material.specularColor.set(0.025, 0.022, 0.012);
    material.specularPower = 8;
    return material;
  }

  private createArchitecture(
    root: TransformNode,
    room: ResolvedRoomOptions,
    materials: RoomMaterials,
  ): void {
    const halfWidth = room.width / 2;
    const halfDepth = room.depth / 2;
    const halfWall = room.wallThickness / 2;

    this.createVisualBox(
      root,
      {
        name: `${room.name}.visual.floor`,
        width: room.width,
        height: 0.08,
        depth: room.depth,
        position: new Vector3(0, -0.04, 0),
      },
      materials.carpet,
    );
    this.createVisualBox(
      root,
      {
        name: `${room.name}.visual.ceiling`,
        width: room.width + room.wallThickness * 2,
        height: 0.08,
        depth: room.depth + room.wallThickness * 2,
        position: new Vector3(0, room.height + 0.04, 0),
      },
      materials.ceiling,
    );

    const wallSpecs: readonly BoxSpec[] = [
      {
        name: `${room.name}.visual.wall.north`,
        width: room.width + room.wallThickness * 2,
        height: room.height,
        depth: room.wallThickness,
        position: new Vector3(0, room.height / 2, halfDepth + halfWall),
      },
      {
        name: `${room.name}.visual.wall.south`,
        width: room.width + room.wallThickness * 2,
        height: room.height,
        depth: room.wallThickness,
        position: new Vector3(0, room.height / 2, -halfDepth - halfWall),
      },
      {
        name: `${room.name}.visual.wall.east`,
        width: room.wallThickness,
        height: room.height,
        depth: room.depth,
        position: new Vector3(halfWidth + halfWall, room.height / 2, 0),
      },
      {
        name: `${room.name}.visual.wall.west`,
        width: room.wallThickness,
        height: room.height,
        depth: room.depth,
        position: new Vector3(-halfWidth - halfWall, room.height / 2, 0),
      },
    ];
    for (const wallSpec of wallSpecs) {
      this.createVisualBox(root, wallSpec, materials.wall);
    }

    this.createPerimeterTrim(root, room, materials.trim, 0.1, 0.2, 'baseboard');
    this.createPerimeterTrim(root, room, materials.trim, room.height - 0.055, 0.11, 'cornice');

    this.createVisualBox(
      root,
      {
        name: `${room.name}.visual.carpet-wear.long`,
        width: Math.min(2.3, room.width * 0.22),
        height: 0.008,
        depth: room.depth * 0.76,
        position: new Vector3(-room.width * 0.12, 0.004, 0),
      },
      materials.carpetWear,
    );
    this.createVisualBox(
      root,
      {
        name: `${room.name}.visual.carpet-wear.cross`,
        width: room.width * 0.48,
        height: 0.009,
        depth: Math.min(1.45, room.depth * 0.16),
        position: new Vector3(room.width * 0.08, 0.0045, room.depth * 0.18),
      },
      materials.carpetWear,
    );
  }

  private createPerimeterTrim(
    root: TransformNode,
    room: ResolvedRoomOptions,
    material: StandardMaterial,
    y: number,
    height: number,
    label: string,
  ): void {
    const projection = 0.035;
    const specs: readonly BoxSpec[] = [
      {
        name: `${room.name}.visual.${label}.north`,
        width: room.width,
        height,
        depth: projection,
        position: new Vector3(0, y, room.depth / 2 - projection / 2),
      },
      {
        name: `${room.name}.visual.${label}.south`,
        width: room.width,
        height,
        depth: projection,
        position: new Vector3(0, y, -room.depth / 2 + projection / 2),
      },
      {
        name: `${room.name}.visual.${label}.east`,
        width: projection,
        height,
        depth: room.depth,
        position: new Vector3(room.width / 2 - projection / 2, y, 0),
      },
      {
        name: `${room.name}.visual.${label}.west`,
        width: projection,
        height,
        depth: room.depth,
        position: new Vector3(-room.width / 2 + projection / 2, y, 0),
      },
    ];

    for (const spec of specs) {
      this.createVisualBox(root, spec, material);
    }
  }

  private createCeilingDetails(
    root: TransformNode,
    room: ResolvedRoomOptions,
    materials: RoomMaterials,
  ): void {
    const y = room.height - 0.014;
    for (const xRatio of [-0.25, 0, 0.25]) {
      this.createVisualBox(
        root,
        {
          name: `${room.name}.visual.ceiling-grid.x.${String(xRatio)}`,
          width: 0.035,
          height: 0.028,
          depth: room.depth,
          position: new Vector3(room.width * xRatio, y, 0),
        },
        materials.ceilingGrid,
      );
    }
    for (const zRatio of [-0.3, 0, 0.3]) {
      this.createVisualBox(
        root,
        {
          name: `${room.name}.visual.ceiling-grid.z.${String(zRatio)}`,
          width: room.width,
          height: 0.028,
          depth: 0.035,
          position: new Vector3(0, y, room.depth * zRatio),
        },
        materials.ceilingGrid,
      );
    }
  }

  private createFixtures(
    root: TransformNode,
    room: ResolvedRoomOptions,
    materials: RoomMaterials,
  ): void {
    const positions: readonly Vector3[] = [
      new Vector3(-room.width * 0.25, room.height - 0.075, -room.depth * 0.23),
      new Vector3(room.width * 0.25, room.height - 0.075, -room.depth * 0.23),
      new Vector3(-room.width * 0.25, room.height - 0.075, room.depth * 0.23),
      new Vector3(room.width * 0.25, room.height - 0.075, room.depth * 0.23),
    ];

    positions.forEach((position, fixtureIndex) => {
      this.createVisualBox(
        root,
        {
          name: `${room.name}.visual.fixture.${String(fixtureIndex)}.housing`,
          width: 1.8,
          height: 0.09,
          depth: 0.5,
          position,
        },
        materials.fixtureHousing,
      );

      for (const tubeZ of [-0.12, 0.12]) {
        this.createVisualBox(
          root,
          {
            name: `${room.name}.visual.fixture.${String(fixtureIndex)}.tube.${String(tubeZ)}`,
            width: 1.45,
            height: 0.026,
            depth: 0.075,
            position: new Vector3(position.x, room.height - 0.133, position.z + tubeZ),
          },
          materials.fixtureEmitter,
        );
      }
    });
  }

  private createColliders(root: TransformNode, room: ResolvedRoomOptions): AbstractMesh[] {
    const overlap = 0.24;
    const halfWall = room.wallThickness / 2;
    const colliderSpecs: readonly BoxSpec[] = [
      {
        name: `${room.name}.collider.floor`,
        width: room.width + room.wallThickness * 2,
        height: overlap,
        depth: room.depth + room.wallThickness * 2,
        position: new Vector3(0, -overlap / 2, 0),
      },
      {
        name: `${room.name}.collider.ceiling`,
        width: room.width + room.wallThickness * 2,
        height: overlap,
        depth: room.depth + room.wallThickness * 2,
        position: new Vector3(0, room.height + overlap / 2, 0),
      },
      {
        name: `${room.name}.collider.wall.north`,
        width: room.width + room.wallThickness * 2,
        height: room.height + overlap * 2,
        depth: room.wallThickness,
        position: new Vector3(0, room.height / 2, room.depth / 2 + halfWall),
      },
      {
        name: `${room.name}.collider.wall.south`,
        width: room.width + room.wallThickness * 2,
        height: room.height + overlap * 2,
        depth: room.wallThickness,
        position: new Vector3(0, room.height / 2, -room.depth / 2 - halfWall),
      },
      {
        name: `${room.name}.collider.wall.east`,
        width: room.wallThickness,
        height: room.height + overlap * 2,
        depth: room.depth + room.wallThickness * 2,
        position: new Vector3(room.width / 2 + halfWall, room.height / 2, 0),
      },
      {
        name: `${room.name}.collider.wall.west`,
        width: room.wallThickness,
        height: room.height + overlap * 2,
        depth: room.depth + room.wallThickness * 2,
        position: new Vector3(-room.width / 2 - halfWall, room.height / 2, 0),
      },
    ];

    return colliderSpecs.map((spec) => {
      const collider = MeshBuilder.CreateBox(
        spec.name,
        { width: spec.width, height: spec.height, depth: spec.depth },
        this.scene,
      );
      collider.parent = root;
      collider.position.copyFrom(spec.position);
      collider.isVisible = false;
      collider.visibility = 0;
      collider.isPickable = false;
      collider.checkCollisions = true;
      return collider;
    });
  }

  private createLightProxy(root: TransformNode, room: ResolvedRoomOptions): PointLight {
    const light = new PointLight(
      `${room.name}.light.proxy`,
      new Vector3(0, room.height - 0.42, 0),
      this.scene,
    );
    light.parent = root;
    light.diffuse = new Color3(1, 0.84, 0.48);
    light.specular = new Color3(0.32, 0.27, 0.15);
    light.intensity = 0.9;
    light.range = Math.hypot(room.width, room.depth) * 0.72;
    light.shadowEnabled = false;
    return light;
  }

  private createVisualBox(root: TransformNode, spec: BoxSpec, material: StandardMaterial): Mesh {
    const mesh = MeshBuilder.CreateBox(
      spec.name,
      { width: spec.width, height: spec.height, depth: spec.depth },
      this.scene,
    );
    mesh.parent = root;
    mesh.position.copyFrom(spec.position);
    mesh.material = material;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    return mesh;
  }
}
