import { describe, expect, it } from 'vitest';
import { getRoomDefinition, ROOM_DEFINITIONS } from '../../src/procedural/RoomCatalog';
import {
  assertValidRoomGraph,
  generateRoomGraph,
  getRoomGraphSignature,
  validateRoomGraph,
} from '../../src/procedural/RoomGraphGenerator';
import {
  computeRoomAabb,
  getSocketWorldPose,
  roomAabbsOverlap,
  socketsAreAligned,
} from '../../src/procedural/SocketMath';
import type {
  RoomGraph,
  RoomInstance,
  RoomSocket,
  SeedInput,
  SocketWorldPose,
} from '../../src/procedural/procedural.types';

const SEED_COUNT = 320;
const MIN_TARGET_ROOMS = 36;
const TARGET_VARIATION = 13;
const ALIGNMENT_EPSILON = 1e-5;

function invariantFailure(seed: SeedInput, message: string): never {
  throw new Error(`[seed=${String(seed)}] ${message}`);
}

function requireRoom(
  roomsById: ReadonlyMap<string, RoomInstance>,
  roomId: string,
  seed: SeedInput,
): RoomInstance {
  const room = roomsById.get(roomId);
  if (room === undefined) {
    return invariantFailure(seed, `connection references missing room ${roomId}`);
  }
  return room;
}

function requireSocket(room: RoomInstance, socketId: string, seed: SeedInput): RoomSocket {
  const socket = getRoomDefinition(room.definitionId).sockets.find(
    (candidate) => candidate.id === socketId,
  );
  if (socket === undefined) {
    return invariantFailure(seed, `${room.id} references missing socket ${socketId}`);
  }
  return socket;
}

function almostEqual(first: number, second: number): boolean {
  return Math.abs(first - second) <= ALIGNMENT_EPSILON;
}

function assertSocketPosesAligned(
  first: SocketWorldPose,
  second: SocketWorldPose,
  seed: SeedInput,
  connectionId: string,
): void {
  if (!socketsAreAligned(first, second, ALIGNMENT_EPSILON)) {
    invariantFailure(seed, `${connectionId} socket helper reports misalignment`);
  }

  const positionsMatch =
    almostEqual(first.position.x, second.position.x) &&
    almostEqual(first.position.y, second.position.y) &&
    almostEqual(first.position.z, second.position.z);
  const forwardsOppose =
    almostEqual(first.forward.x, -second.forward.x) &&
    almostEqual(first.forward.y, -second.forward.y) &&
    almostEqual(first.forward.z, -second.forward.z);
  const aperturesMatch =
    almostEqual(first.width, second.width) && almostEqual(first.height, second.height);

  if (!positionsMatch || !forwardsOppose || !aperturesMatch) {
    invariantFailure(
      seed,
      `${connectionId} has mismatched position, forward vector, width, or height`,
    );
  }
}

function assertConnected(graph: RoomGraph, seed: SeedInput): void {
  const adjacency = new Map(graph.rooms.map((room) => [room.id, new Set<string>()]));
  for (const connection of graph.connections) {
    adjacency.get(connection.roomAId)?.add(connection.roomBId);
    adjacency.get(connection.roomBId)?.add(connection.roomAId);
  }

  const visited = new Set<string>();
  const pending = [graph.startRoomId];
  while (pending.length > 0) {
    const roomId = pending.pop();
    if (roomId === undefined || visited.has(roomId)) {
      continue;
    }
    visited.add(roomId);
    for (const neighbor of adjacency.get(roomId) ?? []) {
      pending.push(neighbor);
    }
  }

  if (visited.size !== graph.rooms.length) {
    invariantFailure(seed, `graph reaches only ${visited.size}/${graph.rooms.length} rooms`);
  }
}

