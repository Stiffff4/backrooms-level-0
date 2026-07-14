import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import { getRoomDefinition } from '../procedural/RoomCatalog';
import { transformDirection } from '../procedural/SocketMath';
import type { RoomDefinition, RoomGraph, RoomInstance } from '../procedural/procedural.types';
import { ModularRoomBuilder, MODULAR_PLAYER_BASE_HEIGHT } from './builders/ModularRoomBuilder';
import type {
  BuiltModularRoom,
  ModularWorldMetrics,
  RoomEntryTrigger,
  RoomLightAnchor,
  RoomTransition,
} from './rendering/rendering.types';
import { RoomMaterialLibrary } from './RoomMaterialLibrary';

const DEFAULT_MAX_LOADED_ROOMS = 60;
const DEFAULT_POOLED_ROOM_LIMIT = 8;

const EMPTY_METRICS: ModularWorldMetrics = Object.freeze({
  roomCount: 0,
  activeRoomCount: 0,
  pooledRoomCount: 0,
  meshCount: 0,
  colliderCount: 0,
  triggerCount: 0,
  lightAnchorCount: 0,
  spatialAnomalyCount: 0,
  materialCount: 0,
  triangleCount: 0,
});

export interface ModularWorldOptions {
  readonly maxLoadedRooms?: number;
  readonly pooledRoomLimit?: number;
}

export interface ModularWorldSyncResult {
  readonly loadedRoomIds: readonly string[];
  readonly unloadedRoomIds: readonly string[];
  readonly retainedRoomIds: readonly string[];
}

/**
 * Materializes a bounded subset of a logical RoomGraph and provides the cheap
 * spatial queries needed by gameplay. The graph remains authoritative while
 * room views may be loaded, unloaded and reconstructed independently.
 */
export class ModularWorld {
  private readonly materials: RoomMaterialLibrary;
  private readonly builder: ModularRoomBuilder;
  private readonly ownsMaterials: boolean;
  private readonly views = new Map<string, BuiltModularRoom>();
  private readonly pooledViews = new Map<string, BuiltModularRoom>();
  private readonly instancesById = new Map<string, RoomInstance>();
  private readonly renderKeysById = new Map<string, string>();
  private readonly spatialAnomalyRooms = new Set<string>();
  private readonly renderOffset = Vector3.Zero();
  private readonly loadLimit: number;
  private readonly poolLimit: number;
  private graph: RoomGraph | null = null;
  private spawn = Vector3.Zero();
  private yaw = 0;
  private currentRoomId: string | null = null;
  private metricsSnapshot: ModularWorldMetrics = EMPTY_METRICS;
  private lightAnchorRevisionValue = 0;
  private disposed = false;

