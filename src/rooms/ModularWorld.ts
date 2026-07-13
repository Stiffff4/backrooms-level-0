import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import { getRoomDefinition } from '../procedural/RoomCatalog';
import { transformDirection } from '../procedural/SocketMath';
import type { RoomGraph, RoomInstance } from '../procedural/procedural.types';
import { ModularRoomBuilder, MODULAR_PLAYER_BASE_HEIGHT } from './builders/ModularRoomBuilder';
import type {
  BuiltModularRoom,
  ModularWorldMetrics,
  RoomEntryTrigger,
  RoomLightAnchor,
  RoomTransition,
} from './rendering/rendering.types';
import { RoomMaterialLibrary } from './RoomMaterialLibrary';

const EMPTY_METRICS: ModularWorldMetrics = Object.freeze({
  roomCount: 0,
  meshCount: 0,
  colliderCount: 0,
  triggerCount: 0,
  lightAnchorCount: 0,
  materialCount: 0,
  triangleCount: 0,
});

/**
 * Materializes a complete logical RoomGraph and provides the cheap spatial
 * queries needed by gameplay. It deliberately has no ActionManagers or per-room
 * render observers; one player-position query drives every entry trigger.
 */
export class ModularWorld {
  private readonly materials: RoomMaterialLibrary;
  private readonly builder: ModularRoomBuilder;
  private readonly ownsMaterials: boolean;
  private readonly views = new Map<string, BuiltModularRoom>();
  private spawn = Vector3.Zero();
  private yaw = 0;
  private currentRoomId: string | null = null;
  private metricsSnapshot: ModularWorldMetrics = EMPTY_METRICS;
  private disposed = false;

  public constructor(scene: Scene, materials?: RoomMaterialLibrary) {
    this.materials = materials ?? new RoomMaterialLibrary(scene);
    this.ownsMaterials = materials === undefined;
    this.builder = new ModularRoomBuilder(scene, this.materials);
    this.metricsSnapshot = Object.freeze({
      ...EMPTY_METRICS,
      materialCount: this.materials.materialCount,
    });
  }

  public get spawnPoint(): Vector3 {
    return this.spawn.clone();
  }

  public get spawnYaw(): number {
    return this.yaw;
  }

  public get activeRoomId(): string | null {
    return this.currentRoomId;
  }

  public get roomRoots(): readonly TransformNode[] {
    return Object.freeze([...this.views.values()].map((view) => view.root));
  }

  public get roomViews(): readonly BuiltModularRoom[] {
    return Object.freeze([...this.views.values()]);
  }

  public get colliders(): readonly AbstractMesh[] {
    return Object.freeze([...this.views.values()].flatMap((view) => view.colliders));
  }

  public get triggers(): readonly RoomEntryTrigger[] {
    return Object.freeze([...this.views.values()].map((view) => view.trigger));
  }

  public get lightAnchors(): readonly RoomLightAnchor[] {
    return Object.freeze([...this.views.values()].flatMap((view) => view.lightAnchors));
  }

  public get metrics(): ModularWorldMetrics {
    return this.metricsSnapshot;
  }

  public get materialLibrary(): RoomMaterialLibrary {
    return this.materials;
  }

  public build(graph: RoomGraph): void {
    this.assertActive();
    if (graph.rooms.length === 0) {
      throw new Error('A modular world cannot be built from an empty room graph.');
    }

    const nextViews = new Map<string, BuiltModularRoom>();
    try {
      for (const instance of graph.rooms) {
        if (nextViews.has(instance.id)) {
          throw new Error(`Room graph contains duplicate room id ${instance.id}.`);
        }
        const definition = getRoomDefinition(instance.definitionId);
        nextViews.set(instance.id, this.builder.build(instance, definition));
      }

      const startInstance = this.requireStartInstance(graph);
      const startView = nextViews.get(startInstance.id);
      if (startView === undefined) {
        throw new Error(`Start room ${graph.startRoomId} was not rendered.`);
      }
      const nextSpawn = new Vector3(
        startView.root.position.x,
        startView.root.position.y + MODULAR_PLAYER_BASE_HEIGHT,
        startView.root.position.z,
      );
      const nextYaw = this.calculateSpawnYaw(startInstance, startView);

      this.clearRoomViews();
      for (const [id, view] of nextViews) {
        this.views.set(id, view);
      }
      this.spawn = nextSpawn;
      this.yaw = nextYaw;
      this.currentRoomId = null;
      this.metricsSnapshot = this.calculateMetrics();
    } catch (error: unknown) {
      for (const view of nextViews.values()) {
        view.dispose();
      }
      throw error;
    }
  }

