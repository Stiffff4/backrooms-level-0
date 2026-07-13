import { getRoomDefinitions, validateRoomCatalog } from './RoomCatalog';
import { SeedBank, type SeededRandom } from './SeedBank';
import {
  areSocketsCompatible,
  calculateAttachmentTransform,
  computeRoomAabb,
  getSocketWorldPose,
  roomAabbsOverlap,
  socketsAreAligned,
} from './SocketMath';
import type {
  GenerateRoomGraphOptions,
  RoomAabb,
  RoomDefinition,
  RoomGraph,
  RoomGraphConnection,
  RoomInstance,
  RoomSocket,
  SocketState,
  TransformData,
} from './procedural.types';

interface FrontierSocket {
  room: RoomInstance;
  definition: RoomDefinition;
  socket: RoomSocket;
}

interface PlacementCandidate {
  definition: RoomDefinition;
  incomingSocket: RoomSocket;
  transform: TransformData;
  aabb: RoomAabb;
  score: number;
}

interface AttemptState {
  graph: RoomGraph;
  definitionsById: ReadonlyMap<string, RoomDefinition>;
  aabbsByRoomId: Map<string, RoomAabb>;
  parentByRoomId: Map<string, string>;
  rng: SeededRandom;
  seedBank: SeedBank;
  specialCooldown: number;
  maxPlacementAttempts: number;
  frontierStrategy: 'balanced' | 'deep';
}

const MAX_GENERATION_RESTARTS = 12;
const GRAPH_VERSION = 1 as const;

function createSocketStates(definition: RoomDefinition): Record<string, SocketState> {
  return Object.fromEntries(
    definition.sockets.map((roomSocket) => [
      roomSocket.id,
      { status: 'open', connection: null } satisfies SocketState,
    ]),
  );
}

function createRoom(
  state: Pick<AttemptState, 'seedBank'>,
  definition: RoomDefinition,
  index: number,
  depth: number,
  worldTransform: TransformData,
): RoomInstance {
  const id = `room-${String(index).padStart(4, '0')}`;
  return {
    id,
    definitionId: definition.id,
    seed: state.seedBank.derive('world', id),
    depth,
    worldTransform,
    socketStates: createSocketStates(definition),
    visitState: index === 0 ? 'visible' : 'unvisited',
    spawnedAt: index,
  };
}

function validateOptions(options: GenerateRoomGraphOptions): void {
  if (!Number.isInteger(options.targetRooms) || options.targetRooms < 1) {
    throw new Error('targetRooms must be a positive integer.');
  }
  if (options.targetRooms > 2048) {
    throw new Error('targetRooms cannot exceed the logical safety limit of 2048.');
  }
  if (
    options.maxPlacementAttempts !== undefined &&
    (!Number.isInteger(options.maxPlacementAttempts) || options.maxPlacementAttempts < 1)
  ) {
    throw new Error('maxPlacementAttempts must be a positive integer.');
  }
}

function getDefinitionMap(
  definitions: readonly RoomDefinition[],
): ReadonlyMap<string, RoomDefinition> {
  return new Map(definitions.map((definition) => [definition.id, definition]));
}

function getOpenFrontiers(state: AttemptState): FrontierSocket[] {
  const result: FrontierSocket[] = [];
  for (const room of state.graph.rooms) {
    const definition = state.definitionsById.get(room.definitionId);
    if (definition === undefined) {
      continue;
    }
    for (const roomSocket of definition.sockets) {
      if (room.socketStates[roomSocket.id]?.status === 'open') {
        result.push({ room, definition, socket: roomSocket });
      }
    }
  }
  return result;
}

function countTrailingDefinitions(ids: readonly string[], definitionId: string): number {
  let count = 0;
  for (let index = ids.length - 1; index >= 0; index -= 1) {
    if (ids[index] !== definitionId) {
      break;
    }
    count += 1;
  }
  return count;
}

function getLineageDefinitionIds(state: AttemptState, room: RoomInstance): string[] {
  const ids: string[] = [];
  let current: RoomInstance | undefined = room;
  const roomsById = new Map(state.graph.rooms.map((item) => [item.id, item]));
  while (current !== undefined) {
    ids.push(current.definitionId);
    const parentId = state.parentByRoomId.get(current.id);
    current = parentId === undefined ? undefined : roomsById.get(parentId);
  }
  return ids.reverse();
}