function assertGraphInvariants(
  graph: RoomGraph,
  seed: SeedInput,
  targetRooms: number,
  observedDefinitions: Set<string>,
): void {
  if (graph.rooms.length !== targetRooms || graph.rooms.length > targetRooms) {
    invariantFailure(
      seed,
      `expected exactly ${targetRooms} bounded rooms, received ${graph.rooms.length}`,
    );
  }
  if (graph.connections.length !== targetRooms - 1) {
    invariantFailure(
      seed,
      `expected ${targetRooms - 1} tree edges, received ${graph.connections.length}`,
    );
  }

  const roomIds = new Set(graph.rooms.map((room) => room.id));
  const connectionIds = new Set(graph.connections.map((connection) => connection.id));
  if (roomIds.size !== graph.rooms.length) {
    invariantFailure(seed, 'room ids are not unique');
  }
  if (connectionIds.size !== graph.connections.length) {
    invariantFailure(seed, 'connection ids are not unique');
  }
  if (!roomIds.has(graph.startRoomId)) {
    invariantFailure(seed, `start room ${graph.startRoomId} does not exist`);
  }

  const firstConnection = graph.connections[0];
  if (
    firstConnection === undefined ||
    firstConnection.roomAId !== graph.startRoomId ||
    firstConnection.socketAId !== 'north'
  ) {
    invariantFailure(seed, 'first placement must leave the start room through its north socket');
  }

  assertConnected(graph, seed);
  const roomsById = new Map(graph.rooms.map((room) => [room.id, room]));
  const occupiedSocketKeys = new Set<string>();

  for (const connection of graph.connections) {
    const firstRoom = requireRoom(roomsById, connection.roomAId, seed);
    const secondRoom = requireRoom(roomsById, connection.roomBId, seed);
    const firstSocket = requireSocket(firstRoom, connection.socketAId, seed);
    const secondSocket = requireSocket(secondRoom, connection.socketBId, seed);
    const firstKey = `${firstRoom.id}/${firstSocket.id}`;
    const secondKey = `${secondRoom.id}/${secondSocket.id}`;

    if (occupiedSocketKeys.has(firstKey) || occupiedSocketKeys.has(secondKey)) {
      invariantFailure(seed, `${connection.id} reuses an occupied socket`);
    }
    occupiedSocketKeys.add(firstKey);
    occupiedSocketKeys.add(secondKey);

    const firstState = firstRoom.socketStates[firstSocket.id];
    const secondState = secondRoom.socketStates[secondSocket.id];
    if (
      firstState?.status !== 'connected' ||
      firstState.connection?.roomId !== secondRoom.id ||
      firstState.connection.socketId !== secondSocket.id ||
      secondState?.status !== 'connected' ||
      secondState.connection?.roomId !== firstRoom.id ||
      secondState.connection.socketId !== firstSocket.id
    ) {
      invariantFailure(seed, `${connection.id} socket state is not reciprocal`);
    }

    assertSocketPosesAligned(
      getSocketWorldPose(firstSocket, firstRoom.worldTransform),
      getSocketWorldPose(secondSocket, secondRoom.worldTransform),
      seed,
      connection.id,
    );
  }

  let connectedSocketCount = 0;
  let previousDefinitionId = '';
  let consecutiveDefinitions = 0;
  const aabbs = graph.rooms.map((room) => ({
    room,
    aabb: computeRoomAabb(getRoomDefinition(room.definitionId), room.worldTransform),
  }));

  for (const room of graph.rooms) {
    const definition = getRoomDefinition(room.definitionId);
    observedDefinitions.add(definition.id);
    if (room.definitionId === previousDefinitionId) {
      consecutiveDefinitions += 1;
    } else {
      previousDefinitionId = room.definitionId;
      consecutiveDefinitions = 1;
    }
    if (consecutiveDefinitions > Math.min(2, definition.maxConsecutive)) {
      invariantFailure(
        seed,
        `${definition.id} appears ${consecutiveDefinitions} times consecutively`,
      );
    }

    for (const socket of definition.sockets) {
      const state = room.socketStates[socket.id];
      if (state === undefined) {
        invariantFailure(seed, `${room.id} is missing state for socket ${socket.id}`);
      }
      if (state.status === 'connected') {
        connectedSocketCount += 1;
        if (state.connection === null || !occupiedSocketKeys.has(`${room.id}/${socket.id}`)) {
          invariantFailure(seed, `${room.id}/${socket.id} has an orphan connected state`);
        }
      } else if (state.connection !== null) {
        invariantFailure(
          seed,
          `${room.id}/${socket.id} is ${state.status} but retains a connection`,
        );
      }
    }
  }

  if (connectedSocketCount !== graph.connections.length * 2) {
    invariantFailure(seed, 'connected socket count does not match reciprocal graph edges');
  }

  for (let firstIndex = 0; firstIndex < aabbs.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < aabbs.length; secondIndex += 1) {
      const first = aabbs[firstIndex];
      const second = aabbs[secondIndex];
      if (
        first !== undefined &&
        second !== undefined &&
        roomAabbsOverlap(first.aabb, second.aabb)
      ) {
        invariantFailure(seed, `${first.room.id} AABB overlaps ${second.room.id}`);
      }
    }
  }
}

describe('RoomGraphGenerator property sweep', () => {
  it(`mantiene invariantes y determinismo en ${SEED_COUNT} seeds`, () => {
    const observedDefinitions = new Set<string>();

    for (let index = 0; index < SEED_COUNT; index += 1) {
      const seed: SeedInput = index % 2 === 0 ? index : `property-layout-${index}`;
      const targetRooms = MIN_TARGET_ROOMS + (index % TARGET_VARIATION);
      const graph = generateRoomGraph({ seed, targetRooms });

      assertGraphInvariants(graph, seed, targetRooms, observedDefinitions);
      expect(validateRoomGraph(graph), `seed=${String(seed)}`).toEqual([]);
      expect(() => assertValidRoomGraph(graph), `seed=${String(seed)}`).not.toThrow();

      const repeated = generateRoomGraph({ seed, targetRooms });
      expect(getRoomGraphSignature(repeated), `seed=${String(seed)}`).toBe(
        getRoomGraphSignature(graph),
      );
      expect(JSON.stringify(repeated), `seed=${String(seed)}`).toBe(JSON.stringify(graph));
    }

    const catalogIds = ROOM_DEFINITIONS.map((definition) => definition.id);
    expect(catalogIds).toHaveLength(12);
    expect([...observedDefinitions].sort()).toEqual([...catalogIds].sort());
  }, 120_000);
});
