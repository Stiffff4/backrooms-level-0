import type {
  CardinalDirection,
  ExitSurfaceDefinition,
  GeometryRecipe,
  RoomCategory,
  RoomDefinition,
  RoomSocket,
  Vector3Like,
} from './procedural.types';

const STANDARD_SOCKET_WIDTH = 2.2;
const WIDE_SOCKET_WIDTH = 3.6;
const SOCKET_HEIGHT = 2.3;

interface DefinitionOptions {
  id: string;
  category: RoomCategory;
  width: number;
  depth: number;
  height?: number;
  sockets: RoomSocket[];
  weight: number;
  minDepth: number;
  maxConsecutive: number;
  tags: string[];
  geometryRecipe: GeometryRecipe;
  lightingProfile: string;
  audioProfile: string;
  exitSurfaces?: ExitSurfaceDefinition[];
}

function directionVector(direction: CardinalDirection): Vector3Like {
  switch (direction) {
    case 'north':
      return { x: 0, y: 0, z: 1 };
    case 'east':
      return { x: 1, y: 0, z: 0 };
    case 'south':
      return { x: 0, y: 0, z: -1 };
    case 'west':
      return { x: -1, y: 0, z: 0 };
  }
}

function socket(
  id: string,
  direction: CardinalDirection,
  footprintWidth: number,
  footprintDepth: number,
  width = STANDARD_SOCKET_WIDTH,
  lateralOffset = 0,
): RoomSocket {
  const y = SOCKET_HEIGHT / 2;
  const standardTag = width === WIDE_SOCKET_WIDTH ? 'passage:wide' : 'passage:standard';

  switch (direction) {
    case 'north':
      return {
        id,
        localPosition: { x: lateralOffset, y, z: footprintDepth / 2 },
        localForward: directionVector(direction),
        width,
        height: SOCKET_HEIGHT,
        tags: [standardTag],
      };
    case 'east':
      return {
        id,
        localPosition: { x: footprintWidth / 2, y, z: lateralOffset },
        localForward: directionVector(direction),
        width,
        height: SOCKET_HEIGHT,
        tags: [standardTag],
      };
    case 'south':
      return {
        id,
        localPosition: { x: lateralOffset, y, z: -footprintDepth / 2 },
        localForward: directionVector(direction),
        width,
        height: SOCKET_HEIGHT,
        tags: [standardTag],
      };
    case 'west':
      return {
        id,
        localPosition: { x: -footprintWidth / 2, y, z: lateralOffset },
        localForward: directionVector(direction),
        width,
        height: SOCKET_HEIGHT,
        tags: [standardTag],
      };
  }
}

function exitSurface(
  id: string,
  direction: CardinalDirection,
  footprintWidth: number,
  footprintDepth: number,
  width = 2.8,
  lateralOffset = 0,
): ExitSurfaceDefinition {
  const matchingSocket = socket(
    id,
    direction,
    footprintWidth,
    footprintDepth,
    width,
    lateralOffset,
  );
  return {
    id,
    localPosition: matchingSocket.localPosition,
    localForward: matchingSocket.localForward,
    width,
    height: 2.45,
  };
}

function definition(options: DefinitionOptions): RoomDefinition {
  return {
    id: options.id,
    category: options.category,
    footprint: {
      width: options.width,
      depth: options.depth,
      height: options.height ?? 3.1,
    },
    sockets: options.sockets,
    weight: options.weight,
    minDepth: options.minDepth,
    maxConsecutive: options.maxConsecutive,
    tags: options.tags,
    geometryRecipe: options.geometryRecipe,
    lightingProfile: options.lightingProfile,
    audioProfile: options.audioProfile,
    anomalySlots: [
      {
        id: 'center-ceiling',
        kind: 'ceiling',
        localPosition: { x: 0, y: (options.height ?? 3.1) - 0.08, z: 0 },
      },
    ],
    exitCompatibleSurfaces: options.exitSurfaces ?? [],
  };
}