function countTrailingStraight(
  definitionIds: readonly string[],
  definitionsById: ReadonlyMap<string, RoomDefinition>,
): number {
  let count = 0;
  for (let index = definitionIds.length - 1; index >= 0; index -= 1) {
    const id = definitionIds[index];
    if (id === undefined || !definitionsById.get(id)?.tags.includes('straight')) {
      break;
    }
    count += 1;
  }
  return count;
}

function violatesRepetition(
  state: AttemptState,
  parentRoom: RoomInstance,
  candidate: RoomDefinition,
): boolean {
  const generationIds = state.graph.rooms.map((room) => room.definitionId);
  const lineageIds = getLineageDefinitionIds(state, parentRoom);
  const effectiveMax = Math.min(2, candidate.maxConsecutive);
  if (
    countTrailingDefinitions(generationIds, candidate.id) >= effectiveMax ||
    countTrailingDefinitions(lineageIds, candidate.id) >= effectiveMax
  ) {
    return true;
  }

  if (candidate.tags.includes('straight')) {
    return (
      countTrailingStraight(generationIds, state.definitionsById) >= 3 ||
      countTrailingStraight(lineageIds, state.definitionsById) >= 3
    );
  }

  return false;
}

function calculateWeight(
  state: AttemptState,
  parentRoom: RoomInstance,
  candidate: RoomDefinition,
): number {
  const previousDefinition = state.definitionsById.get(parentRoom.definitionId);
  let score = candidate.weight;

  if (candidate.id === parentRoom.definitionId) {
    score *= 0.3;
  } else if (candidate.category === previousDefinition?.category) {
    score *= 0.72;
  }

  const recentRooms = state.graph.rooms.slice(-5);
  const recentJunctions = recentRooms.filter(
    (room) => state.definitionsById.get(room.definitionId)?.category === 'junction',
  ).length;
  if (candidate.category === 'junction') {
    score *= 1 / (1 + recentJunctions * 0.8);
  }

  const remainingRooms = state.graph.rooms.length;
  const openFrontierCount = getOpenFrontiers(state).length;
  if (candidate.tags.includes('dead-end') && openFrontierCount <= 1 && remainingRooms > 0) {
    return 0;
  }

  return score;
}

function candidateOverlapsExisting(state: AttemptState, candidateAabb: RoomAabb): boolean {
  for (const existingAabb of state.aabbsByRoomId.values()) {
    if (roomAabbsOverlap(existingAabb, candidateAabb)) {
      return true;
    }
  }
  return false;
}

function buildCandidates(state: AttemptState, frontier: FrontierSocket): PlacementCandidate[] {
  const targetPose = getSocketWorldPose(frontier.socket, frontier.room.worldTransform);
  const nextDepth = frontier.room.depth + 1;
  const candidates: PlacementCandidate[] = [];
  let attempts = 0;

  for (const definition of state.definitionsById.values()) {
    if (definition.minDepth > nextDepth || violatesRepetition(state, frontier.room, definition)) {
      continue;
    }
    if (state.specialCooldown > 0 && definition.tags.includes('uncommon')) {
      continue;
    }

    for (const incomingSocket of definition.sockets) {
      if (attempts >= state.maxPlacementAttempts) {
        return candidates;
      }
      attempts += 1;
      state.graph.generationStats.attemptedPlacements += 1;

      if (!areSocketsCompatible(frontier.socket, incomingSocket)) {
        continue;
      }

      const transform = calculateAttachmentTransform(targetPose, incomingSocket);
      if (transform === null) {
        continue;
      }
      const candidatePose = getSocketWorldPose(incomingSocket, transform);
      if (!socketsAreAligned(targetPose, candidatePose)) {
        continue;
      }

      const aabb = computeRoomAabb(definition, transform);
      if (candidateOverlapsExisting(state, aabb)) {
        state.graph.generationStats.rejectedOverlaps += 1;
        continue;
      }

      const score = calculateWeight(state, frontier.room, definition);
      if (score > 0) {
        candidates.push({ definition, incomingSocket, transform, aabb, score });
      }
    }
  }

  return candidates;
}

