import type { RoomGraph, RoomId, RoomInstance } from '../procedural/procedural.types';
import type {
  ChunkMaterializer,
  ChunkStreamingConfig,
  ChunkStreamingMetrics,
  ChunkStreamingResult,
  ChunkStreamingUpdate,
  CompactRoomHistoryEntry,
  RoomMaterializationContext,
  StreamingTier,
} from './world.types';

export const DEFAULT_CHUNK_STREAMING_CONFIG: Readonly<ChunkStreamingConfig> = Object.freeze({
  activeRadius: 3,
  preloadRadius: 4,
  maxMaterializedRooms: 60,
});

interface MaterializedRoom<THandle> {
  handle: THandle;
  tier: StreamingTier;
  graphDistance: number | null;
}

interface DesiredRoom {
  room: RoomInstance;
  tier: StreamingTier;
  graphDistance: number | null;
}

function freezeMetrics(metrics: ChunkStreamingMetrics): ChunkStreamingMetrics {
  return Object.freeze({ ...metrics });
}

function buildAdjacency(graph: RoomGraph): ReadonlyMap<RoomId, readonly RoomId[]> {
  const roomIds = new Set(graph.rooms.map((room) => room.id));
  if (roomIds.size !== graph.rooms.length) {
    throw new Error('ChunkStreamer requires unique room ids.');
  }

  const adjacency = new Map<RoomId, Set<RoomId>>(
    graph.rooms.map((room) => [room.id, new Set<RoomId>()]),
  );
  for (const connection of graph.connections) {
    if (!roomIds.has(connection.roomAId) || !roomIds.has(connection.roomBId)) {
      throw new Error(`Connection ${connection.id} references an unknown room.`);
    }
    adjacency.get(connection.roomAId)?.add(connection.roomBId);
    adjacency.get(connection.roomBId)?.add(connection.roomAId);
  }

  const orderById = new Map(graph.rooms.map((room, index) => [room.id, index]));
  return new Map(
    [...adjacency].map(([roomId, neighbors]) => [
      roomId,
      [...neighbors].sort(
        (first, second) =>
          (orderById.get(first) ?? Number.MAX_SAFE_INTEGER) -
            (orderById.get(second) ?? Number.MAX_SAFE_INTEGER) || first.localeCompare(second),
      ),
    ]),
  );
}

function calculateDistancesFromAdjacency(
  adjacency: ReadonlyMap<RoomId, readonly RoomId[]>,
  startRoomId: RoomId,
  maximumDistance: number,
): ReadonlyMap<RoomId, number> {
  if (!adjacency.has(startRoomId)) {
    throw new Error(`Unknown current room: ${startRoomId}.`);
  }

  const distances = new Map<RoomId, number>([[startRoomId, 0]]);
  const queue: RoomId[] = [startRoomId];
  let cursor = 0;
  while (cursor < queue.length) {
    const roomId = queue[cursor];
    cursor += 1;
    if (roomId === undefined) {
      continue;
    }
    const distance = distances.get(roomId) as number;
    if (distance >= maximumDistance) {
      continue;
    }
    for (const neighbor of adjacency.get(roomId) ?? []) {
      if (distances.has(neighbor)) {
        continue;
      }
      distances.set(neighbor, distance + 1);
      queue.push(neighbor);
    }
  }
  return distances;
}

export function calculateGraphDistances(
  graph: RoomGraph,
  startRoomId: RoomId,
  maximumDistance = Number.POSITIVE_INFINITY,
): ReadonlyMap<RoomId, number> {
  if (maximumDistance < 0) {
    throw new Error('maximumDistance cannot be negative.');
  }
  const adjacency = buildAdjacency(graph);
  return calculateDistancesFromAdjacency(adjacency, startRoomId, maximumDistance);
}

export class StreamingBudgetExceededError extends Error {
  public constructor(requiredRooms: number, budget: number) {
    super(
      `Streaming requires ${requiredRooms} protected/active rooms, exceeding the budget of ${budget}.`,
    );
    this.name = 'StreamingBudgetExceededError';
  }
}

