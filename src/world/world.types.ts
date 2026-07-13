import type { RoomId, RoomInstance, Vector3Like } from '../procedural/procedural.types';

export type StreamingTier = 'active' | 'preload' | 'protected';

export interface ChunkStreamingConfig {
  activeRadius: number;
  preloadRadius: number;
  maxMaterializedRooms: number;
}

export interface ChunkStreamingUpdate {
  currentRoomId: RoomId;
  visibleRoomIds: readonly RoomId[];
  visibleEntranceRoomIds: readonly RoomId[];
  exitRoomId: RoomId | null;
  recentlyLeftRoomIds: readonly RoomId[];
}

export interface RoomMaterializationContext {
  tier: StreamingTier;
  graphDistance: number | null;
}

export interface ChunkMaterializer<THandle> {
  materialize(room: RoomInstance, context: RoomMaterializationContext): THandle;
  dematerialize(room: RoomInstance, handle: THandle): void;
  updateTier?: (room: RoomInstance, handle: THandle, context: RoomMaterializationContext) => void;
}

export interface CompactRoomHistoryEntry {
  roomId: RoomId;
  definitionId: string;
  seed: number;
  visitCount: number;
  firstVisitedUpdate: number;
  lastVisitedUpdate: number;
  lastLeftUpdate: number | null;
}

export interface ChunkStreamingMetrics {
  updateCount: number;
  activeRoomCount: number;
  preloadRoomCount: number;
  protectedRoomCount: number;
  materializedRoomCount: number;
  peakMaterializedRoomCount: number;
  historyRoomCount: number;
  totalMaterializations: number;
  totalDematerializations: number;
  lastMaterializedCount: number;
  lastDematerializedCount: number;
  budget: number;
}

export interface ChunkStreamingResult {
  currentRoomId: RoomId;
  activeRoomIds: readonly RoomId[];
  preloadRoomIds: readonly RoomId[];
  protectedRoomIds: readonly RoomId[];
  materializedRoomIds: readonly RoomId[];
  newlyMaterializedRoomIds: readonly RoomId[];
  dematerializedRoomIds: readonly RoomId[];
  retainedRoomIds: readonly RoomId[];
  metrics: ChunkStreamingMetrics;
}

export interface FloatingOriginConfig {
  rebaseThreshold: number;
}

export interface FloatingOriginRebase {
  sequence: number;
  threshold: number;
  distanceBefore: number;
  worldDelta: Vector3Like;
  playerLocalBefore: Vector3Like;
  playerLocalAfter: Vector3Like;
  previousOriginOffset: Vector3Like;
  originOffset: Vector3Like;
}

export interface FloatingOriginReset {
  worldDelta: Vector3Like;
  previousOriginOffset: Vector3Like;
  originOffset: Vector3Like;
}

export interface FloatingOriginMetrics {
  rebaseCount: number;
  totalShiftDistance: number;
  lastRebaseDistance: number;
  originOffset: Vector3Like;
}
