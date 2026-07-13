export type SeedInput = string | number;

export type RoomId = string;
export type SocketId = string;

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export type CardinalDirection = 'north' | 'east' | 'south' | 'west';
export type QuarterTurn = 0 | 1 | 2 | 3;
export type RoomCategory = 'corridor' | 'corner' | 'junction' | 'room';
export type SocketStatus = 'open' | 'connected' | 'sealed';
export type VisitState = 'unvisited' | 'visible' | 'visited';

export interface GridFootprint {
  width: number;
  depth: number;
  height: number;
}

export interface RoomSocket {
  id: SocketId;
  localPosition: Vector3Like;
  localForward: Vector3Like;
  width: number;
  height: number;
  tags: string[];
}

export type GeometryKind =
  | 'straight-corridor'
  | 'corner'
  | 'offset-corridor'
  | 'junction'
  | 'rectangular-room'
  | 'open-room'
  | 'dead-end'
  | 'double-offset';

export type WallStyle = 'continuous' | 'segmented' | 'offset' | 'pillared';
export type ColumnLayout = 'none' | 'sparse' | 'grid';

export interface GeometryRecipe {
  kind: GeometryKind;
  wallStyle: WallStyle;
  columnLayout: ColumnLayout;
}

export interface AnomalySlot {
  id: string;
  kind: 'wall' | 'ceiling' | 'floor' | 'spatial';
  localPosition: Vector3Like;
}

export interface ExitSurfaceDefinition {
  id: string;
  localPosition: Vector3Like;
  localForward: Vector3Like;
  width: number;
  height: number;
}

export interface RoomDefinition {
  id: string;
  category: RoomCategory;
  footprint: GridFootprint;
  sockets: RoomSocket[];
  weight: number;
  minDepth: number;
  maxConsecutive: number;
  tags: string[];
  geometryRecipe: GeometryRecipe;
  lightingProfile: string;
  audioProfile: string;
  anomalySlots: AnomalySlot[];
  exitCompatibleSurfaces: ExitSurfaceDefinition[];
}

export interface TransformData {
  position: Vector3Like;
  rotationQuarterTurns: QuarterTurn;
}

export interface RoomConnection {
  roomId: RoomId;
  socketId: SocketId;
}

export interface SocketState {
  status: SocketStatus;
  connection: RoomConnection | null;
}

export interface RoomInstance {
  id: RoomId;
  definitionId: string;
  seed: number;
  depth: number;
  worldTransform: TransformData;
  socketStates: Record<SocketId, SocketState>;
  visitState: VisitState;
  spawnedAt: number;
}

export interface RoomGraphConnection {
  id: string;
  roomAId: RoomId;
  socketAId: SocketId;
  roomBId: RoomId;
  socketBId: SocketId;
}

export interface GenerationStats {
  attemptedPlacements: number;
  rejectedOverlaps: number;
  sealedSockets: number;
}

export interface RoomGraph {
  version: 1;
  seed: string;
  startRoomId: RoomId;
  rooms: RoomInstance[];
  connections: RoomGraphConnection[];
  generationStats: GenerationStats;
}

export interface RoomAabb {
  min: Vector3Like;
  max: Vector3Like;
}

export interface SocketWorldPose {
  position: Vector3Like;
  forward: Vector3Like;
  width: number;
  height: number;
}

export interface GenerateRoomGraphOptions {
  seed: SeedInput;
  targetRooms: number;
  definitions?: readonly RoomDefinition[];
  maxPlacementAttempts?: number;
  /**
   * `deep` reserves most placements for the furthest frontier, producing a
   * long explorable spine while still spending every fourth placement on a
   * branch. `balanced` retains the compact phase-3 embedding.
   */
  frontierStrategy?: 'balanced' | 'deep';
}