  public constructor(
    scene: Scene,
    materials?: RoomMaterialLibrary,
    options: ModularWorldOptions = {},
  ) {
    const maxLoadedRooms = options.maxLoadedRooms ?? DEFAULT_MAX_LOADED_ROOMS;
    const pooledRoomLimit = options.pooledRoomLimit ?? DEFAULT_POOLED_ROOM_LIMIT;
    if (!Number.isInteger(maxLoadedRooms) || maxLoadedRooms < 1) {
      throw new RangeError('maxLoadedRooms must be a positive integer.');
    }
    if (!Number.isInteger(pooledRoomLimit) || pooledRoomLimit < 0) {
      throw new RangeError('pooledRoomLimit must be a non-negative integer.');
    }

    this.materials = materials ?? new RoomMaterialLibrary(scene);
    this.ownsMaterials = materials === undefined;
    this.builder = new ModularRoomBuilder(scene, this.materials);
    this.loadLimit = maxLoadedRooms;
    this.poolLimit = pooledRoomLimit;
    this.metricsSnapshot = this.emptyMetrics();
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

  public get maxLoadedRooms(): number {
    return this.loadLimit;
  }

  public get loadedRoomCount(): number {
    return this.views.size;
  }

  public get pooledRoomCount(): number {
    return this.pooledViews.size;
  }

  public get registeredRoomCount(): number {
    return this.instancesById.size;
  }

  public get loadedRoomIds(): readonly string[] {
    return Object.freeze([...this.views.keys()]);
  }

  public get pooledRoomIds(): readonly string[] {
    return Object.freeze([...this.pooledViews.keys()]);
  }

  public get maxPooledRooms(): number {
    return this.poolLimit;
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

  public get lightAnchorRevision(): number {
    return this.lightAnchorRevisionValue;
  }

  public get spatialAnomalyCount(): number {
    return this.spatialAnomalyRooms.size;
  }

  public get spatialAnomalyRoomIds(): readonly string[] {
    return Object.freeze([...this.spatialAnomalyRooms]);
  }

  public get metrics(): ModularWorldMetrics {
    return this.metricsSnapshot;
  }

  public get materialLibrary(): RoomMaterialLibrary {
    return this.materials;
  }

  /** Registers a logical graph without eagerly creating any missing room views. */
  public setGraph(graph: RoomGraph): void {
    this.assertActive();
    if (graph.rooms.length === 0) {
      throw new Error('A modular world cannot use an empty room graph.');
    }

    const nextInstances = new Map<string, RoomInstance>();
    const nextRenderKeys = new Map<string, string>();
    for (const instance of graph.rooms) {
      if (nextInstances.has(instance.id)) {
        throw new Error(`Room graph contains duplicate room id ${instance.id}.`);
      }
      const definition = getRoomDefinition(instance.definitionId);
      nextInstances.set(instance.id, instance);
      nextRenderKeys.set(instance.id, this.createRenderKey(instance, definition));
    }

    const startInstance = nextInstances.get(graph.startRoomId);
    if (startInstance === undefined) {
      throw new Error(`Room graph is missing start room ${graph.startRoomId}.`);
    }
    const startDefinition = getRoomDefinition(startInstance.definitionId);

    const retainedViews = new Map<string, BuiltModularRoom>();
    for (const [roomId, view] of this.views) {
      const nextInstance = nextInstances.get(roomId);
      const previousRenderKey = this.renderKeysById.get(roomId);
      const nextRenderKey = nextRenderKeys.get(roomId);
      if (
        nextInstance === undefined ||
        previousRenderKey === undefined ||
        previousRenderKey !== nextRenderKey
      ) {
        view.dispose();
        if (this.currentRoomId === roomId) {
          this.currentRoomId = null;
        }
        continue;
      }

      retainedViews.set(
        roomId,
        view.instance === nextInstance
          ? view
          : {
              ...view,
              instance: nextInstance,
            },
      );
    }

    const retainedPooledViews = new Map<string, BuiltModularRoom>();
    for (const [roomId, view] of this.pooledViews) {
      const nextInstance = nextInstances.get(roomId);
      const previousRenderKey = this.renderKeysById.get(roomId);
      const nextRenderKey = nextRenderKeys.get(roomId);
      if (
        nextInstance === undefined ||
        previousRenderKey === undefined ||
        previousRenderKey !== nextRenderKey
      ) {
        view.dispose();
        continue;
      }
      retainedPooledViews.set(
        roomId,
        view.instance === nextInstance
          ? view
          : {
              ...view,
              instance: nextInstance,
            },
      );
    }

    this.views.clear();
    for (const [roomId, view] of retainedViews) {
      this.views.set(roomId, view);
    }
    this.pooledViews.clear();
    for (const [roomId, view] of retainedPooledViews) {
      this.pooledViews.set(roomId, view);
    }
    this.instancesById.clear();
    this.renderKeysById.clear();
    for (const [roomId, instance] of nextInstances) {
      this.instancesById.set(roomId, instance);
    }

    for (const roomId of this.spatialAnomalyRooms) {
      if (!nextInstances.has(roomId)) {
        this.spatialAnomalyRooms.delete(roomId);
      }
    }
    for (const [roomId, renderKey] of nextRenderKeys) {
      this.renderKeysById.set(roomId, renderKey);
    }

    this.graph = graph;
    this.spawn.set(
      startInstance.worldTransform.position.x + this.renderOffset.x,
      startInstance.worldTransform.position.y + MODULAR_PLAYER_BASE_HEIGHT + this.renderOffset.y,
      startInstance.worldTransform.position.z + this.renderOffset.z,
    );
    this.yaw = this.calculateSpawnYaw(startInstance, startDefinition);
    this.metricsSnapshot = this.calculateMetrics();
    this.lightAnchorRevisionValue += 1;
  }

  /** Compatibility helper: registers the graph and loads every room within the configured limit. */
  public build(graph: RoomGraph): void {
    if (graph.rooms.length > this.loadLimit) {
      throw new RangeError(
        `Cannot build ${graph.rooms.length} room views with a limit of ${this.loadLimit}.`,
      );
    }
    this.setGraph(graph);
    this.syncLoadedRooms(graph.rooms.map((room) => room.id));
  }

  public isRoomLoaded(roomId: string): boolean {
    this.assertActive();
    return this.views.has(roomId);
  }

  public getLoadedRoom(roomId: string): BuiltModularRoom | null {
    this.assertActive();
    return this.views.get(roomId) ?? null;
  }

  public loadRoom(roomId: string): BuiltModularRoom {
    this.assertActive();
    const existing = this.views.get(roomId);
    if (existing !== undefined) {
      return existing;
    }
    if (this.views.size >= this.loadLimit) {
      throw new RangeError(`Cannot load more than ${this.loadLimit} room views.`);
    }

    const pooled = this.pooledViews.get(roomId);
    if (pooled !== undefined) {
      this.pooledViews.delete(roomId);
      pooled.root.setEnabled(true);
      this.applySpatialAnomalyState(pooled);
      this.views.set(roomId, pooled);
      this.metricsSnapshot = this.calculateMetrics();
      this.lightAnchorRevisionValue += 1;
      return pooled;
    }

    const view = this.createView(roomId);
    this.views.set(roomId, view);
    this.metricsSnapshot = this.calculateMetrics();
    this.lightAnchorRevisionValue += 1;
    return view;
  }

  public setRoomSpatialAnomaly(roomId: string, enabled: boolean): boolean {
    this.assertActive();
    if (!this.instancesById.has(roomId)) {
      throw new Error(`Unknown room instance: ${roomId}`);
    }
    const alreadyEnabled = this.spatialAnomalyRooms.has(roomId);
    if (alreadyEnabled === enabled) {
      return false;
    }
    if (enabled) {
      this.spatialAnomalyRooms.add(roomId);
    } else {
      this.spatialAnomalyRooms.delete(roomId);
    }
    const view = this.views.get(roomId) ?? this.pooledViews.get(roomId);
    if (view) {
      this.applySpatialAnomalyState(view);
    }
    this.metricsSnapshot = this.calculateMetrics();
    return true;
  }

  public clearSpatialAnomalies(): void {
    this.assertActive();
    if (this.spatialAnomalyRooms.size === 0) {
      return;
    }
    this.spatialAnomalyRooms.clear();
    for (const view of [...this.views.values(), ...this.pooledViews.values()]) {
      this.applySpatialAnomalyState(view);
    }
    this.metricsSnapshot = this.calculateMetrics();
  }

  public unloadRoom(roomId: string): boolean {
    this.assertActive();
    const view = this.views.get(roomId);
    if (view === undefined) {
      return false;
    }

    this.views.delete(roomId);
    this.cacheView(roomId, view);
    if (this.currentRoomId === roomId) {
      this.currentRoomId = null;
    }
    this.metricsSnapshot = this.calculateMetrics();
    this.lightAnchorRevisionValue += 1;
    return true;
  }

  /** Replaces the loaded subset without ever exceeding the active-room limit. */
  public syncLoadedRooms(roomIds: Iterable<string>): ModularWorldSyncResult {
    this.assertActive();
    this.requireGraph();

    const requested = [...new Set(roomIds)];
    if (requested.length > this.loadLimit) {
      throw new RangeError(
        `Requested ${requested.length} room views, exceeding the limit of ${this.loadLimit}.`,
      );
    }
    for (const roomId of requested) {
      if (!this.instancesById.has(roomId)) {
        throw new Error(`Unknown room instance: ${roomId}`);
      }
    }

    const requestedSet = new Set(requested);
    const retainedRoomIds = requested.filter((roomId) => this.views.has(roomId));
    const unloadedRoomIds = [...this.views.keys()].filter((roomId) => !requestedSet.has(roomId));
    const loadedRoomIds = requested.filter((roomId) => !this.views.has(roomId));
    const originalViews = new Map(this.views);
    const originalPooledViews = new Map(this.pooledViews);
    const originalCurrentRoomId = this.currentRoomId;
    const retiredViews = new Map<string, BuiltModularRoom>();
    const newlyCreatedViews = new Map<string, BuiltModularRoom>();
    const reservedPooledViews = new Map<string, BuiltModularRoom>();
    for (const roomId of loadedRoomIds) {
      const pooled = this.pooledViews.get(roomId);
      if (pooled !== undefined) {
        this.pooledViews.delete(roomId);
        reservedPooledViews.set(roomId, pooled);
      }
    }

    for (const roomId of unloadedRoomIds) {
      const view = this.views.get(roomId);
      if (view !== undefined) {
        this.views.delete(roomId);
        view.root.setEnabled(false);
        retiredViews.set(roomId, view);
      }
      if (this.currentRoomId === roomId) {
        this.currentRoomId = null;
      }
    }

    try {
      for (const roomId of loadedRoomIds) {
        const reserved = reservedPooledViews.get(roomId);
        const view = reserved ?? this.createView(roomId);
        if (reserved === undefined) {
          newlyCreatedViews.set(roomId, view);
        }
        view.root.setEnabled(true);
        this.applySpatialAnomalyState(view);
        this.views.set(roomId, view);
        reservedPooledViews.delete(roomId);
      }
    } catch (error: unknown) {
      this.views.clear();
      for (const [roomId, view] of originalViews) {
        view.root.setEnabled(true);
        this.views.set(roomId, view);
      }
      for (const view of newlyCreatedViews.values()) {
        view.dispose();
      }
      this.pooledViews.clear();
      for (const [roomId, view] of originalPooledViews) {
        view.root.setEnabled(false);
        this.pooledViews.set(roomId, view);
      }
      this.currentRoomId = originalCurrentRoomId;
      this.metricsSnapshot = this.calculateMetrics();
      throw error;
    }

    for (const [roomId, view] of retiredViews) {
      this.cacheView(roomId, view);
    }

    const nextViews = new Map<string, BuiltModularRoom>();
    for (const roomId of requested) {
      const view = this.views.get(roomId);
      if (view === undefined) {
        throw new Error(`Room ${roomId} was not available after streaming synchronization.`);
      }
      nextViews.set(roomId, view);
    }
    this.views.clear();
    for (const [roomId, view] of nextViews) {
      this.views.set(roomId, view);
    }
    this.metricsSnapshot = this.calculateMetrics();
    if (loadedRoomIds.length > 0 || unloadedRoomIds.length > 0) {
      this.lightAnchorRevisionValue += 1;
    }

    return Object.freeze({
      loadedRoomIds: Object.freeze(loadedRoomIds),
      unloadedRoomIds: Object.freeze(unloadedRoomIds),
      retainedRoomIds: Object.freeze(retainedRoomIds),
    });
  }

  public unloadAllRooms(): void {
    this.assertActive();
    const hadLoadedRooms = this.views.size > 0;
    for (const [roomId, view] of this.views) {
      this.cacheView(roomId, view);
    }
    this.views.clear();
    this.currentRoomId = null;
    this.metricsSnapshot = this.calculateMetrics();
    if (hadLoadedRooms) {
      this.lightAnchorRevisionValue += 1;
    }
  }

  public purgePool(): void {
    this.assertActive();
    this.disposePooledViews();
    this.metricsSnapshot = this.calculateMetrics();
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

  /** Applies a floating-origin shift to loaded views and every later reconstruction. */
  public translate(delta: Vector3): void {
    this.assertActive();
    if (delta.lengthSquared() === 0) {
      return;
    }
    this.renderOffset.addInPlace(delta);
    for (const view of this.views.values()) {
      view.root.position.addInPlace(delta);
      view.trigger.translate(delta);
    }
    for (const view of this.pooledViews.values()) {
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
    this.disposeLoadedViews();
    this.disposePooledViews();
    this.instancesById.clear();
    this.renderKeysById.clear();
    this.spatialAnomalyRooms.clear();
    this.graph = null;
    if (this.ownsMaterials) {
      this.materials.dispose();
    }
    this.metricsSnapshot = EMPTY_METRICS;
  }

  private createView(roomId: string): BuiltModularRoom {
    this.requireGraph();
    const instance = this.instancesById.get(roomId);
    if (instance === undefined) {
      throw new Error(`Unknown room instance: ${roomId}`);
    }
    const definition = getRoomDefinition(instance.definitionId);
    const view = this.builder.build(instance, definition);
    if (this.renderOffset.lengthSquared() > 0) {
      view.root.position.addInPlace(this.renderOffset);
      view.trigger.translate(this.renderOffset);
    }
    this.applySpatialAnomalyState(view);
    return view;
  }

  private applySpatialAnomalyState(view: BuiltModularRoom): void {
    const enabled = this.spatialAnomalyRooms.has(view.id);
    view.spatialAnomaly.mesh.isVisible = enabled;
    view.spatialAnomaly.mesh.setEnabled(enabled);
  }

  private createRenderKey(instance: RoomInstance, definition: RoomDefinition): string {
    return JSON.stringify({
      definitionId: instance.definitionId,
      seed: instance.seed,
      transform: instance.worldTransform,
      sockets: definition.sockets.map((socket) => [
        socket.id,
        instance.socketStates[socket.id]?.status ?? 'missing',
      ]),
    });
  }

  private calculateSpawnYaw(instance: RoomInstance, definition: RoomDefinition): number {
    const socket = definition.sockets.find(
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
      activeRoomCount: roomViews.length,
      pooledRoomCount: this.pooledViews.size,
      meshCount: roomViews.reduce((total, view) => total + view.meshes.length, 0),
      colliderCount: roomViews.reduce((total, view) => total + view.colliders.length, 0),
      triggerCount: roomViews.length,
      lightAnchorCount: roomViews.reduce((total, view) => total + view.lightAnchors.length, 0),
      spatialAnomalyCount: this.spatialAnomalyRooms.size,
      materialCount: this.materials.materialCount,
      triangleCount: roomViews.reduce((total, view) => total + view.triangleCount, 0),
    });
  }

  private emptyMetrics(): ModularWorldMetrics {
    return Object.freeze({
      ...EMPTY_METRICS,
      materialCount: this.disposed ? 0 : this.materials.materialCount,
    });
  }

  private disposeLoadedViews(): void {
    for (const view of this.views.values()) {
      view.dispose();
    }
    this.views.clear();
    this.currentRoomId = null;
  }

  private cacheView(roomId: string, view: BuiltModularRoom): void {
    view.root.setEnabled(false);
    const previous = this.pooledViews.get(roomId);
    if (previous !== undefined && previous !== view) {
      previous.dispose();
    }
    this.pooledViews.delete(roomId);
    this.pooledViews.set(roomId, view);
    while (this.pooledViews.size > this.poolLimit) {
      const oldestRoomId = this.pooledViews.keys().next().value as string | undefined;
      if (oldestRoomId === undefined) {
        break;
      }
      const oldest = this.pooledViews.get(oldestRoomId);
      this.pooledViews.delete(oldestRoomId);
      oldest?.dispose();
    }
  }

  private disposePooledViews(): void {
    for (const view of this.pooledViews.values()) {
      view.dispose();
    }
    this.pooledViews.clear();
  }

  private requireGraph(): RoomGraph {
    if (this.graph === null) {
      throw new Error('Register a room graph before loading room views.');
    }
    return this.graph;
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error('ModularWorld has been disposed.');
    }
  }
}
