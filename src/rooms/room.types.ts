import type { PointLight } from '@babylonjs/core/Lights/pointLight';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';

export interface RoomDimensions {
  readonly width: number;
  readonly depth: number;
  readonly height: number;
}

export interface SimpleRoomBuildOptions {
  readonly name?: string;
  readonly center?: Vector3;
  /** Offset of the player's collider base (feet), not camera eye height. */
  readonly spawnOffset?: Vector3;
  readonly width?: number;
  readonly depth?: number;
  readonly height?: number;
  readonly wallThickness?: number;
}

export interface BuiltRoom {
  readonly root: TransformNode;
  readonly colliders: readonly AbstractMesh[];
  readonly light: PointLight;
  readonly center: Vector3;
  readonly spawnPoint: Vector3;
  readonly dimensions: RoomDimensions;
  dispose(): void;
}
