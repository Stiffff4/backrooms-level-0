import { describe, expect, it } from 'vitest';
import { generateRoomGraph } from '../../src/procedural/RoomGraphGenerator';
import type { RoomId, RoomInstance } from '../../src/procedural/procedural.types';
import {
  calculateGraphDistances,
  ChunkStreamer,
  StreamingBudgetExceededError,
} from '../../src/world/ChunkStreamer';
import type {
  ChunkMaterializer,
  ChunkStreamingUpdate,
  RoomMaterializationContext,
} from '../../src/world/world.types';

interface TestHandle {
  roomId: RoomId;
  serial: number;
}

class RecordingMaterializer implements ChunkMaterializer<TestHandle> {
  public readonly events: string[] = [];
  private nextSerial = 0;

  public materialize(room: RoomInstance, context: RoomMaterializationContext): TestHandle {
    this.events.push(`load:${room.id}:${context.tier}:${String(context.graphDistance)}`);
    const handle = { roomId: room.id, serial: this.nextSerial };
    this.nextSerial += 1;
    return handle;
  }

  public dematerialize(room: RoomInstance, handle: TestHandle): void {
    this.events.push(`unload:${room.id}:${handle.serial}`);
  }

  public updateTier(
    room: RoomInstance,
    _handle: TestHandle,
    context: RoomMaterializationContext,
  ): void {
    this.events.push(`tier:${room.id}:${context.tier}:${String(context.graphDistance)}`);
  }
}

function updateFor(
  currentRoomId: RoomId,
  overrides: Partial<Omit<ChunkStreamingUpdate, 'currentRoomId'>> = {},
): ChunkStreamingUpdate {
  return {
    currentRoomId,
    visibleRoomIds: overrides.visibleRoomIds ?? [],
    visibleEntranceRoomIds: overrides.visibleEntranceRoomIds ?? [],
    exitRoomId: overrides.exitRoomId ?? null,
    recentlyLeftRoomIds: overrides.recentlyLeftRoomIds ?? [],
  };
}