export class ChunkStreamer<THandle> {
  private readonly adjacency: ReadonlyMap<RoomId, readonly RoomId[]>;
  private readonly roomsById: ReadonlyMap<RoomId, RoomInstance>;
  private readonly roomOrder: ReadonlyMap<RoomId, number>;
  private readonly adapter: ChunkMaterializer<THandle>;
  private readonly configValue: Readonly<ChunkStreamingConfig>;
  private readonly materialized = new Map<RoomId, MaterializedRoom<THandle>>();
  private readonly history = new Map<RoomId, CompactRoomHistoryEntry>();
  private previousCurrentRoomId: RoomId | null = null;
  private updateSequence = 0;
  private disposed = false;
  private metricsSnapshot: ChunkStreamingMetrics;

  public constructor(
    graph: RoomGraph,
    adapter: ChunkMaterializer<THandle>,
    config: Partial<ChunkStreamingConfig> = {},
  ) {
    this.validateConfig(config);
    this.adjacency = buildAdjacency(graph);
    this.roomsById = new Map(graph.rooms.map((room) => [room.id, room]));
    this.roomOrder = new Map(graph.rooms.map((room, index) => [room.id, index]));
    this.adapter = adapter;
    this.configValue = Object.freeze({
      ...DEFAULT_CHUNK_STREAMING_CONFIG,
      ...config,
    });
    this.metricsSnapshot = freezeMetrics({
      updateCount: 0,
      activeRoomCount: 0,
      preloadRoomCount: 0,
      protectedRoomCount: 0,
      materializedRoomCount: 0,
      peakMaterializedRoomCount: 0,
      historyRoomCount: 0,
      totalMaterializations: 0,
      totalDematerializations: 0,
      lastMaterializedCount: 0,
      lastDematerializedCount: 0,
      budget: this.configValue.maxMaterializedRooms,
    });
  }

  public get config(): Readonly<ChunkStreamingConfig> {
    return this.configValue;
  }

  public get metrics(): ChunkStreamingMetrics {
    return this.metricsSnapshot;
  }

  public get materializedRoomIds(): readonly RoomId[] {
    return Object.freeze(this.sortRoomIds([...this.materialized.keys()]));
  }

  public hasMaterialized(roomId: RoomId): boolean {
    return this.materialized.has(roomId);
  }

  public getHandle(roomId: RoomId): THandle | undefined {
    return this.materialized.get(roomId)?.handle;
  }

  public getHistorySnapshot(): readonly CompactRoomHistoryEntry[] {
    return Object.freeze(
      [...this.history.values()]
        .sort(
          (first, second) =>
            first.firstVisitedUpdate - second.firstVisitedUpdate ||
            first.roomId.localeCompare(second.roomId),
        )
        .map((entry) => Object.freeze({ ...entry })),
    );
  }