const corridorStraightNarrow = definition({
  id: 'corridor_straight_narrow',
  category: 'corridor',
  width: 4,
  depth: 8,
  sockets: [socket('north', 'north', 4, 8), socket('south', 'south', 4, 8)],
  weight: 1.15,
  minDepth: 0,
  maxConsecutive: 2,
  tags: ['common', 'straight', 'narrow'],
  geometryRecipe: { kind: 'straight-corridor', wallStyle: 'continuous', columnLayout: 'none' },
  lightingProfile: 'corridor-standard',
  audioProfile: 'narrow-office',
});

const corridorStraightWide = definition({
  id: 'corridor_straight_wide',
  category: 'corridor',
  width: 7,
  depth: 8,
  sockets: [
    socket('north-wide', 'north', 7, 8, WIDE_SOCKET_WIDTH),
    socket('south-wide', 'south', 7, 8, WIDE_SOCKET_WIDTH),
  ],
  weight: 0.75,
  minDepth: 2,
  maxConsecutive: 2,
  tags: ['common', 'straight', 'wide'],
  geometryRecipe: { kind: 'straight-corridor', wallStyle: 'segmented', columnLayout: 'none' },
  lightingProfile: 'corridor-wide',
  audioProfile: 'wide-office',
});

const corridorLong = definition({
  id: 'corridor_long',
  category: 'corridor',
  width: 4.2,
  depth: 16,
  sockets: [socket('north', 'north', 4.2, 16), socket('south', 'south', 4.2, 16)],
  weight: 0.25,
  minDepth: 7,
  maxConsecutive: 1,
  tags: ['uncommon', 'straight', 'long'],
  geometryRecipe: { kind: 'straight-corridor', wallStyle: 'segmented', columnLayout: 'none' },
  lightingProfile: 'corridor-long',
  audioProfile: 'long-office',
});

const corner90 = definition({
  id: 'corner_90',
  category: 'corner',
  width: 6,
  depth: 6,
  sockets: [socket('south', 'south', 6, 6), socket('east', 'east', 6, 6)],
  weight: 0.9,
  minDepth: 1,
  maxConsecutive: 2,
  tags: ['common', 'turn'],
  geometryRecipe: { kind: 'corner', wallStyle: 'continuous', columnLayout: 'none' },
  lightingProfile: 'corner-standard',
  audioProfile: 'corner-office',
});

const cornerOffset = definition({
  id: 'corner_offset',
  category: 'corner',
  width: 7,
  depth: 7,
  sockets: [
    socket('south-offset', 'south', 7, 7, STANDARD_SOCKET_WIDTH, -1.4),
    socket('north-offset', 'north', 7, 7, STANDARD_SOCKET_WIDTH, 1.4),
  ],
  weight: 0.7,
  minDepth: 3,
  maxConsecutive: 1,
  tags: ['common', 'offset'],
  geometryRecipe: { kind: 'offset-corridor', wallStyle: 'offset', columnLayout: 'none' },
  lightingProfile: 'offset-standard',
  audioProfile: 'offset-office',
});

const junctionT = definition({
  id: 'junction_t',
  category: 'junction',
  width: 8,
  depth: 8,
  sockets: [
    socket('south', 'south', 8, 8),
    socket('east', 'east', 8, 8),
    socket('west', 'west', 8, 8),
  ],
  weight: 0.58,
  minDepth: 4,
  maxConsecutive: 1,
  tags: ['common', 'branching'],
  geometryRecipe: { kind: 'junction', wallStyle: 'segmented', columnLayout: 'none' },
  lightingProfile: 'junction-standard',
  audioProfile: 'junction-office',
});

