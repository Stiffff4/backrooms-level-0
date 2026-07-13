import { describe, expect, it } from 'vitest';
import {
  CORE_ROOM_DEFINITION_IDS,
  getRoomDefinition,
  getRoomDefinitions,
  validateRoomCatalog,
} from '../../src/procedural/RoomCatalog';
import { SeedBank } from '../../src/procedural/SeedBank';
import { areSocketsCompatible } from '../../src/procedural/SocketMath';

describe('RoomCatalog', () => {
  it('contiene exactamente los doce módulos núcleo obligatorios', () => {
    expect(getRoomDefinitions().map((definition) => definition.id)).toEqual(
      CORE_ROOM_DEFINITION_IDS,
    );
    expect(getRoomDefinitions()).toHaveLength(12);
    expect(validateRoomCatalog()).toEqual([]);
  });

  it('mantiene sockets cardinales sobre el perímetro y con contrapartes compatibles', () => {
    const definitions = getRoomDefinitions();
    const allSockets = definitions.flatMap((definition) => definition.sockets);

    for (const definition of definitions) {
      for (const roomSocket of definition.sockets) {
        const { x, z } = roomSocket.localPosition;
        const { width, depth } = definition.footprint;
        const onPerimeter =
          Math.abs(Math.abs(x) - width / 2) < 1e-9 || Math.abs(Math.abs(z) - depth / 2) < 1e-9;
        expect(onPerimeter, `${definition.id}/${roomSocket.id}`).toBe(true);
        expect(Math.abs(roomSocket.localForward.x) + Math.abs(roomSocket.localForward.z)).toBe(1);
        expect(roomSocket.localForward.y).toBe(0);
        expect(
          allSockets.some(
            (candidate) => candidate !== roomSocket && areSocketsCompatible(roomSocket, candidate),
          ),
          `${definition.id}/${roomSocket.id}`,
        ).toBe(true);
      }
    }
  });

  it('ofrece metadata usable por render, audio, anomalías y salida', () => {
    for (const definition of getRoomDefinitions()) {
      expect(definition.geometryRecipe.kind.length).toBeGreaterThan(0);
      expect(definition.lightingProfile.length).toBeGreaterThan(0);
      expect(definition.audioProfile.length).toBeGreaterThan(0);
      expect(definition.anomalySlots.length).toBeGreaterThan(0);
      expect(definition.weight).toBeGreaterThan(0);
      expect(definition.maxConsecutive).toBeGreaterThan(0);
    }

    expect(getRoomDefinition('room_dead_end').exitCompatibleSurfaces).not.toHaveLength(0);
    expect(() => getRoomDefinition('missing-room')).toThrow(/Unknown room definition/);
  });
});

describe('SeedBank', () => {
  it('repite cada stream para la misma seed sin acoplar world, visual, audio y tension', () => {
    const first = new SeedBank('level-zero');
    const second = new SeedBank('level-zero');

    expect([first.worldRng.next(), first.worldRng.next()]).toEqual([
      second.worldRng.next(),
      second.worldRng.next(),
    ]);
    expect(first.visualRng.next()).toBe(second.visualRng.next());
    expect(first.audioRng.next()).toBe(second.audioRng.next());
    expect(first.tensionRng.next()).toBe(second.tensionRng.next());

    const streams = new SeedBank('level-zero');
    expect(
      new Set([
        streams.worldRng.next(),
        streams.visualRng.next(),
        streams.audioRng.next(),
        streams.tensionRng.next(),
      ]).size,
    ).toBe(4);
  });
});