function connectPlacement(
  state: AttemptState,
  frontier: FrontierSocket,
  placement: PlacementCandidate,
): void {
  const roomIndex = state.graph.rooms.length;
  const room = createRoom(
    state,
    placement.definition,
    roomIndex,
    frontier.room.depth + 1,
    placement.transform,
  );
  const sourceState = frontier.room.socketStates[frontier.socket.id];
  const targetState = room.socketStates[placement.incomingSocket.id];
  if (sourceState === undefined || targetState === undefined) {
    throw new Error('Cannot connect a room through an unknown socket.');
  }

  sourceState.status = 'connected';
  sourceState.connection = { roomId: room.id, socketId: placement.incomingSocket.id };
  targetState.status = 'connected';
  targetState.connection = { roomId: frontier.room.id, socketId: frontier.socket.id };

  const connection: RoomGraphConnection = {
    id: `connection-${String(state.graph.connections.length).padStart(4, '0')}`,
    roomAId: frontier.room.id,
    socketAId: frontier.socket.id,
    roomBId: room.id,
    socketBId: placement.incomingSocket.id,
  };
  state.graph.rooms.push(room);
  state.graph.connections.push(connection);
  state.aabbsByRoomId.set(room.id, placement.aabb);
  state.parentByRoomId.set(room.id, frontier.room.id);

  if (placement.definition.tags.includes('uncommon')) {
    state.specialCooldown = state.rng.int(2, 6);
  } else if (state.specialCooldown > 0) {
    state.specialCooldown -= 1;
  }
}

function sealFrontier(state: AttemptState, frontier: FrontierSocket): void {
  const socketState = frontier.room.socketStates[frontier.socket.id];
  if (socketState?.status === 'open') {
    socketState.status = 'sealed';
    state.graph.generationStats.sealedSockets += 1;
  }
}

function orderFrontiers(
  state: AttemptState,
  frontiers: readonly FrontierSocket[],
): FrontierSocket[] {
  if (state.graph.rooms.length === 1) {
    const north = frontiers.find(
      (frontier) => frontier.room.id === state.graph.startRoomId && frontier.socket.id === 'north',
    );
    if (north !== undefined) {
      return [north, ...frontiers.filter((frontier) => frontier !== north)];
    }
  }

  const shuffled = state.rng.shuffle(frontiers);
  // Keep occasional side-branch growth so the maze does not collapse into one
  // corridor, while making the production strategy reliably expose a long
  // traversal spine for streaming and the eventual exit director.
  if (state.frontierStrategy !== 'deep' || state.graph.rooms.length % 8 === 0) {
    return shuffled;
  }

  return shuffled.sort((left, right) => right.room.depth - left.room.depth);
}

function createAttemptState(
  options: GenerateRoomGraphOptions,
  definitions: readonly RoomDefinition[],
  attempt: number,
): AttemptState {
  const seedBank = new SeedBank(options.seed);
  const definitionsById = getDefinitionMap(definitions);
  const startDefinition =
    definitionsById.get('room_medium_rect') ??
    definitions.find((definition) => definition.minDepth === 0 && definition.sockets.length > 0);
  if (startDefinition === undefined) {
    throw new Error('The room catalog has no valid starting definition.');
  }

  const graph: RoomGraph = {
    version: GRAPH_VERSION,
    seed: seedBank.seed,
    startRoomId: 'room-0000',
    rooms: [],
    connections: [],
    generationStats: {
      attemptedPlacements: 0,
      rejectedOverlaps: 0,
      sealedSockets: 0,
    },
  };
  const state: AttemptState = {
    graph,
    definitionsById,
    aabbsByRoomId: new Map(),
    parentByRoomId: new Map(),
    rng: seedBank.createRng('world', `layout-${attempt}`),
    seedBank,
    specialCooldown: 0,
    maxPlacementAttempts: options.maxPlacementAttempts ?? Number.POSITIVE_INFINITY,
    frontierStrategy: options.frontierStrategy ?? 'balanced',
  };

  const startRoom = createRoom(state, startDefinition, 0, 0, {
    position: { x: 0, y: 0, z: 0 },
    rotationQuarterTurns: 0,
  });
  graph.rooms.push(startRoom);
  state.aabbsByRoomId.set(startRoom.id, computeRoomAabb(startDefinition, startRoom.worldTransform));
  return state;
}