const junctionCross = definition({
  id: 'junction_cross',
  category: 'junction',
  width: 9,
  depth: 9,
  sockets: [
    socket('north', 'north', 9, 9),
    socket('east', 'east', 9, 9),
    socket('south', 'south', 9, 9),
    socket('west', 'west', 9, 9),
  ],
  weight: 0.28,
  minDepth: 8,
  maxConsecutive: 1,
  tags: ['uncommon', 'branching'],
  geometryRecipe: { kind: 'junction', wallStyle: 'segmented', columnLayout: 'none' },
  lightingProfile: 'junction-large',
  audioProfile: 'junction-open',
});

const roomSmallRect = definition({
  id: 'room_small_rect',
  category: 'room',
  width: 8,
  depth: 7,
  sockets: [
    socket('north', 'north', 8, 7),
    socket('south', 'south', 8, 7),
    socket('east', 'east', 8, 7),
  ],
  weight: 1,
  minDepth: 0,
  maxConsecutive: 2,
  tags: ['common', 'stable', 'exit-candidate'],
  geometryRecipe: { kind: 'rectangular-room', wallStyle: 'continuous', columnLayout: 'none' },
  lightingProfile: 'room-small',
  audioProfile: 'small-office',
  exitSurfaces: [exitSurface('west-wall', 'west', 8, 7)],
});

const roomMediumRect = definition({
  id: 'room_medium_rect',
  category: 'room',
  width: 12,
  depth: 10,
  sockets: [
    socket('north', 'north', 12, 10),
    socket('south', 'south', 12, 10),
    socket('east-wide', 'east', 12, 10, WIDE_SOCKET_WIDTH),
    socket('west-wide', 'west', 12, 10, WIDE_SOCKET_WIDTH),
  ],
  weight: 1,
  minDepth: 0,
  maxConsecutive: 2,
  tags: ['common', 'stable', 'exit-candidate'],
  geometryRecipe: { kind: 'rectangular-room', wallStyle: 'segmented', columnLayout: 'none' },
  lightingProfile: 'standard-medium',
  audioProfile: 'medium-office',
  exitSurfaces: [exitSurface('north-wall-left', 'north', 12, 10, 2.6, -3.6)],
});

const roomLargeOpen = definition({
  id: 'room_large_open',
  category: 'room',
  width: 16,
  depth: 14,
  height: 3.6,
  sockets: [
    socket('north', 'north', 16, 14),
    socket('south', 'south', 16, 14),
    socket('east-wide', 'east', 16, 14, WIDE_SOCKET_WIDTH),
    socket('west-wide', 'west', 16, 14, WIDE_SOCKET_WIDTH),
  ],
  weight: 0.32,
  minDepth: 10,
  maxConsecutive: 1,
  tags: ['uncommon', 'open', 'exit-candidate'],
  geometryRecipe: { kind: 'open-room', wallStyle: 'pillared', columnLayout: 'sparse' },
  lightingProfile: 'room-large',
  audioProfile: 'large-open-office',
  exitSurfaces: [exitSurface('far-wall', 'north', 16, 14, 3.2, 5)],
});

const roomDeadEnd = definition({
  id: 'room_dead_end',
  category: 'room',
  width: 7,
  depth: 6,
  sockets: [socket('south', 'south', 7, 6)],
  weight: 0.22,
  minDepth: 6,
  maxConsecutive: 1,
  tags: ['uncommon', 'dead-end', 'exit-candidate'],
  geometryRecipe: { kind: 'dead-end', wallStyle: 'continuous', columnLayout: 'none' },
  lightingProfile: 'dead-end',
  audioProfile: 'dead-end-office',
  exitSurfaces: [exitSurface('end-wall', 'north', 7, 6)],
});

