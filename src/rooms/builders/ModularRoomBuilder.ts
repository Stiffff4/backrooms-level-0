import type { Material } from '@babylonjs/core/Materials/material';
import { Vector3, Vector4 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import type { Scene } from '@babylonjs/core/scene';
import type {
  QuarterTurn,
  RoomDefinition,
  RoomInstance,
  RoomSocket,
} from '../../procedural/procedural.types';
import type { RoomMaterialSet } from '../RoomMaterialLibrary';
import type {
  BuiltModularRoom,
  RoomEntryTrigger,
  RoomLightAnchor,
} from '../rendering/rendering.types';

interface BoxRecipe {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly position: Vector3;
  readonly uvOffset?: UvOffset;
  readonly uvMetersPerTile?: number;
}

interface UvOffset {
  readonly u: number;
  readonly v: number;
}

interface Opening {
  readonly start: number;
  readonly end: number;
  readonly height: number;
}

interface WallSide {
  readonly id: 'north' | 'east' | 'south' | 'west';
  readonly length: number;
  readonly coordinate: number;
  readonly horizontal: boolean;
  readonly sockets: readonly RoomSocket[];
}

interface FixtureRecipe {
  readonly id: string;
  readonly position: Vector3;
  readonly enabled: boolean;
}

export const MODULAR_WALL_THICKNESS = 0.2;
const FLOOR_THICKNESS = 0.16;
const FLOOR_JOIN_OVERLAP = 0.12;
const TRIM_HEIGHT = 0.14;
const TRIM_DEPTH = 0.045;
const CEILING_GRID_STEP = 2;
const FIXTURE_LENGTH = 1.45;
const FIXTURE_WIDTH = 0.29;
const PLAYER_BASE_HEIGHT = 0.04;
const WALL_UV_METERS_PER_TILE = 1.8;
const CARPET_UV_METERS_PER_TILE = 2.4;
const CEILING_UV_METERS_PER_TILE = 2;
const TRIM_UV_METERS_PER_TILE = 1;
const FIXTURE_UV_METERS_PER_TILE = 0.5;
const COLUMN_UV_METERS_PER_TILE = 1.2;

/**
 * Builds one visual representation of a logical room. The room graph remains
 * authoritative: this class only interprets its transform and socket states.
 */
export class ModularRoomBuilder {
  public constructor(
    private readonly scene: Scene,
    private readonly materials: RoomMaterialSet,
  ) {}

  public build(instance: RoomInstance, definition: RoomDefinition): BuiltModularRoom {
    if (instance.definitionId !== definition.id) {
      throw new Error(
        `Room ${instance.id} references ${instance.definitionId}, not definition ${definition.id}.`,
      );
    }

    const root = new TransformNode(`room.${instance.id}`, this.scene);
    root.position.set(
      instance.worldTransform.position.x,
      instance.worldTransform.position.y,
      instance.worldTransform.position.z,
    );
    root.rotation.y = this.quarterTurnRadians(instance.worldTransform.rotationQuarterTurns);

    let disposed = false;
    try {
      const architecture = this.createArchitecture(instance, definition, root);
      const ceilingDetails = this.createCeilingGrid(instance, definition, root);
      const columns = this.createColumns(instance, definition, root);
      const architecturalDetails = this.createArchitecturalDetails(instance, definition, root);
      const spatialAnomaly = this.createSpatialAnomaly(instance, definition, root);
      const fixtureBuild = this.createFixtures(instance, definition, root);

      const meshes = Object.freeze([
        ...architecture.meshes,
        ...ceilingDetails,
        ...columns.meshes,
        ...architecturalDetails.meshes,
        spatialAnomaly.mesh,
        ...fixtureBuild.meshes,
      ]);
      const colliders = Object.freeze([
        ...architecture.colliders,
        ...columns.colliders,
        ...architecturalDetails.colliders,
      ]);
      const trigger = this.createTrigger(instance, definition);
      const triangleCount = meshes.reduce(
        (total, mesh) => total + Math.floor(mesh.getTotalIndices() / 3),
        0,
      );

      root.onDisposeObservable.addOnce(() => {
        disposed = true;
      });

      return {
        id: instance.id,
        root,
        definition,
        instance,
        meshes,
        colliders,
        trigger,
        lightAnchors: fixtureBuild.anchors,
        spatialAnomaly,
        triangleCount,
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

  private createArchitecture(
    instance: RoomInstance,
    definition: RoomDefinition,
    root: TransformNode,
  ): { readonly meshes: readonly AbstractMesh[]; readonly colliders: readonly AbstractMesh[] } {
    const { width, depth, height } = definition.footprint;
    const floor = this.createBox(
      {
        name: `${instance.id}.floor`,
        width,
        height: FLOOR_THICKNESS,
        depth,
        position: new Vector3(0, -FLOOR_THICKNESS / 2, 0),
        uvOffset: this.createUvOffset(instance.seed, 11),
      },
      this.materials.carpet,
    );
    floor.parent = root;
    floor.checkCollisions = false;

    // Keep the visible carpet exactly inside the room footprint so adjacent
    // rooms never render coplanar floor surfaces. A slightly oversized hidden
    // collider bridges the numerical seam without introducing a visible join.
    const floorCollider = this.createBox(
      {
        name: `${instance.id}.floor-collider`,
        width: width + FLOOR_JOIN_OVERLAP,
        height: FLOOR_THICKNESS,
        depth: depth + FLOOR_JOIN_OVERLAP,
        position: new Vector3(0, -FLOOR_THICKNESS / 2, 0),
      },
      null,
    );
    floorCollider.parent = root;
    floorCollider.isVisible = false;
    floorCollider.checkCollisions = true;

    const ceiling = this.createBox(
      {
        name: `${instance.id}.ceiling`,
        width,
        height: 0.12,
        depth,
        position: new Vector3(0, height + 0.06, 0),
        uvOffset: this.createUvOffset(instance.seed, 17),
      },
      this.materials.ceiling,
    );
    ceiling.parent = root;
    ceiling.checkCollisions = true;

    const wallBoxes: Mesh[] = [];
    const trimBoxes: Mesh[] = [];
    for (const side of this.getWallSides(definition)) {
      const openings = this.getConnectedOpenings(instance, side);
      this.appendWallSide(instance.id, instance.seed, height, side, openings, wallBoxes, trimBoxes);
    }

    const wallMaterial = this.materials.wall;
    for (const wall of wallBoxes) {
      wall.material = wallMaterial;
    }
    for (const trim of trimBoxes) {
      trim.material = this.materials.trim;
    }

    const walls = this.mergeMeshes(`${instance.id}.walls`, wallBoxes, root);
    const trim = this.mergeMeshes(`${instance.id}.trim`, trimBoxes, root);
    walls.checkCollisions = true;

    return {
      meshes: Object.freeze([floor, ceiling, walls, trim]),
      colliders: Object.freeze([floorCollider, ceiling, walls]),
    };
  }

  private getWallSides(definition: RoomDefinition): readonly WallSide[] {
    const { width, depth } = definition.footprint;
    const socketsFor = (x: number, z: number): readonly RoomSocket[] =>
      definition.sockets.filter((socket) => {
        const forwardX = socket.localForward.x;
        const forwardZ = socket.localForward.z;
        return x === 0 ? Math.sign(forwardZ) === z : Math.sign(forwardX) === x;
      });

    return [
      {
        id: 'north',
        length: width,
        coordinate: depth / 2,
        horizontal: true,
        sockets: socketsFor(0, 1),
      },
      {
        id: 'east',
        length: depth,
        coordinate: width / 2,
        horizontal: false,
        sockets: socketsFor(1, 0),
      },
      {
        id: 'south',
        length: width,
        coordinate: -depth / 2,
        horizontal: true,
        sockets: socketsFor(0, -1),
      },
      {
        id: 'west',
        length: depth,
        coordinate: -width / 2,
        horizontal: false,
        sockets: socketsFor(-1, 0),
      },
    ];
  }

  private getConnectedOpenings(instance: RoomInstance, side: WallSide): readonly Opening[] {
    const halfLength = side.length / 2;
    const connected = side.sockets
      .filter((socket) => instance.socketStates[socket.id]?.status === 'connected')
      .map((socket): Opening => {
        const center = side.horizontal ? socket.localPosition.x : socket.localPosition.z;
        return {
          start: Math.max(-halfLength, center - socket.width / 2),
          end: Math.min(halfLength, center + socket.width / 2),
          height: socket.height,
        };
      })
      .filter((opening) => opening.end - opening.start > 0.01)
      .sort((left, right) => left.start - right.start);

    const merged: Opening[] = [];
    for (const opening of connected) {
      const previous = merged.at(-1);
      if (previous === undefined || opening.start > previous.end + 0.001) {
        merged.push(opening);
      } else {
        merged[merged.length - 1] = {
          start: previous.start,
          end: Math.max(previous.end, opening.end),
          height: Math.max(previous.height, opening.height),
        };
      }
    }
    return merged;
  }

  private appendWallSide(
    roomId: string,
    roomSeed: number,
    roomHeight: number,
    side: WallSide,
    openings: readonly Opening[],
    wallBoxes: Mesh[],
    trimBoxes: Mesh[],
  ): void {
    let cursor = -side.length / 2;
    let segmentIndex = 0;
    const uvOffset = this.createUvOffset(roomSeed, this.getWallUvSalt(side));
    for (const opening of openings) {
      if (opening.start > cursor) {
        this.appendFullHeightWall(
          roomId,
          roomHeight,
          side,
          cursor,
          opening.start,
          segmentIndex,
          wallBoxes,
          trimBoxes,
          uvOffset,
        );
        segmentIndex += 1;
      }

      const lintelHeight = roomHeight - Math.min(opening.height, roomHeight);
      if (lintelHeight > 0.01) {
        wallBoxes.push(
          this.createSideBox(
            `${roomId}.${side.id}.lintel.${segmentIndex}`,
            side,
            opening.start,
            opening.end,
            lintelHeight,
            roomHeight - lintelHeight / 2,
            MODULAR_WALL_THICKNESS,
            uvOffset,
            WALL_UV_METERS_PER_TILE,
          ),
        );
      }
      cursor = Math.max(cursor, opening.end);
      segmentIndex += 1;
    }

    if (cursor < side.length / 2) {
      this.appendFullHeightWall(
        roomId,
        roomHeight,
        side,
        cursor,
        side.length / 2,
        segmentIndex,
        wallBoxes,
        trimBoxes,
        uvOffset,
      );
    }
  }

  private appendFullHeightWall(
    roomId: string,
    roomHeight: number,
    side: WallSide,
    start: number,
    end: number,
    index: number,
    wallBoxes: Mesh[],
    trimBoxes: Mesh[],
    uvOffset: UvOffset,
  ): void {
    if (end - start <= 0.01) {
      return;
    }

    wallBoxes.push(
      this.createSideBox(
        `${roomId}.${side.id}.wall.${index}`,
        side,
        start,
        end,
        roomHeight,
        roomHeight / 2,
        MODULAR_WALL_THICKNESS,
        uvOffset,
        WALL_UV_METERS_PER_TILE,
      ),
    );
    trimBoxes.push(
      this.createSideBox(
        `${roomId}.${side.id}.trim.${index}`,
        side,
        start,
        end,
        TRIM_HEIGHT,
        TRIM_HEIGHT / 2,
        MODULAR_WALL_THICKNESS + TRIM_DEPTH,
        uvOffset,
        TRIM_UV_METERS_PER_TILE,
      ),
    );
  }

  private createSideBox(
    name: string,
    side: WallSide,
    start: number,
    end: number,
    height: number,
    centerY: number,
    thickness: number,
    uvOffset: UvOffset,
    uvMetersPerTile: number,
  ): Mesh {
    const length = end - start;
    const center = (start + end) / 2;
    // `side.coordinate` is the room boundary. Pull every wall, lintel and trim
    // fully into its owning footprint. Adjacent rooms therefore meet at a
    // shared face instead of drawing overlapping coplanar boxes.
    const insetCoordinate = side.coordinate - Math.sign(side.coordinate) * (thickness / 2);
    return this.createBox(
      {
        name,
        width: side.horizontal ? length : thickness,
        height,
        depth: side.horizontal ? thickness : length,
        position: new Vector3(
          side.horizontal ? center : insetCoordinate,
          centerY,
          side.horizontal ? insetCoordinate : center,
        ),
        uvOffset,
        uvMetersPerTile,
      },
      null,
    );
  }

  private createCeilingGrid(
    instance: RoomInstance,
    definition: RoomDefinition,
    root: TransformNode,
  ): readonly AbstractMesh[] {
    const { width, depth, height } = definition.footprint;
    const boxes: Mesh[] = [];
    const uvOffset = this.createUvOffset(instance.seed, 71);
    let gridIndex = 0;
    for (let x = -width / 2 + CEILING_GRID_STEP; x < width / 2; x += CEILING_GRID_STEP) {
      boxes.push(
        this.createBox(
          {
            name: `${root.name}.ceiling-grid.x`,
            width: 0.025,
            height: 0.025,
            depth,
            position: new Vector3(x, height - 0.025, 0),
            uvOffset: {
              u: uvOffset.u + gridIndex,
              v: uvOffset.v,
            },
          },
          this.materials.ceilingGrid,
        ),
      );
      gridIndex += 1;
    }
    for (let z = -depth / 2 + CEILING_GRID_STEP; z < depth / 2; z += CEILING_GRID_STEP) {
      boxes.push(
        this.createBox(
          {
            name: `${root.name}.ceiling-grid.z`,
            width,
            height: 0.025,
            depth: 0.025,
            position: new Vector3(0, height - 0.025, z),
            uvOffset: {
              u: uvOffset.u + gridIndex,
              v: uvOffset.v,
            },
          },
          this.materials.ceilingGrid,
        ),
      );
      gridIndex += 1;
    }

    if (boxes.length === 0) {
      return Object.freeze([]);
    }
    return Object.freeze([this.mergeMeshes(`${root.name}.ceiling-grid`, boxes, root)]);
  }

  private createColumns(
    instance: RoomInstance,
    definition: RoomDefinition,
    root: TransformNode,
  ): { readonly meshes: readonly AbstractMesh[]; readonly colliders: readonly AbstractMesh[] } {
    if (definition.geometryRecipe.columnLayout === 'none') {
      return { meshes: Object.freeze([]), colliders: Object.freeze([]) };
    }

    const { width, depth, height } = definition.footprint;
    const insetX = Math.max(1.5, width * 0.22);
    const insetZ = Math.max(1.5, depth * 0.22);
    const positions = definition.tags.includes('pillar-grid')
      ? this.createPillarGridPositions(definition)
      : definition.geometryRecipe.columnLayout === 'sparse'
        ? [new Vector3(-insetX, height / 2, 0), new Vector3(insetX, height / 2, 0)]
        : [
            new Vector3(-insetX, height / 2, -insetZ),
            new Vector3(insetX, height / 2, -insetZ),
            new Vector3(-insetX, height / 2, insetZ),
            new Vector3(insetX, height / 2, insetZ),
          ];
    const boxes = positions.map((position, index) =>
      this.createBox(
        {
          name: `${instance.id}.column.${String(index)}`,
          width: 0.5,
          height,
          depth: 0.5,
          position,
          uvOffset: this.createUvOffset(instance.seed, 101 + index),
        },
        this.materials.column,
      ),
    );
    const columns = this.mergeMeshes(`${instance.id}.columns`, boxes, root);
    columns.checkCollisions = true;
    return {
      meshes: Object.freeze([columns]),
      colliders: Object.freeze([columns]),
    };
  }

  private createPillarGridPositions(definition: RoomDefinition): readonly Vector3[] {
    const { width, depth, height } = definition.footprint;
    const xPositions = [-width * 0.22, width * 0.22];
    const zPositions = definition.tags.includes('large')
      ? [-depth * 0.27, 0, depth * 0.27]
      : [-depth * 0.23, depth * 0.23];
    return Object.freeze(
      xPositions.flatMap((x) => zPositions.map((z) => new Vector3(x, height / 2, z))),
    );
  }

  private createArchitecturalDetails(
    instance: RoomInstance,
    definition: RoomDefinition,
    root: TransformNode,
  ): { readonly meshes: readonly AbstractMesh[]; readonly colliders: readonly AbstractMesh[] } {
    if (!definition.tags.includes('arch')) {
      return { meshes: Object.freeze([]), colliders: Object.freeze([]) };
    }

    const { width, depth, height } = definition.footprint;
    const boxes: Mesh[] = [];
    const frameSpacing = 3.6;
    const frameCount = Math.max(2, Math.floor((depth - 2) / frameSpacing));
    const firstZ = -((frameCount - 1) * frameSpacing) / 2;
    const openingWidth = width - 0.72;
    const archSegments = 7;
    const segmentWidth = openingWidth / archSegments;
    for (let frame = 0; frame < frameCount; frame += 1) {
      const z = firstZ + frame * frameSpacing;
      const uvSalt = 350 + frame * 17;
      for (let segment = 0; segment < archSegments; segment += 1) {
        const normalized = Math.abs((segment + 0.5) / archSegments - 0.5) * 2;
        const underside = 2.38 + (1 - normalized * normalized) * 0.46;
        const blockHeight = Math.max(0.18, height - underside);
        boxes.push(
          this.createBox(
            {
              name: `${instance.id}.arch.${frame}.voussoir.${segment}`,
              width: segmentWidth + 0.015,
              height: blockHeight,
              depth: 0.34,
              position: new Vector3(
                -openingWidth / 2 + segmentWidth * (segment + 0.5),
                underside + blockHeight / 2,
                z,
              ),
              uvOffset: this.createUvOffset(instance.seed, uvSalt + segment),
            },
            this.materials.column,
          ),
        );
      }
      for (const side of [-1, 1] as const) {
        boxes.push(
          this.createBox(
            {
              name: `${instance.id}.arch.${frame}.pier.${side}`,
              width: 0.36,
              height: 2.42,
              depth: 0.42,
              position: new Vector3(side * (width / 2 - 0.2), 1.21, z),
              uvOffset: this.createUvOffset(instance.seed, uvSalt + 11 + side),
            },
            this.materials.column,
          ),
        );
      }
    }
    const arches = this.mergeMeshes(`${instance.id}.arches`, boxes, root);
    arches.checkCollisions = true;
    return {
      meshes: Object.freeze([arches]),
      colliders: Object.freeze([arches]),
    };
  }

  private createSpatialAnomaly(
    instance: RoomInstance,
    definition: RoomDefinition,
    root: TransformNode,
  ): BuiltModularRoom['spatialAnomaly'] {
    const { width, depth, height } = definition.footprint;
    const lateralOffset = ((this.hash(instance.seed, 907) % 3) - 1) * Math.min(1.1, width * 0.12);
    const mesh = this.createBox(
      {
        name: `${instance.id}.anomaly.ceiling-shift`,
        width: Math.min(5.2, Math.max(2.2, width * 0.62)),
        height: 0.22,
        depth: Math.min(1.8, Math.max(0.75, depth * 0.16)),
        position: new Vector3(lateralOffset, height - 0.13, 0),
        uvOffset: this.createUvOffset(instance.seed, 907),
      },
      this.materials.ceiling,
    );
    mesh.parent = root;
    mesh.checkCollisions = false;
    mesh.isPickable = false;
    mesh.isVisible = false;
    mesh.setEnabled(false);
    return Object.freeze({ kind: 'ceiling-shift', mesh });
  }

  private createFixtures(
    instance: RoomInstance,
    definition: RoomDefinition,
    root: TransformNode,
  ): { readonly meshes: readonly AbstractMesh[]; readonly anchors: readonly RoomLightAnchor[] } {
    const fixtures = this.getFixtureRecipes(instance, definition);
    const housingBoxes: Mesh[] = [];
    const onBoxes: Mesh[] = [];
    const offBoxes: Mesh[] = [];
    const onColorSlices = new Map<string, { readonly offset: number; readonly length: number }>();
    let onColorLength = 0;
    for (const [fixtureIndex, fixture] of fixtures.entries()) {
      const uvOffset = this.createUvOffset(instance.seed, 211 + fixtureIndex);
      housingBoxes.push(
        this.createBox(
          {
            name: `${fixture.id}.housing`,
            width: FIXTURE_WIDTH + 0.1,
            height: 0.075,
            depth: FIXTURE_LENGTH + 0.12,
            position: fixture.position.add(new Vector3(0, 0.035, 0)),
            uvOffset,
          },
          this.materials.fixtureHousing,
        ),
      );
      const emitter = this.createBox(
        {
          name: `${fixture.id}.emitter`,
          width: FIXTURE_WIDTH,
          height: 0.028,
          depth: FIXTURE_LENGTH,
          position: fixture.position.add(new Vector3(0, -0.012, 0)),
          uvOffset,
        },
        fixture.enabled ? this.materials.fixtureEmitter : this.materials.fixtureEmitterOff,
      );
      if (fixture.enabled) {
        const colorLength = emitter.getTotalVertices() * 4;
        const colors = new Float32Array(colorLength);
        colors.fill(1);
        emitter.setVerticesData(VertexBuffer.ColorKind, colors, true);
        onColorSlices.set(
          fixture.id,
          Object.freeze({ offset: onColorLength, length: colorLength }),
        );
        onColorLength += colorLength;
      }
      (fixture.enabled ? onBoxes : offBoxes).push(emitter);
    }

    const meshes: AbstractMesh[] = [];
    const housing = this.mergeMeshes(`${instance.id}.fixtures.housing`, housingBoxes, root);
    meshes.push(housing);
    const onEmitters =
      onBoxes.length > 0 ? this.mergeMeshes(`${instance.id}.fixtures.on`, onBoxes, root) : housing;
    if (onBoxes.length > 0) {
      if (!onEmitters.isVerticesDataPresent(VertexBuffer.ColorKind)) {
        throw new Error(`Merged fixture emitters lost vertex colors for ${instance.id}.`);
      }
      const mergedColors = onEmitters.getVerticesData(VertexBuffer.ColorKind);
      if (mergedColors === null || mergedColors.length !== onColorLength) {
        throw new Error(`Merged fixture color slices are invalid for ${instance.id}.`);
      }
      onEmitters.markVerticesDataAsUpdatable(VertexBuffer.ColorKind, true);
      meshes.push(onEmitters);
    }
    const offEmitters =
      offBoxes.length > 0
        ? this.mergeMeshes(`${instance.id}.fixtures.off`, offBoxes, root)
        : housing;
    if (offBoxes.length > 0) {
      meshes.push(offEmitters);
    }

    const anchors: RoomLightAnchor[] = fixtures.map((fixture, fixtureIndex) => {
      const node = new TransformNode(`${fixture.id}.light-anchor`, this.scene);
      node.parent = root;
      node.position.copyFrom(fixture.position);
      const colorSlice = onColorSlices.get(fixture.id);
      return Object.freeze({
        id: fixture.id,
        roomId: instance.id,
        fixtureIndex,
        flickerSeed: this.hash(instance.seed, 4099 + fixtureIndex),
        node,
        localPosition: fixture.position.clone(),
        emitter: fixture.enabled ? onEmitters : offEmitters,
        emitterBinding:
          fixture.enabled && colorSlice
            ? Object.freeze({
                mesh: onEmitters,
                colorOffset: colorSlice.offset,
                colorLength: colorSlice.length,
              })
            : null,
        enabled: fixture.enabled,
        lightingProfile: definition.lightingProfile,
      });
    });

    return {
      meshes: Object.freeze(meshes),
      anchors: Object.freeze(anchors),
    };
  }

  private getFixtureRecipes(
    instance: RoomInstance,
    definition: RoomDefinition,
  ): readonly FixtureRecipe[] {
    const { width, depth, height } = definition.footprint;
    const columns = Math.max(1, Math.floor(width / 4));
    const rows = Math.max(1, Math.floor(depth / 3.4));
    const spacingX = width / columns;
    const spacingZ = depth / rows;
    const fixtures: FixtureRecipe[] = [];
    let index = 0;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        // Every fluorescent fixture remains powered. Variation is expressed by
        // brief deterministic flicker profiles rather than permanently dark
        // tubes, matching the classic Level 0 reference.
        const enabled = true;
        fixtures.push({
          id: `${instance.id}.fixture.${String(index)}`,
          position: new Vector3(
            -width / 2 + spacingX * (column + 0.5),
            height - 0.11,
            -depth / 2 + spacingZ * (row + 0.5),
          ),
          enabled,
        });
        index += 1;
      }
    }
    return fixtures;
  }

  private createTrigger(instance: RoomInstance, definition: RoomDefinition): RoomEntryTrigger {
    const center = new Vector3(
      instance.worldTransform.position.x,
      instance.worldTransform.position.y + definition.footprint.height / 2,
      instance.worldTransform.position.z,
    );
    const rotationQuarterTurns = instance.worldTransform.rotationQuarterTurns;
    return Object.freeze({
      roomId: instance.id,
      center,
      footprint: definition.footprint,
      rotationQuarterTurns,
      contains: (position: Vector3): boolean => {
        const deltaX = position.x - center.x;
        const deltaZ = position.z - center.z;
        const local = this.inverseRotate(deltaX, deltaZ, rotationQuarterTurns);
        const feet = center.y - definition.footprint.height / 2;
        return (
          Math.abs(local.x) <= definition.footprint.width / 2 + 0.04 &&
          Math.abs(local.z) <= definition.footprint.depth / 2 + 0.04 &&
          position.y >= feet - 0.5 &&
          position.y <= feet + definition.footprint.height + 0.5
        );
      },
      translate: (delta: Vector3): void => {
        center.addInPlace(delta);
      },
    });
  }

  private createBox(recipe: BoxRecipe, material: Material | null): Mesh {
    const uvMetersPerTile =
      recipe.uvMetersPerTile ?? (material === null ? undefined : this.getUvMetersPerTile(material));
    const faceUV =
      uvMetersPerTile === undefined
        ? undefined
        : this.createPhysicalBoxUvs(recipe, uvMetersPerTile);
    const dimensions = { width: recipe.width, height: recipe.height, depth: recipe.depth };
    const mesh = MeshBuilder.CreateBox(
      recipe.name,
      faceUV === undefined ? dimensions : { ...dimensions, faceUV },
      this.scene,
    );
    mesh.position.copyFrom(recipe.position);
    mesh.material = material;
    mesh.isPickable = false;
    return mesh;
  }

  private mergeMeshes(name: string, sources: Mesh[], root: TransformNode): Mesh {
    const shouldPreserveUvs = sources.every((source) =>
      source.isVerticesDataPresent(VertexBuffer.UVKind),
    );
    const merged = Mesh.MergeMeshes(sources, true, true, undefined, false, false);
    if (merged === null) {
      for (const source of sources) {
        source.dispose(false, false);
      }
      throw new Error(`Could not merge geometry for ${name}.`);
    }
    if (shouldPreserveUvs && !merged.isVerticesDataPresent(VertexBuffer.UVKind)) {
      merged.dispose(false, false);
      throw new Error(`Merged geometry lost physical UVs for ${name}.`);
    }
    merged.name = name;
    merged.id = name;
    merged.isPickable = false;
    merged.parent = root;
    return merged;
  }

  private createPhysicalBoxUvs(recipe: BoxRecipe, metersPerTile: number): Vector4[] {
    const offset = recipe.uvOffset ?? { u: 0, v: 0 };
    const xStart = recipe.position.x - recipe.width / 2;
    const yStart = recipe.position.y - recipe.height / 2;
    const zStart = recipe.position.z - recipe.depth / 2;
    const rect = (uStart: number, vStart: number, uLength: number, vLength: number): Vector4 =>
      new Vector4(
        offset.u + uStart / metersPerTile,
        offset.v + vStart / metersPerTile,
        offset.u + (uStart + uLength) / metersPerTile,
        offset.v + (vStart + vLength) / metersPerTile,
      );

    return [
      rect(xStart, yStart, recipe.width, recipe.height),
      rect(xStart, yStart, recipe.width, recipe.height),
      rect(zStart, yStart, recipe.depth, recipe.height),
      rect(zStart, yStart, recipe.depth, recipe.height),
      rect(xStart, zStart, recipe.width, recipe.depth),
      rect(xStart, zStart, recipe.width, recipe.depth),
    ];
  }

  private getUvMetersPerTile(material: Material): number {
    if (material === this.materials.carpet || material === this.materials.carpetWet) {
      return CARPET_UV_METERS_PER_TILE;
    }
    if (material === this.materials.ceiling) {
      return CEILING_UV_METERS_PER_TILE;
    }
    if (material === this.materials.trim || material === this.materials.ceilingGrid) {
      return TRIM_UV_METERS_PER_TILE;
    }
    if (
      material === this.materials.fixtureHousing ||
      material === this.materials.fixtureEmitter ||
      material === this.materials.fixtureEmitterOff
    ) {
      return FIXTURE_UV_METERS_PER_TILE;
    }
    if (material === this.materials.column) {
      return COLUMN_UV_METERS_PER_TILE;
    }
    return WALL_UV_METERS_PER_TILE;
  }

  private createUvOffset(seed: number, salt: number): UvOffset {
    return Object.freeze({
      u: (this.hash(seed, salt) % 1024) / 256,
      v: (this.hash(seed, salt + 8191) % 1024) / 256,
    });
  }

  private getWallUvSalt(side: WallSide): number {
    switch (side.id) {
      case 'north':
        return 31;
      case 'east':
        return 37;
      case 'south':
        return 41;
      case 'west':
        return 43;
    }
  }

  private quarterTurnRadians(rotation: QuarterTurn): number {
    return rotation * (Math.PI / 2);
  }

  private inverseRotate(x: number, z: number, rotation: QuarterTurn): { x: number; z: number } {
    switch (rotation) {
      case 0:
        return { x, z };
      case 1:
        return { x: -z, z: x };
      case 2:
        return { x: -x, z: -z };
      case 3:
        return { x: z, z: -x };
    }
  }

  private hash(seed: number, salt: number): number {
    let value = (seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
    value ^= value >>> 16;
    value = Math.imul(value, 0x7feb352d);
    value ^= value >>> 15;
    value = Math.imul(value, 0x846ca68b);
    return (value ^ (value >>> 16)) >>> 0;
  }
}

export const MODULAR_PLAYER_BASE_HEIGHT = PLAYER_BASE_HEIGHT;
