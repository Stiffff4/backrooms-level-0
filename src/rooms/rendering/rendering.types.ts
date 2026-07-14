import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type {
  GridFootprint,
  QuarterTurn,
  RoomDefinition,
  RoomInstance,
} from '../../procedural/procedural.types';

export interface FixtureEmitterBinding {
  readonly mesh: Mesh;
  /** Offset and length in RGBA float components inside the merged color buffer. */
  readonly colorOffset: number;
  readonly colorLength: number;
}

export interface RoomLightAnchor {
  readonly id: string;
  readonly roomId: string;
  readonly fixtureIndex: number;
  readonly flickerSeed: number;
  readonly node: TransformNode;
  readonly localPosition: Vector3;
  readonly emitter: AbstractMesh;
  readonly emitterBinding: FixtureEmitterBinding | null;
  readonly enabled: boolean;
  readonly lightingProfile: string;
}

export interface RoomEntryTrigger {
  readonly roomId: string;
  readonly center: Vector3;
  readonly footprint: GridFootprint;
  readonly rotationQuarterTurns: QuarterTurn;
  contains(position: Vector3): boolean;
  translate(delta: Vector3): void;
}

export interface BuiltModularRoom {
  readonly id: string;
  readonly root: TransformNode;
  readonly definition: RoomDefinition;
  readonly instance: RoomInstance;
  readonly meshes: readonly AbstractMesh[];
  readonly colliders: readonly AbstractMesh[];
  readonly trigger: RoomEntryTrigger;
  readonly lightAnchors: readonly RoomLightAnchor[];
  readonly triangleCount: number;
  dispose(): void;
}

export interface ModularWorldMetrics {
  /** Backwards-compatible alias for activeRoomCount. */
  readonly roomCount: number;
  readonly activeRoomCount: number;
  readonly pooledRoomCount: number;
  readonly meshCount: number;
  readonly colliderCount: number;
  readonly triggerCount: number;
  readonly lightAnchorCount: number;
  readonly materialCount: number;
  readonly triangleCount: number;
}

export interface RoomTransition {
  readonly changed: boolean;
  readonly previousRoomId: string | null;
  readonly roomId: string | null;
}
