import { describe, expect, it } from 'vitest';
import { getRoomDefinition } from '../../src/procedural/RoomCatalog';
import {
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

describe('RoomGraphGenerator', () => {
  it('genera un grafo conectado, recíproco, alineado y sin solapes', () => {
    const graph = generateRoomGraph({ seed: 'connected-level-zero', targetRooms: 48 });

    expect(graph.rooms).toHaveLength(48);
    expect(graph.connections).toHaveLength(47);
    expect(graph.startRoomId).toBe('room-0000');
    expect(graph.connections[0]).toMatchObject({
      roomAId: graph.startRoomId,
      socketAId: 'north',
    });
    expect(validateRoomGraph(graph)).toEqual([]);

    const roomsById = new Map(graph.rooms.map((room) => [room.id, room]));
    for (const connection of graph.connections) {
      const firstRoom = roomsById.get(connection.roomAId);
      const secondRoom = roomsById.get(connection.roomBId);
      expect(firstRoom).toBeDefined();
      expect(secondRoom).toBeDefined();
      if (firstRoom === undefined || secondRoom === undefined) {
        continue;
      }

      const firstSocket = getRoomDefinition(firstRoom.definitionId).sockets.find(
        (roomSocket) => roomSocket.id === connection.socketAId,
      );
      const secondSocket = getRoomDefinition(secondRoom.definitionId).sockets.find(
        (roomSocket) => roomSocket.id === connection.socketBId,
      );
      expect(firstSocket).toBeDefined();
      expect(secondSocket).toBeDefined();
      if (firstSocket === undefined || secondSocket === undefined) {
        continue;
      }

      expect(firstRoom.socketStates[firstSocket.id]).toEqual({
        status: 'connected',
        connection: { roomId: secondRoom.id, socketId: secondSocket.id },
      });
      expect(secondRoom.socketStates[secondSocket.id]).toEqual({
        status: 'connected',
        connection: { roomId: firstRoom.id, socketId: firstSocket.id },
      });
      expect(
        socketsAreAligned(
          getSocketWorldPose(firstSocket, firstRoom.worldTransform),
          getSocketWorldPose(secondSocket, secondRoom.worldTransform),
        ),
      ).toBe(true);
    }

    for (let firstIndex = 0; firstIndex < graph.rooms.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < graph.rooms.length; secondIndex += 1) {
        const firstRoom = graph.rooms[firstIndex];
        const secondRoom = graph.rooms[secondIndex];
        if (firstRoom === undefined || secondRoom === undefined) {
          continue;
        }
        expect(
          roomAabbsOverlap(
            computeRoomAabb(getRoomDefinition(firstRoom.definitionId), firstRoom.worldTransform),
            computeRoomAabb(getRoomDefinition(secondRoom.definitionId), secondRoom.worldTransform),
          ),
          `${firstRoom.id} overlaps ${secondRoom.id}`,
        ).toBe(false);
      }
    }
  });

  it('produce la misma firma con la misma seed y otra distribución con seeds distintas', () => {
    const first = generateRoomGraph({ seed: 'repeatable', targetRooms: 40 });
    const repeated = generateRoomGraph({ seed: 'repeatable', targetRooms: 40 });
    const different = generateRoomGraph({ seed: 'different', targetRooms: 40 });

    expect(getRoomGraphSignature(repeated)).toBe(getRoomGraphSignature(first));
    expect(getRoomGraphSignature(different)).not.toBe(getRoomGraphSignature(first));
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });

  it('respeta profundidad mínima, cuartos de vuelta y límites anti-repetición', () => {
    const graph = generateRoomGraph({ seed: 8675309, targetRooms: 80 });
    let previousId = '';
    let repetitions = 0;

    for (const room of graph.rooms) {
      const definition = getRoomDefinition(room.definitionId);
      expect(room.depth).toBeGreaterThanOrEqual(definition.minDepth);
      expect([0, 1, 2, 3]).toContain(room.worldTransform.rotationQuarterTurns);

      if (room.definitionId === previousId) {
        repetitions += 1;
      } else {
        previousId = room.definitionId;
        repetitions = 1;
      }
      expect(repetitions).toBeLessThanOrEqual(Math.min(2, definition.maxConsecutive));

      for (const socketState of Object.values(room.socketStates)) {
        expect(['open', 'connected', 'sealed']).toContain(socketState.status);
        if (socketState.status !== 'connected') {
          expect(socketState.connection).toBeNull();
        }
      }
    }
    expect(validateRoomGraph(graph)).toEqual([]);
  });

  it('rechaza configuraciones que no pueden generar un grafo válido', () => {
    expect(() => generateRoomGraph({ seed: 'bad', targetRooms: 0 })).toThrow(/targetRooms/);
    expect(() => generateRoomGraph({ seed: 'bad', targetRooms: 2, definitions: [] })).toThrow(
      /empty catalog/,
    );
  });

  it('detecta conexiones cuyos tags de paso son incompatibles', () => {
    const graph = generateRoomGraph({ seed: 'incompatible-validator', targetRooms: 2 });
    const connection = graph.connections[0];
    const firstRoom = graph.rooms.find((room) => room.id === connection?.roomAId);
    const secondRoom = graph.rooms.find((room) => room.id === connection?.roomBId);
    expect(connection).toBeDefined();
    expect(firstRoom).toBeDefined();
    expect(secondRoom).toBeDefined();
    if (!connection || !firstRoom || !secondRoom) {
      return;
    }

    const firstDefinition = getRoomDefinition(firstRoom.definitionId);
    const secondDefinition = getRoomDefinition(secondRoom.definitionId);
    const secondDefinitionId = `${secondDefinition.id}-incompatible-test`;
    secondRoom.definitionId = secondDefinitionId;

    const definitions = [
      {
        ...firstDefinition,
        sockets: firstDefinition.sockets.map((socket) =>
          socket.id === connection.socketAId ? { ...socket, tags: ['passage:test-a'] } : socket,
        ),
      },
      {
        ...secondDefinition,
        id: secondDefinitionId,
        sockets: secondDefinition.sockets.map((socket) =>
          socket.id === connection.socketBId ? { ...socket, tags: ['passage:test-b'] } : socket,
        ),
      },
    ];

    expect(validateRoomGraph(graph, definitions)).toContain(
      `${connection.id}: sockets are not compatible.`,
    );
  });
});