const roomDoubleOffset = definition({
  id: 'room_double_offset',
  category: 'room',
  width: 11,
  depth: 9,
  sockets: [
    socket('south-left', 'south', 11, 9, STANDARD_SOCKET_WIDTH, -2.4),
    socket('north-right', 'north', 11, 9, STANDARD_SOCKET_WIDTH, 2.4),
    socket('east', 'east', 11, 9),
  ],
  weight: 0.45,
  minDepth: 5,
  maxConsecutive: 1,
  tags: ['uncommon', 'offset', 'exit-candidate'],
  geometryRecipe: { kind: 'double-offset', wallStyle: 'offset', columnLayout: 'none' },
  lightingProfile: 'double-offset',
  audioProfile: 'offset-office',
  exitSurfaces: [exitSurface('west-wall', 'west', 11, 9)],
});

const archGalleryShort = definition({
  id: 'arch_gallery_short',
  category: 'corridor',
  width: 7,
  depth: 10,
  height: 3.35,
  sockets: [socket('north', 'north', 7, 10), socket('south', 'south', 7, 10)],
  weight: 0.2,
  minDepth: 18,
  maxConsecutive: 1,
  tags: ['advanced', 'uncommon', 'arch', 'special'],
  geometryRecipe: { kind: 'straight-corridor', wallStyle: 'pillared', columnLayout: 'none' },
  lightingProfile: 'arch-gallery',
  audioProfile: 'large-open-office',
});

const archGalleryLong = definition({
  id: 'arch_gallery_long',
  category: 'corridor',
  width: 7.4,
  depth: 17,
  height: 3.5,
  sockets: [socket('north', 'north', 7.4, 17), socket('south', 'south', 7.4, 17)],
  weight: 0.12,
  minDepth: 28,
  maxConsecutive: 1,
  tags: ['advanced', 'uncommon', 'arch', 'long', 'special'],
  geometryRecipe: { kind: 'straight-corridor', wallStyle: 'pillared', columnLayout: 'none' },
  lightingProfile: 'arch-gallery',
  audioProfile: 'large-open-office',
});

const pillarGridSmall = definition({
  id: 'pillar_grid_small',
  category: 'room',
  width: 12,
  depth: 10,
  height: 3.45,
  sockets: [socket('north', 'north', 12, 10), socket('south', 'south', 12, 10)],
  weight: 0.18,
  minDepth: 22,
  maxConsecutive: 1,
  tags: ['advanced', 'uncommon', 'pillar-grid', 'special'],
  geometryRecipe: { kind: 'open-room', wallStyle: 'pillared', columnLayout: 'grid' },
  lightingProfile: 'pillar-hall',
  audioProfile: 'large-open-office',
  exitSurfaces: [exitSurface('west-wall', 'west', 12, 10, 2.8, 2.8)],
});

const pillarGridLarge = definition({
  id: 'pillar_grid_large',
  category: 'room',
  width: 18,
  depth: 16,
  height: 3.7,
  sockets: [
    socket('north-wide', 'north', 18, 16, WIDE_SOCKET_WIDTH),
    socket('south-wide', 'south', 18, 16, WIDE_SOCKET_WIDTH),
  ],
  weight: 0.1,
  minDepth: 38,
  maxConsecutive: 1,
  tags: ['advanced', 'uncommon', 'pillar-grid', 'large', 'special'],
  geometryRecipe: { kind: 'open-room', wallStyle: 'pillared', columnLayout: 'grid' },
  lightingProfile: 'pillar-hall',
  audioProfile: 'large-open-office',
  exitSurfaces: [exitSurface('far-wall', 'north', 18, 16, 3.2, 5.2)],
});

const lowCeilingSection = definition({
  id: 'low_ceiling_section',
  category: 'corridor',
  width: 4.6,
  depth: 9,
  height: 2.62,
  sockets: [socket('north', 'north', 4.6, 9), socket('south', 'south', 4.6, 9)],
  weight: 0.19,
  minDepth: 20,
  maxConsecutive: 1,
  tags: ['advanced', 'uncommon', 'low-ceiling', 'special'],
  geometryRecipe: { kind: 'straight-corridor', wallStyle: 'continuous', columnLayout: 'none' },
  lightingProfile: 'low-ceiling',
  audioProfile: 'narrow-office',
});