function runGenerationAttempt(
  options: GenerateRoomGraphOptions,
  definitions: readonly RoomDefinition[],
  attempt: number,
): RoomGraph | null {
  const state = createAttemptState(options, definitions, attempt);

  while (state.graph.rooms.length < options.targetRooms) {
    const frontiers = orderFrontiers(state, getOpenFrontiers(state));
    if (frontiers.length === 0) {
      return null;
    }

    let placed = false;
    for (const frontier of frontiers) {
      const candidates = buildCandidates(state, frontier);
      if (candidates.length === 0) {
        sealFrontier(state, frontier);
        continue;
      }

      const placement = state.rng.weightedPick(candidates, (candidate) => candidate.score);
      connectPlacement(state, frontier, placement);
      placed = true;
      break;
    }

    if (!placed && getOpenFrontiers(state).length === 0) {
      return null;
    }
  }

  return state.graph;
}

export function generateRoomGraph(options: GenerateRoomGraphOptions): RoomGraph {
  validateOptions(options);
  const definitions = options.definitions ?? getRoomDefinitions();
  if (definitions.length === 0) {
    throw new Error('Cannot generate a room graph from an empty catalog.');
  }
  const catalogIssues = validateRoomCatalog(definitions);
  if (catalogIssues.length > 0) {
    throw new Error(`Invalid room catalog:\n${catalogIssues.join('\n')}`);
  }

  for (let attempt = 0; attempt < MAX_GENERATION_RESTARTS; attempt += 1) {
    const graph = runGenerationAttempt(options, definitions, attempt);
    if (graph !== null) {
      return graph;
    }
  }

  throw new Error(
    `Unable to embed ${options.targetRooms} rooms for seed ${String(options.seed)} without overlap.`,
  );
}