  public update(input: ChunkStreamingUpdate): ChunkStreamingResult {
    this.assertActive();
    this.requireRoom(input.currentRoomId);
    const protectedRoomIds = this.collectProtectedRoomIds(input);
    const distances = calculateDistancesFromAdjacency(
      this.adjacency,
      input.currentRoomId,
      this.configValue.preloadRadius,
    );
    const desiredRooms = this.calculateDesiredRooms(distances, protectedRoomIds);
    const desiredIds = new Set(desiredRooms.map((desired) => desired.room.id));
    const toMaterialize = desiredRooms.filter((desired) => !this.materialized.has(desired.room.id));
    const toDematerialize = [...this.materialized.keys()]
      .filter((roomId) => !desiredIds.has(roomId))
      .sort((first, second) => this.compareForDematerialization(first, second, distances));
    const retained = desiredRooms.filter((desired) => this.materialized.has(desired.room.id));

    const removedRooms: {
      room: RoomInstance;
      previous: MaterializedRoom<THandle>;
    }[] = [];
    const newlyLoaded: { desired: DesiredRoom; handle: THandle }[] = [];
    const tierChanges: {
      desired: DesiredRoom;
      existing: MaterializedRoom<THandle>;
      previousTier: StreamingTier;
      previousDistance: number | null;
    }[] = [];
    try {
      // Outgoing rooms are never protected or active. Releasing them first keeps
      // the adapter under its hard resource cap during a full-budget swap.
      for (const roomId of toDematerialize) {
        const existing = this.materialized.get(roomId);
        if (existing === undefined) {
          continue;
        }
        const room = this.requireRoom(roomId);
        this.adapter.dematerialize(room, existing.handle);
        this.materialized.delete(roomId);
        removedRooms.push({ room, previous: existing });
      }
      for (const desired of toMaterialize) {
        const handle = this.adapter.materialize(
          desired.room,
          this.createContext(desired.tier, desired.graphDistance),
        );
        newlyLoaded.push({ desired, handle });
      }
      for (const desired of retained) {
        const existing = this.materialized.get(desired.room.id);
        if (
          existing !== undefined &&
          (existing.tier !== desired.tier || existing.graphDistance !== desired.graphDistance)
        ) {
          const change = {
            desired,
            existing,
            previousTier: existing.tier,
            previousDistance: existing.graphDistance,
          };
          this.adapter.updateTier?.(
            desired.room,
            existing.handle,
            this.createContext(desired.tier, desired.graphDistance),
          );
          tierChanges.push(change);
        }
      }
    } catch (error: unknown) {
      const rollbackErrors: unknown[] = [];
      for (const change of [...tierChanges].reverse()) {
        try {
          this.adapter.updateTier?.(
            change.desired.room,
            change.existing.handle,
            this.createContext(change.previousTier, change.previousDistance),
          );
        } catch (rollbackError: unknown) {
          rollbackErrors.push(rollbackError);
        }
      }
      for (const loaded of [...newlyLoaded].reverse()) {
        try {
          this.adapter.dematerialize(loaded.desired.room, loaded.handle);
        } catch (rollbackError: unknown) {
          rollbackErrors.push(rollbackError);
        }
      }
      for (const removed of [...removedRooms].reverse()) {
        try {
          const restoredHandle = this.adapter.materialize(
            removed.room,
            this.createContext(removed.previous.tier, removed.previous.graphDistance),
          );
          this.materialized.set(removed.room.id, {
            handle: restoredHandle,
            tier: removed.previous.tier,
            graphDistance: removed.previous.graphDistance,
          });
        } catch (rollbackError: unknown) {
          rollbackErrors.push(rollbackError);
        }
      }
      if (rollbackErrors.length > 0) {
        throw new AggregateError(
          [error, ...rollbackErrors],
          'Chunk streaming failed and its resource rollback was incomplete.',
          { cause: error },
        );
      }
      throw error;
    }

    for (const change of tierChanges) {
      change.existing.tier = change.desired.tier;
      change.existing.graphDistance = change.desired.graphDistance;
    }

    for (const loaded of newlyLoaded) {
      this.materialized.set(loaded.desired.room.id, {
        handle: loaded.handle,
        tier: loaded.desired.tier,
        graphDistance: loaded.desired.graphDistance,
      });
    }

    this.updateSequence += 1;
    this.recordVisit(input.currentRoomId);
    const activeRoomIds = desiredRooms
      .filter((desired) => desired.tier === 'active')
      .map((desired) => desired.room.id);
    const preloadRoomIds = desiredRooms
      .filter((desired) => desired.tier === 'preload')
      .map((desired) => desired.room.id);
    this.metricsSnapshot = freezeMetrics({
      updateCount: this.updateSequence,
      activeRoomCount: activeRoomIds.length,
      preloadRoomCount: preloadRoomIds.length,
      protectedRoomCount: protectedRoomIds.size,
      materializedRoomCount: this.materialized.size,
      peakMaterializedRoomCount: Math.max(
        this.metricsSnapshot.peakMaterializedRoomCount,
        this.materialized.size,
      ),
      historyRoomCount: this.history.size,
      totalMaterializations: this.metricsSnapshot.totalMaterializations + newlyLoaded.length,
      totalDematerializations:
        this.metricsSnapshot.totalDematerializations + toDematerialize.length,
      lastMaterializedCount: newlyLoaded.length,
      lastDematerializedCount: toDematerialize.length,
      budget: this.configValue.maxMaterializedRooms,
    });

    return Object.freeze({
      currentRoomId: input.currentRoomId,
      activeRoomIds: Object.freeze(activeRoomIds),
      preloadRoomIds: Object.freeze(preloadRoomIds),
      protectedRoomIds: Object.freeze(this.sortRoomIds([...protectedRoomIds])),
      materializedRoomIds: Object.freeze(desiredRooms.map((desired) => desired.room.id)),
      newlyMaterializedRoomIds: Object.freeze(newlyLoaded.map((loaded) => loaded.desired.room.id)),
      dematerializedRoomIds: Object.freeze(toDematerialize),
      retainedRoomIds: Object.freeze(retained.map((desired) => desired.room.id)),
      metrics: this.metricsSnapshot,
    });
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    for (const roomId of this.sortRoomIds([...this.materialized.keys()]).reverse()) {
      const existing = this.materialized.get(roomId);
      if (existing !== undefined) {
        this.adapter.dematerialize(this.requireRoom(roomId), existing.handle);
      }
    }
    this.materialized.clear();
    this.disposed = true;
  }