const highCeilingSection = definition({
  id: 'high_ceiling_section',
  category: 'room',
  width: 10,
  depth: 12,
  height: 4.4,
  sockets: [socket('north', 'north', 10, 12), socket('south', 'south', 10, 12)],
  weight: 0.14,
  minDepth: 26,
  maxConsecutive: 1,
  tags: ['advanced', 'uncommon', 'high-ceiling', 'special', 'exit-candidate'],
  geometryRecipe: { kind: 'open-room', wallStyle: 'segmented', columnLayout: 'sparse' },
  lightingProfile: 'high-ceiling',
  audioProfile: 'large-open-office',
  exitSurfaces: [exitSurface('west-wall', 'west', 10, 12, 3, -3.5)],
});

const dampDepression = definition({
  id: 'damp_depression',
  category: 'room',
  width: 10,
  depth: 9,
  sockets: [socket('north', 'north', 10, 9), socket('south', 'south', 10, 9)],
  weight: 0.17,
  minDepth: 24,
  maxConsecutive: 1,
  tags: ['advanced', 'uncommon', 'damp', 'special'],
  geometryRecipe: { kind: 'rectangular-room', wallStyle: 'offset', columnLayout: 'none' },
  lightingProfile: 'damp-room',
  audioProfile: 'dead-end-office',
});

const lightFailureCorridor = definition({
  id: 'light_failure_corridor',
  category: 'corridor',
  width: 4.4,
  depth: 13,
  sockets: [socket('north', 'north', 4.4, 13), socket('south', 'south', 4.4, 13)],
  weight: 0.13,
  minDepth: 34,
  maxConsecutive: 1,
  tags: ['advanced', 'uncommon', 'light-failure', 'special'],
  geometryRecipe: { kind: 'straight-corridor', wallStyle: 'segmented', columnLayout: 'none' },
  lightingProfile: 'light-failure',
  audioProfile: 'long-office',
});

const blackoutEdge = definition({
  id: 'blackout_edge',
  category: 'corridor',
  width: 7,
  depth: 9,
  sockets: [socket('north', 'north', 7, 9), socket('south', 'south', 7, 9)],
  weight: 0.08,
  minDepth: 52,
  maxConsecutive: 1,
  tags: ['advanced', 'uncommon', 'blackout', 'dangerous', 'special'],
  geometryRecipe: { kind: 'junction', wallStyle: 'offset', columnLayout: 'none' },
  lightingProfile: 'blackout-edge',
  audioProfile: 'dead-end-office',
});

const repetitionRoom = definition({
  id: 'repetition_room',
  category: 'room',
  width: 12,
  depth: 10,
  sockets: [socket('north', 'north', 12, 10), socket('south', 'south', 12, 10)],
  weight: 0.14,
  minDepth: 30,
  maxConsecutive: 1,
  tags: ['advanced', 'uncommon', 'repetition', 'special', 'exit-candidate'],
  geometryRecipe: { kind: 'rectangular-room', wallStyle: 'segmented', columnLayout: 'none' },
  lightingProfile: 'repetition-room',
  audioProfile: 'medium-office',
  exitSurfaces: [exitSurface('north-wall-left', 'north', 12, 10, 2.6, -3.6)],
});

export const CORE_ROOM_DEFINITION_IDS = [
  'corridor_straight_narrow',
  'corridor_straight_wide',
  'corridor_long',
  'corner_90',
  'corner_offset',
  'junction_t',
  'junction_cross',
  'room_small_rect',
  'room_medium_rect',
  'room_large_open',
  'room_dead_end',
  'room_double_offset',
] as const;

export type CoreRoomDefinitionId = (typeof CORE_ROOM_DEFINITION_IDS)[number];

export const ADVANCED_ROOM_DEFINITION_IDS = [
  'arch_gallery_short',
  'arch_gallery_long',
  'pillar_grid_small',
  'pillar_grid_large',
  'low_ceiling_section',
  'high_ceiling_section',
  'damp_depression',
  'light_failure_corridor',
  'blackout_edge',
  'repetition_room',
] as const;

