import type { Camera } from '@babylonjs/core/Cameras/camera';
import { Frustum } from '@babylonjs/core/Maths/math.frustum';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Plane } from '@babylonjs/core/Maths/math.plane';
import type { Scene } from '@babylonjs/core/scene';
import type { ModularWorld } from '../rooms/ModularWorld';
import type { BuiltModularRoom, RoomEntryTrigger } from '../rooms/rendering/rendering.types';
import type { RoomGraph, RoomId, RoomSocket, Vector3Like } from '../procedural/procedural.types';

const DEFAULT_SAFETY_DISTANCE = 8;
const DEFAULT_FOG_END = 32;
const DEFAULT_ENTRANCE_VISIBILITY_PADDING = 0.35;

export interface StreamingVisibilityGuardConfig {
  /** Horizontal distance from a loaded room footprint that prevents unloading. */
  readonly safetyDistance?: number;
  /** Maximum distance at which an entrance can reveal the connected room. */
  readonly fogEnd?: number;
  /** Extra radius around a socket used for conservative frustum checks. */
  readonly entranceVisibilityPadding?: number;
}

export interface StreamingVisibilityGuardInput {
  readonly camera: Camera;
  readonly playerPosition: Vector3Like;
}

export interface StreamingVisibilityResult {
  /** Loaded rooms protected by the camera frustum or the safety distance. */
  readonly visibleRoomIds: readonly RoomId[];
  /** Logical neighbors protected because their connecting entrance can be seen. */
  readonly visibleEntranceRoomIds: readonly RoomId[];
  readonly loadedRoomCount: number;
  readonly frustumRoomCount: number;
  readonly safetyRoomCount: number;
  readonly visibleEntranceCount: number;
}

export interface StreamingVisibilityRetentionState {
  readonly materializedRoomIds: Iterable<RoomId>;
  readonly retainedRoomIds?: Iterable<RoomId>;
}

export interface StreamingVisibilityVerification {
  readonly missingRoomIds: readonly RoomId[];
  readonly violationCount: number;
  readonly totalViolationCount: number;
}

interface ResolvedConfig {
  readonly safetyDistance: number;
  fogEnd: number;
  readonly entranceVisibilityPadding: number;
}

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite non-negative number.`);
  }
}

function assertFinitePositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a finite positive number.`);
  }
}

function horizontalDistanceToTrigger(position: Vector3Like, trigger: RoomEntryTrigger): number {
  const swapsAxes = trigger.rotationQuarterTurns % 2 !== 0;
  const halfWidth = (swapsAxes ? trigger.footprint.depth : trigger.footprint.width) / 2;
  const halfDepth = (swapsAxes ? trigger.footprint.width : trigger.footprint.depth) / 2;
  const outsideX = Math.max(0, Math.abs(position.x - trigger.center.x) - halfWidth);
  const outsideZ = Math.max(0, Math.abs(position.z - trigger.center.z) - halfDepth);
  return Math.hypot(outsideX, outsideZ);
}

function isSphereInFrustum(center: Vector3, radius: number, planes: readonly Plane[]): boolean {
  for (const plane of planes) {
    if (Vector3.Dot(plane.normal, center) + plane.d < -radius) {
      return false;
    }
  }
  return true;
}

/**
 * Computes the streaming protection set from the currently materialized room views.
 * It is intentionally pull-based: one deterministic pass per update, with no mesh or
 * room observers that could grow alongside the logical graph.
 */
export class StreamingVisibilityGuard {
  private readonly roomOrder = new Map<RoomId, number>();
  private readonly graphRoomIds = new Set<RoomId>();
  private readonly config: ResolvedConfig;
  private totalViolations = 0;
  private lastViolations: readonly RoomId[] = Object.freeze([]);

  public constructor(
    graph: RoomGraph,
    private readonly world: ModularWorld,
    private readonly scene: Scene,
    config: StreamingVisibilityGuardConfig = {},
  ) {
    const sceneFogEnd =
      Number.isFinite(scene.fogEnd) && scene.fogEnd > 0 ? scene.fogEnd : DEFAULT_FOG_END;
    const resolved: ResolvedConfig = {
      safetyDistance: config.safetyDistance ?? DEFAULT_SAFETY_DISTANCE,
      fogEnd: config.fogEnd ?? sceneFogEnd,
      entranceVisibilityPadding:
        config.entranceVisibilityPadding ?? DEFAULT_ENTRANCE_VISIBILITY_PADDING,
    };
    assertFiniteNonNegative(resolved.safetyDistance, 'safetyDistance');
    assertFinitePositive(resolved.fogEnd, 'fogEnd');
    assertFiniteNonNegative(resolved.entranceVisibilityPadding, 'entranceVisibilityPadding');
    this.config = resolved;

    graph.rooms.forEach((room, index) => {
      if (this.graphRoomIds.has(room.id)) {
        throw new Error(`StreamingVisibilityGuard requires unique room ids: ${room.id}.`);
      }
      this.graphRoomIds.add(room.id);
      this.roomOrder.set(room.id, index);
    });
  }

  /** Cumulative number of missing protected IDs observed by verifyRetention. */
  public get violationCount(): number {
    return this.totalViolations;
  }

  public get lastViolationRoomIds(): readonly RoomId[] {
    return this.lastViolations;
  }

  public get fogEnd(): number {
    return this.config.fogEnd;
  }

  public setFogEnd(fogEnd: number): void {
    assertFinitePositive(fogEnd, 'fogEnd');
    this.config.fogEnd = fogEnd;
  }