describe('ChunkStreamer', () => {
  it('materializa radio activo 3, precarga un salto y conserva un conjunto acotado', () => {
    const graph = generateRoomGraph({ seed: 'stream-radius', targetRooms: 120 });
    const materializer = new RecordingMaterializer();
    const streamer = new ChunkStreamer(graph, materializer);
    const result = streamer.update(updateFor(graph.startRoomId));
    const distances = calculateGraphDistances(graph, graph.startRoomId, 4);

    for (const [roomId, distance] of distances) {
      if (distance <= 3) {
        expect(result.activeRoomIds).toContain(roomId);
      }
      if (distance <= 4) {
        expect(result.materializedRoomIds).toContain(roomId);
      }
    }
    expect(result.activeRoomIds.every((roomId) => (distances.get(roomId) ?? 99) <= 3)).toBe(true);
    expect(result.preloadRoomIds.every((roomId) => distances.get(roomId) === 4)).toBe(true);
    expect(result.materializedRoomIds).toHaveLength(result.metrics.materializedRoomCount);
    expect(result.metrics.materializedRoomCount).toBeLessThanOrEqual(60);
    expect(result.metrics.peakMaterializedRoomCount).toBeLessThanOrEqual(60);
    expect(result.newlyMaterializedRoomIds).toEqual(result.materializedRoomIds);
  });

  it('protege explícitamente sala actual, visibles, entrada, salida y recently-left', () => {
    const graph = generateRoomGraph({ seed: 'stream-protection', targetRooms: 100 });
    const distances = calculateGraphDistances(graph, graph.startRoomId);
    const farRooms = graph.rooms.filter((room) => (distances.get(room.id) ?? 0) > 4);
    expect(farRooms.length).toBeGreaterThanOrEqual(4);
    const visible = farRooms[0] as RoomInstance;
    const entrance = farRooms[1] as RoomInstance;
    const exit = farRooms[2] as RoomInstance;
    const recentlyLeft = farRooms[3] as RoomInstance;
    const streamer = new ChunkStreamer(graph, new RecordingMaterializer());

    const protectedResult = streamer.update(
      updateFor(graph.startRoomId, {
        visibleRoomIds: [visible.id],
        visibleEntranceRoomIds: [entrance.id],
        exitRoomId: exit.id,
        recentlyLeftRoomIds: [recentlyLeft.id],
      }),
    );
    for (const roomId of [graph.startRoomId, visible.id, entrance.id, exit.id, recentlyLeft.id]) {
      expect(protectedResult.protectedRoomIds).toContain(roomId);
      expect(protectedResult.materializedRoomIds).toContain(roomId);
    }

    const released = streamer.update(updateFor(graph.startRoomId));
    for (const roomId of [visible.id, entrance.id, exit.id, recentlyLeft.id]) {
      expect(released.materializedRoomIds).not.toContain(roomId);
      expect(released.dematerializedRoomIds).toContain(roomId);
    }
    expect(released.materializedRoomIds).toContain(graph.startRoomId);
  });

  it('simula 30 minutos con materialización determinista, memoria estable e historial compacto', () => {
    const graph = generateRoomGraph({ seed: 'long-stream-walk', targetRooms: 160 });
    const firstAdapter = new RecordingMaterializer();
    const secondAdapter = new RecordingMaterializer();
    const first = new ChunkStreamer(graph, firstAdapter);
    const second = new ChunkStreamer(graph, secondAdapter);

    // Una transición cada cinco segundos durante 30 minutos virtuales.
    for (let transition = 0; transition < 360; transition += 1) {
      const room = graph.rooms[transition % graph.rooms.length];
      expect(room).toBeDefined();
      if (!room) {
        continue;
      }
      const firstResult = first.update(updateFor(room.id));
      const secondResult = second.update(updateFor(room.id));
      expect(secondResult.materializedRoomIds).toEqual(firstResult.materializedRoomIds);
      expect(firstResult.metrics.materializedRoomCount).toBeLessThanOrEqual(60);
      expect(firstResult.metrics.peakMaterializedRoomCount).toBeLessThanOrEqual(60);
      expect(new Set(firstResult.materializedRoomIds).size).toBe(
        firstResult.materializedRoomIds.length,
      );
    }

    expect(secondAdapter.events).toEqual(firstAdapter.events);
    expect(first.getHistorySnapshot()).toHaveLength(graph.rooms.length);
    expect(first.getHistorySnapshot().every((entry) => !('worldTransform' in entry))).toBe(true);
    expect(first.metrics.historyRoomCount).toBe(graph.rooms.length);
    expect(first.metrics.totalMaterializations).toBeGreaterThan(graph.rooms.length);
    expect(first.metrics.totalDematerializations).toBeGreaterThan(0);
  });

  it('registra reentradas y nunca descarga el recently-left protegido', () => {
    const graph = generateRoomGraph({ seed: 'history', targetRooms: 50 });
    const neighborId = graph.connections[0]?.roomBId;
    expect(neighborId).toBeDefined();
    if (neighborId === undefined) {
      return;
    }
    const streamer = new ChunkStreamer(graph, new RecordingMaterializer());
    streamer.update(updateFor(graph.startRoomId));
    const transition = streamer.update(
      updateFor(neighborId, { recentlyLeftRoomIds: [graph.startRoomId] }),
    );
    expect(transition.materializedRoomIds).toContain(graph.startRoomId);
    streamer.update(updateFor(graph.startRoomId, { recentlyLeftRoomIds: [neighborId] }));

    const startHistory = streamer
      .getHistorySnapshot()
      .find((entry) => entry.roomId === graph.startRoomId);
    const neighborHistory = streamer
      .getHistorySnapshot()
      .find((entry) => entry.roomId === neighborId);
    expect(startHistory).toMatchObject({ visitCount: 2, firstVisitedUpdate: 1 });
    expect(neighborHistory).toMatchObject({ visitCount: 1, lastLeftUpdate: 3 });
  });

  it('rechaza presupuestos incapaces de conservar el radio activo', () => {
    const graph = generateRoomGraph({ seed: 'tiny-budget', targetRooms: 20 });
    const streamer = new ChunkStreamer(graph, new RecordingMaterializer(), {
      maxMaterializedRooms: 1,
    });
    expect(() => streamer.update(updateFor(graph.startRoomId))).toThrow(
      StreamingBudgetExceededError,
    );
    expect(streamer.materializedRoomIds).toEqual([]);
  });

  it('descarga antes de cargar durante un swap con el presupuesto completamente lleno', () => {
    const graph = generateRoomGraph({ seed: 'full-cap-swap', targetRooms: 40 });
    const live = new Set<RoomId>();
    const events: string[] = [];
    const adapter: ChunkMaterializer<RoomId> = {
      materialize(room) {
        if (live.size >= 2) {
          throw new Error('adapter hard cap exceeded');
        }
        live.add(room.id);
        events.push(`load:${room.id}`);
        return room.id;
      },
      dematerialize(room) {
        live.delete(room.id);
        events.push(`unload:${room.id}`);
      },
    };
    const streamer = new ChunkStreamer(graph, adapter, {
      activeRadius: 0,
      preloadRadius: 1,
      maxMaterializedRooms: 2,
    });
    const initial = streamer.update(updateFor(graph.startRoomId));
    expect(initial.materializedRoomIds).toHaveLength(2);
    const distantRoom = graph.rooms.find((room) => !initial.materializedRoomIds.includes(room.id));
    expect(distantRoom).toBeDefined();
    if (distantRoom === undefined) {
      return;
    }

    const eventStart = events.length;
    const swapped = streamer.update(updateFor(distantRoom.id));
    const swapEvents = events.slice(eventStart);
    const firstUnload = swapEvents.findIndex((event) => event.startsWith('unload:'));
    const firstLoad = swapEvents.findIndex((event) => event.startsWith('load:'));
    expect(swapped.materializedRoomIds).toHaveLength(2);
    expect(live.size).toBe(2);
    expect(firstUnload).toBeGreaterThanOrEqual(0);
    expect(firstLoad).toBeGreaterThan(firstUnload);
  });

  it('revierte materializaciones parciales cuando el adapter falla', () => {
    const graph = generateRoomGraph({ seed: 'stream-rollback', targetRooms: 24 });
    const released: RoomId[] = [];
    let successfulLoads = 0;
    const adapter: ChunkMaterializer<RoomId> = {
      materialize(room) {
        if (successfulLoads === 2) {
          throw new Error('synthetic materialization failure');
        }
        successfulLoads += 1;
        return room.id;
      },
      dematerialize(_room, handle) {
        released.push(handle);
      },
    };
    const streamer = new ChunkStreamer(graph, adapter);

    expect(() => streamer.update(updateFor(graph.startRoomId))).toThrow(/synthetic/);
    expect(streamer.materializedRoomIds).toEqual([]);
    expect(released).toHaveLength(2);
    expect(streamer.metrics.updateCount).toBe(0);
  });

  it('restaura las salas salientes si falla una carga durante un swap', () => {
    const graph = generateRoomGraph({ seed: 'swap-rollback', targetRooms: 35 });
    const live = new Set<RoomId>();
    let failingRoomId: RoomId | null = null;
    const adapter: ChunkMaterializer<RoomId> = {
      materialize(room) {
        if (room.id === failingRoomId) {
          throw new Error('swap load failed');
        }
        live.add(room.id);
        return room.id;
      },
      dematerialize(room) {
        live.delete(room.id);
      },
    };
    const streamer = new ChunkStreamer(graph, adapter, {
      activeRadius: 0,
      preloadRadius: 1,
      maxMaterializedRooms: 2,
    });
    const previousIds = [...streamer.update(updateFor(graph.startRoomId)).materializedRoomIds];
    const target = graph.rooms.find((room) => !previousIds.includes(room.id));
    expect(target).toBeDefined();
    if (target === undefined) {
      return;
    }
    failingRoomId = target.id;

    expect(() => streamer.update(updateFor(target.id))).toThrow(/swap load failed/);
    expect(streamer.materializedRoomIds).toEqual(previousIds);
    expect([...live].sort()).toEqual([...previousIds].sort());
    expect(streamer.metrics.updateCount).toBe(1);
  });

  it('libera todos los handles al disponer y no permite nuevas actualizaciones', () => {
    const graph = generateRoomGraph({ seed: 'stream-dispose', targetRooms: 30 });
    const materializer = new RecordingMaterializer();
    const streamer = new ChunkStreamer(graph, materializer);
    const loaded = streamer.update(updateFor(graph.startRoomId)).materializedRoomIds.length;

    streamer.dispose();
    streamer.dispose();
    expect(materializer.events.filter((event) => event.startsWith('unload:'))).toHaveLength(loaded);
    expect(streamer.materializedRoomIds).toEqual([]);
    expect(() => streamer.update(updateFor(graph.startRoomId))).toThrow(/disposed/);
  });
});