export type AdvancedRoomDefinitionId = (typeof ADVANCED_ROOM_DEFINITION_IDS)[number];

export const ROOM_DEFINITIONS: readonly RoomDefinition[] = [
  corridorStraightNarrow,
  corridorStraightWide,
  corridorLong,
  corner90,
  cornerOffset,
  junctionT,
  junctionCross,
  roomSmallRect,
  roomMediumRect,
  roomLargeOpen,
  roomDeadEnd,
  roomDoubleOffset,
  archGalleryShort,
  archGalleryLong,
  pillarGridSmall,
  pillarGridLarge,
  lowCeilingSection,
  highCeilingSection,
  dampDepression,
  lightFailureCorridor,
  blackoutEdge,
  repetitionRoom,
];

const DEFINITIONS_BY_ID = new Map(ROOM_DEFINITIONS.map((item) => [item.id, item]));

export function getRoomDefinitions(): readonly RoomDefinition[] {
  return ROOM_DEFINITIONS;
}

export function findRoomDefinition(id: string): RoomDefinition | undefined {
  return DEFINITIONS_BY_ID.get(id);
}

export function getRoomDefinition(id: string): RoomDefinition {
  const result = findRoomDefinition(id);
  if (result === undefined) {
    throw new Error(`Unknown room definition: ${id}`);
  }
  return result;
}

export function validateRoomDefinition(roomDefinition: RoomDefinition): string[] {
  const issues: string[] = [];
  const { footprint } = roomDefinition;
  if (!(footprint.width > 0 && footprint.depth > 0 && footprint.height > 0)) {
    issues.push(`${roomDefinition.id}: footprint dimensions must be positive.`);
  }
  if (!(roomDefinition.weight > 0)) {
    issues.push(`${roomDefinition.id}: weight must be positive.`);
  }
  if (!Number.isInteger(roomDefinition.minDepth) || roomDefinition.minDepth < 0) {
    issues.push(`${roomDefinition.id}: minDepth must be a non-negative integer.`);
  }
  if (!Number.isInteger(roomDefinition.maxConsecutive) || roomDefinition.maxConsecutive < 1) {
    issues.push(`${roomDefinition.id}: maxConsecutive must be a positive integer.`);
  }

  const socketIds = new Set<string>();
  for (const roomSocket of roomDefinition.sockets) {
    if (socketIds.has(roomSocket.id)) {
      issues.push(`${roomDefinition.id}: duplicate socket id ${roomSocket.id}.`);
    }
    socketIds.add(roomSocket.id);

    if (!(roomSocket.width > 0 && roomSocket.height > 0)) {
      issues.push(`${roomDefinition.id}/${roomSocket.id}: socket dimensions must be positive.`);
    }
    const forwardLength = Math.hypot(roomSocket.localForward.x, roomSocket.localForward.z);
    const cardinal =
      Math.abs(forwardLength - 1) < 1e-9 &&
      (Math.abs(roomSocket.localForward.x) < 1e-9 || Math.abs(roomSocket.localForward.z) < 1e-9);
    if (!cardinal || Math.abs(roomSocket.localForward.y) > 1e-9) {
      issues.push(`${roomDefinition.id}/${roomSocket.id}: socket forward must be cardinal.`);
    }
  }

  return issues;
}

export function validateRoomCatalog(
  definitions: readonly RoomDefinition[] = ROOM_DEFINITIONS,
): string[] {
  const issues = definitions.flatMap(validateRoomDefinition);
  const ids = new Set<string>();
  for (const roomDefinition of definitions) {
    if (ids.has(roomDefinition.id)) {
      issues.push(`Duplicate room definition id: ${roomDefinition.id}.`);
    }
    ids.add(roomDefinition.id);
  }
  return issues;
}