export function validateRoomGraph(
  graph: RoomGraph,
  definitions: readonly RoomDefinition[] = getRoomDefinitions(),
): string[] {
  const issues: string[] = [];
  const definitionsById = getDefinitionMap(definitions);
  const roomsById = new Map(graph.rooms.map((room) => [room.id, room]));

  if (!roomsById.has(graph.startRoomId)) {
    issues.push(`Missing start room ${graph.startRoomId}.`);
  }
  if (roomsById.size !== graph.rooms.length) {
    issues.push('Room ids are not unique.');
  }

  const adjacency = new Map<string, Set<string>>(
    graph.rooms.map((room) => [room.id, new Set<string>()]),
  );
  const connectionIds = new Set<string>();
  const connectedSocketKeys = new Set<string>();
  for (const connection of graph.connections) {
    if (connectionIds.has(connection.id)) {
      issues.push(`Duplicate connection id: ${connection.id}.`);
    }
    connectionIds.add(connection.id);

    const firstRoom = roomsById.get(connection.roomAId);
    const secondRoom = roomsById.get(connection.roomBId);
    if (firstRoom === undefined || secondRoom === undefined) {
      issues.push(`${connection.id}: connection references an unknown room.`);
      continue;
    }
    const firstDefinition = definitionsById.get(firstRoom.definitionId);
    const secondDefinition = definitionsById.get(secondRoom.definitionId);
    if (firstDefinition === undefined || secondDefinition === undefined) {
      issues.push(`${connection.id}: connection references an unknown definition.`);
      continue;
    }
    const firstSocket = firstDefinition.sockets.find(
      (roomSocket) => roomSocket.id === connection.socketAId,
    );
    const secondSocket = secondDefinition.sockets.find(
      (roomSocket) => roomSocket.id === connection.socketBId,
    );
    if (firstSocket === undefined || secondSocket === undefined) {
      issues.push(`${connection.id}: connection references an unknown socket.`);
      continue;
    }
    if (!areSocketsCompatible(firstSocket, secondSocket)) {
      issues.push(`${connection.id}: sockets are not compatible.`);
    }

    const firstSocketKey = `${firstRoom.id}\u0000${firstSocket.id}`;
    const secondSocketKey = `${secondRoom.id}\u0000${secondSocket.id}`;
    if (connectedSocketKeys.has(firstSocketKey) || connectedSocketKeys.has(secondSocketKey)) {
      issues.push(`${connection.id}: a socket is used by more than one connection.`);
    }
    connectedSocketKeys.add(firstSocketKey);
    connectedSocketKeys.add(secondSocketKey);

    const firstState = firstRoom.socketStates[firstSocket.id];
    const secondState = secondRoom.socketStates[secondSocket.id];
    const reciprocal =
      firstState?.status === 'connected' &&
      secondState?.status === 'connected' &&
      firstState.connection?.roomId === secondRoom.id &&
      firstState.connection.socketId === secondSocket.id &&
      secondState.connection?.roomId === firstRoom.id &&
      secondState.connection.socketId === firstSocket.id;
    if (!reciprocal) {
      issues.push(`${connection.id}: socket states are not reciprocal.`);
    }

    const firstPose = getSocketWorldPose(firstSocket, firstRoom.worldTransform);
    const secondPose = getSocketWorldPose(secondSocket, secondRoom.worldTransform);
    if (!socketsAreAligned(firstPose, secondPose)) {
      issues.push(`${connection.id}: sockets are not aligned.`);
    }
    adjacency.get(firstRoom.id)?.add(secondRoom.id);
    adjacency.get(secondRoom.id)?.add(firstRoom.id);
  }

  const visited = new Set<string>();
  const queue = roomsById.has(graph.startRoomId) ? [graph.startRoomId] : [];
  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined || visited.has(id)) {
      continue;
    }
    visited.add(id);
    for (const neighbor of adjacency.get(id) ?? []) {
      queue.push(neighbor);
    }
  }
  if (visited.size !== graph.rooms.length) {
    issues.push(`Graph is disconnected: reached ${visited.size}/${graph.rooms.length} rooms.`);
  }

  const aabbs = graph.rooms.flatMap((room) => {
    const definition = definitionsById.get(room.definitionId);
    return definition === undefined
      ? []
      : [{ room, aabb: computeRoomAabb(definition, room.worldTransform) }];
  });
  for (let firstIndex = 0; firstIndex < aabbs.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < aabbs.length; secondIndex += 1) {
      const first = aabbs[firstIndex];
      const second = aabbs[secondIndex];
      if (
        first !== undefined &&
        second !== undefined &&
        roomAabbsOverlap(first.aabb, second.aabb)
      ) {
        issues.push(`${first.room.id} overlaps ${second.room.id}.`);
      }
    }
  }

  for (const room of graph.rooms) {
    if (![0, 1, 2, 3].includes(room.worldTransform.rotationQuarterTurns)) {
      issues.push(`${room.id}: transform is not a quarter turn.`);
    }
    const definition = definitionsById.get(room.definitionId);
    if (definition === undefined) {
      issues.push(`${room.id}: unknown definition ${room.definitionId}.`);
      continue;
    }
    if (room.depth < definition.minDepth) {
      issues.push(
        `${room.id}: depth ${room.depth} is below ${definition.id}.minDepth ${definition.minDepth}.`,
      );
    }
    if (
      !Number.isFinite(room.worldTransform.position.x) ||
      !Number.isFinite(room.worldTransform.position.y) ||
      !Number.isFinite(room.worldTransform.position.z)
    ) {
      issues.push(`${room.id}: transform position is not finite.`);
    }
    for (const roomSocket of definition.sockets) {
      const state = room.socketStates[roomSocket.id];
      if (state === undefined) {
        issues.push(`${room.id}: missing socket state ${roomSocket.id}.`);
      } else if (state.status !== 'connected' && state.connection !== null) {
        issues.push(`${room.id}/${roomSocket.id}: non-connected socket has a connection.`);
      } else if (state.status === 'connected') {
        if (state.connection === null) {
          issues.push(`${room.id}/${roomSocket.id}: connected socket has no connection.`);
        } else if (!connectedSocketKeys.has(`${room.id}\u0000${roomSocket.id}`)) {
          issues.push(`${room.id}/${roomSocket.id}: connection is absent from graph edges.`);
        }
      }
    }
  }

  return issues;
}

export function assertValidRoomGraph(
  graph: RoomGraph,
  definitions: readonly RoomDefinition[] = getRoomDefinitions(),
): void {
  const issues = validateRoomGraph(graph, definitions);
  if (issues.length > 0) {
    throw new Error(`Invalid room graph:\n${issues.join('\n')}`);
  }
}

export function getRoomGraphSignature(graph: RoomGraph): string {
  return JSON.stringify({
    version: graph.version,
    seed: graph.seed,
    startRoomId: graph.startRoomId,
    rooms: graph.rooms.map((room) => ({
      id: room.id,
      definitionId: room.definitionId,
      depth: room.depth,
      transform: room.worldTransform,
      sockets: room.socketStates,
    })),
    connections: graph.connections,
  });
}