  public getRoomAtPosition(position: Vector3): BuiltModularRoom | null {
    this.assertActive();
    const current = this.currentRoomId === null ? undefined : this.views.get(this.currentRoomId);
    if (current?.trigger.contains(position) === true) {
      return current;
    }

    let closest: BuiltModularRoom | null = null;
    let closestDistanceSquared = Number.POSITIVE_INFINITY;
    for (const view of this.views.values()) {
      if (!view.trigger.contains(position)) {
        continue;
      }
      const deltaX = position.x - view.trigger.center.x;
      const deltaZ = position.z - view.trigger.center.z;
      const distanceSquared = deltaX * deltaX + deltaZ * deltaZ;
      if (distanceSquared < closestDistanceSquared) {
        closest = view;
        closestDistanceSquared = distanceSquared;
      }
    }
    return closest;
  }

  public updatePlayerPosition(position: Vector3): RoomTransition {
    const previousRoomId = this.currentRoomId;
    const room = this.getRoomAtPosition(position);
    const roomId = room?.id ?? null;
    this.currentRoomId = roomId;
    return Object.freeze({
      changed: previousRoomId !== roomId,
      previousRoomId,
      roomId,
    });
  }

  /** Applies a floating-origin shift without mutating the logical room graph. */
  public translate(delta: Vector3): void {
    this.assertActive();
    if (delta.lengthSquared() === 0) {
      return;
    }
    for (const view of this.views.values()) {
      view.root.position.addInPlace(delta);
      view.trigger.translate(delta);
    }
    this.spawn.addInPlace(delta);
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.clearRoomViews();
    if (this.ownsMaterials) {
      this.materials.dispose();
    }
  }

  private requireStartInstance(graph: RoomGraph): RoomInstance {
    const start = graph.rooms.find((room) => room.id === graph.startRoomId);
    if (start === undefined) {
      throw new Error(`Room graph is missing start room ${graph.startRoomId}.`);
    }
    return start;
  }

  private calculateSpawnYaw(instance: RoomInstance, view: BuiltModularRoom): number {
    const socket = view.definition.sockets.find(
      (candidate) => instance.socketStates[candidate.id]?.status === 'connected',
    );
    if (socket === undefined) {
      return instance.worldTransform.rotationQuarterTurns * (Math.PI / 2);
    }

    const direction = transformDirection(
      socket.localForward,
      instance.worldTransform.rotationQuarterTurns,
    );
    return Math.atan2(direction.x, direction.z);
  }

  private calculateMetrics(): ModularWorldMetrics {
    const roomViews = [...this.views.values()];
    return Object.freeze({
      roomCount: roomViews.length,
      meshCount: roomViews.reduce((total, view) => total + view.meshes.length, 0),
      colliderCount: roomViews.reduce((total, view) => total + view.colliders.length, 0),
      triggerCount: roomViews.length,
      lightAnchorCount: roomViews.reduce((total, view) => total + view.lightAnchors.length, 0),
      materialCount: this.materials.materialCount,
      triangleCount: roomViews.reduce((total, view) => total + view.triangleCount, 0),
    });
  }

  private clearRoomViews(): void {
    for (const view of this.views.values()) {
      view.dispose();
    }
    this.views.clear();
    this.currentRoomId = null;
    this.metricsSnapshot = Object.freeze({
      ...EMPTY_METRICS,
      materialCount: this.disposed ? 0 : this.materials.materialCount,
    });
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error('ModularWorld has been disposed.');
    }
  }
}