  private validateConfig(config: Partial<ChunkStreamingConfig>): void {
    const resolved = { ...DEFAULT_CHUNK_STREAMING_CONFIG, ...config };
    if (!Number.isInteger(resolved.activeRadius) || resolved.activeRadius < 0) {
      throw new Error('activeRadius must be a non-negative integer.');
    }
    if (
      !Number.isInteger(resolved.preloadRadius) ||
      resolved.preloadRadius !== resolved.activeRadius + 1
    ) {
      throw new Error('preloadRadius must be exactly one graph hop beyond activeRadius.');
    }
    if (!Number.isInteger(resolved.maxMaterializedRooms) || resolved.maxMaterializedRooms < 1) {
      throw new Error('maxMaterializedRooms must be a positive integer.');
    }
  }

  private collectProtectedRoomIds(input: ChunkStreamingUpdate): Set<RoomId> {
    const result = new Set<RoomId>([input.currentRoomId]);
    const groups = [input.visibleRoomIds, input.visibleEntranceRoomIds, input.recentlyLeftRoomIds];
    for (const group of groups) {
      for (const roomId of group) {
        this.requireRoom(roomId);
        result.add(roomId);
      }
    }
    if (input.exitRoomId !== null) {
      this.requireRoom(input.exitRoomId);
      result.add(input.exitRoomId);
    }
    return result;
  }

  private calculateDesiredRooms(
    distances: ReadonlyMap<RoomId, number>,
    protectedRoomIds: ReadonlySet<RoomId>,
  ): DesiredRoom[] {
    const mandatoryIds = new Set<RoomId>(protectedRoomIds);
    for (const [roomId, distance] of distances) {
      if (distance <= this.configValue.activeRadius) {
        mandatoryIds.add(roomId);
      }
    }
    if (mandatoryIds.size > this.configValue.maxMaterializedRooms) {
      throw new StreamingBudgetExceededError(
        mandatoryIds.size,
        this.configValue.maxMaterializedRooms,
      );
    }

    const desiredById = new Map<RoomId, DesiredRoom>();
    for (const roomId of mandatoryIds) {
      const distance = distances.get(roomId) ?? null;
      desiredById.set(roomId, {
        room: this.requireRoom(roomId),
        tier:
          distance !== null && distance <= this.configValue.activeRadius ? 'active' : 'protected',
        graphDistance: distance,
      });
    }

    const preloadCandidates = [...distances]
      .filter(
        ([roomId, distance]) =>
          distance > this.configValue.activeRadius &&
          distance <= this.configValue.preloadRadius &&
          !desiredById.has(roomId),
      )
      .map(([roomId, distance]) => ({
        room: this.requireRoom(roomId),
        tier: 'preload' as const,
        graphDistance: distance,
      }))
      .sort((first, second) => this.compareDesired(first, second));
    const availableSlots = this.configValue.maxMaterializedRooms - desiredById.size;
    for (const candidate of preloadCandidates.slice(0, availableSlots)) {
      desiredById.set(candidate.room.id, candidate);
    }

    return [...desiredById.values()].sort((first, second) => this.compareDesired(first, second));
  }