  public evaluate(input: StreamingVisibilityGuardInput): StreamingVisibilityResult {
    const frustumPlanes = Frustum.GetPlanes(input.camera.getTransformationMatrix());
    const visibleRoomIds = new Set<RoomId>();
    const visibleEntranceRoomIds = new Set<RoomId>();
    let frustumRoomCount = 0;
    let safetyRoomCount = 0;

    const loadedViews = [...this.world.roomViews].sort((left, right) =>
      this.compareRoomIds(left.id, right.id),
    );
    for (const view of loadedViews) {
      this.assertKnownView(view);
      const distanceToRoom = horizontalDistanceToTrigger(input.playerPosition, view.trigger);
      // Geometry behind the opaque end of the fog cannot be visually observed;
      // keeping it pinned would let a full preload bubble block the next swap.
      const isInFrustum =
        distanceToRoom <= this.config.fogEnd && this.isViewActiveInFrustum(view, frustumPlanes);
      const isInsideSafetyDistance = distanceToRoom <= this.config.safetyDistance;

      if (isInFrustum) {
        frustumRoomCount += 1;
      }
      if (isInsideSafetyDistance) {
        safetyRoomCount += 1;
      }
      if (isInFrustum || isInsideSafetyDistance) {
        visibleRoomIds.add(view.id);
      }

      this.collectVisibleEntranceNeighbors(
        view,
        input.playerPosition,
        frustumPlanes,
        visibleEntranceRoomIds,
      );
    }

    const sortedVisibleRooms = Object.freeze(
      [...visibleRoomIds].sort((left, right) => this.compareRoomIds(left, right)),
    );
    const sortedEntranceRooms = Object.freeze(
      [...visibleEntranceRoomIds].sort((left, right) => this.compareRoomIds(left, right)),
    );
    return Object.freeze({
      visibleRoomIds: sortedVisibleRooms,
      visibleEntranceRoomIds: sortedEntranceRooms,
      loadedRoomCount: loadedViews.length,
      frustumRoomCount,
      safetyRoomCount,
      visibleEntranceCount: sortedEntranceRooms.length,
    });
  }

  /**
   * Verifies the post-streaming state. A protected ID may be newly materialized or
   * retained from the previous update; missing IDs increment the cumulative metric.
   */
  public verifyRetention(
    visibility: Pick<StreamingVisibilityResult, 'visibleRoomIds' | 'visibleEntranceRoomIds'>,
    state: StreamingVisibilityRetentionState,
  ): StreamingVisibilityVerification {
    const available = new Set<RoomId>(state.materializedRoomIds);
    for (const roomId of state.retainedRoomIds ?? []) {
      available.add(roomId);
    }
    const protectedIds = new Set<RoomId>([
      ...visibility.visibleRoomIds,
      ...visibility.visibleEntranceRoomIds,
    ]);
    const missingRoomIds = Object.freeze(
      [...protectedIds]
        .filter((roomId) => !available.has(roomId))
        .sort((left, right) => this.compareRoomIds(left, right)),
    );
    this.totalViolations += missingRoomIds.length;
    this.lastViolations = missingRoomIds;
    return Object.freeze({
      missingRoomIds,
      violationCount: missingRoomIds.length,
      totalViolationCount: this.totalViolations,
    });
  }

  public resetViolationCount(): void {
    this.totalViolations = 0;
    this.lastViolations = Object.freeze([]);
  }

  private isViewActiveInFrustum(view: BuiltModularRoom, planes: Plane[]): boolean {
    return view.meshes.some((mesh) => {
      if (
        mesh.getScene() !== this.scene ||
        mesh.isDisposed() ||
        !mesh.isEnabled() ||
        !mesh.isVisible ||
        mesh.visibility <= 0
      ) {
        return false;
      }
      mesh.computeWorldMatrix(true);
      return mesh.isInFrustum(planes);
    });
  }

  private collectVisibleEntranceNeighbors(
    view: BuiltModularRoom,
    playerPosition: Vector3Like,
    planes: readonly Plane[],
    result: Set<RoomId>,
  ): void {
    const worldMatrix = view.root.computeWorldMatrix(true);
    for (const socket of view.definition.sockets) {
      const connection = view.instance.socketStates[socket.id]?.connection;
      if (connection === null || connection === undefined) {
        continue;
      }
      const entranceCenter = Vector3.TransformCoordinates(
        new Vector3(socket.localPosition.x, socket.localPosition.y, socket.localPosition.z),
        worldMatrix,
      );
      const distance = Math.hypot(
        entranceCenter.x - playerPosition.x,
        entranceCenter.z - playerPosition.z,
      );
      if (distance > this.config.fogEnd) {
        continue;
      }
      const radius = this.getEntranceVisibilityRadius(socket);
      if (isSphereInFrustum(entranceCenter, radius, planes)) {
        result.add(connection.roomId);
      }
    }
  }

  private getEntranceVisibilityRadius(socket: RoomSocket): number {
    return Math.max(socket.width, socket.height) / 2 + this.config.entranceVisibilityPadding;
  }

  private assertKnownView(view: BuiltModularRoom): void {
    if (!this.graphRoomIds.has(view.id)) {
      throw new Error(`Loaded room ${view.id} does not belong to the configured graph.`);
    }
    if (view.root.getScene() !== this.scene) {
      throw new Error(`Loaded room ${view.id} belongs to a different Babylon scene.`);
    }
  }

  private compareRoomIds(left: RoomId, right: RoomId): number {
    const leftOrder = this.roomOrder.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = this.roomOrder.get(right) ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.localeCompare(right);
  }
}