  private compareDesired(first: DesiredRoom, second: DesiredRoom): number {
    const tierPriority: Record<StreamingTier, number> = {
      active: 0,
      protected: 1,
      preload: 2,
    };
    return (
      tierPriority[first.tier] - tierPriority[second.tier] ||
      (first.graphDistance ?? Number.MAX_SAFE_INTEGER) -
        (second.graphDistance ?? Number.MAX_SAFE_INTEGER) ||
      this.compareRoomIds(first.room.id, second.room.id)
    );
  }

  private compareForDematerialization(
    first: RoomId,
    second: RoomId,
    distances: ReadonlyMap<RoomId, number>,
  ): number {
    const firstDistance = distances.get(first) ?? Number.POSITIVE_INFINITY;
    const secondDistance = distances.get(second) ?? Number.POSITIVE_INFINITY;
    if (firstDistance !== secondDistance) {
      if (firstDistance === Number.POSITIVE_INFINITY) {
        return -1;
      }
      if (secondDistance === Number.POSITIVE_INFINITY) {
        return 1;
      }
      return secondDistance - firstDistance;
    }
    return this.compareRoomIds(second, first);
  }

  private compareRoomIds(first: RoomId, second: RoomId): number {
    return (
      (this.roomOrder.get(first) ?? Number.MAX_SAFE_INTEGER) -
        (this.roomOrder.get(second) ?? Number.MAX_SAFE_INTEGER) || first.localeCompare(second)
    );
  }

  private sortRoomIds(roomIds: RoomId[]): RoomId[] {
    return roomIds.sort((first, second) => this.compareRoomIds(first, second));
  }

  private createContext(
    tier: StreamingTier,
    graphDistance: number | null,
  ): RoomMaterializationContext {
    return Object.freeze({ tier, graphDistance });
  }

  private recordVisit(currentRoomId: RoomId): void {
    if (this.previousCurrentRoomId !== null && this.previousCurrentRoomId !== currentRoomId) {
      const previous = this.history.get(this.previousCurrentRoomId);
      if (previous !== undefined) {
        previous.lastLeftUpdate = this.updateSequence;
      }
    }

    const room = this.requireRoom(currentRoomId);
    const existing = this.history.get(currentRoomId);
    if (existing === undefined) {
      this.history.set(currentRoomId, {
        roomId: room.id,
        definitionId: room.definitionId,
        seed: room.seed,
        visitCount: 1,
        firstVisitedUpdate: this.updateSequence,
        lastVisitedUpdate: this.updateSequence,
        lastLeftUpdate: null,
      });
    } else {
      if (this.previousCurrentRoomId !== currentRoomId) {
        existing.visitCount += 1;
      }
      existing.lastVisitedUpdate = this.updateSequence;
    }
    this.previousCurrentRoomId = currentRoomId;
  }

  private requireRoom(roomId: RoomId): RoomInstance {
    const room = this.roomsById.get(roomId);
    if (room === undefined) {
      throw new Error(`Unknown room: ${roomId}.`);
    }
    return room;
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error('ChunkStreamer has been disposed.');
    }
  }
}
