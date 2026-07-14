import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { describe, expect, it, vi } from 'vitest';
import { generateRoomGraph } from '../../src/procedural/RoomGraphGenerator';
import { ModularRoomBuilder } from '../../src/rooms/builders/ModularRoomBuilder';
import { ModularWorld } from '../../src/rooms/ModularWorld';

describe('ModularWorld incremental streaming', () => {
  it('mantiene límites, rebase, LRU y recursos durante backtracking repetido', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const graph = generateRoomGraph({ seed: 'modular-streaming-smoke', targetRooms: 12 });
    const world = new ModularWorld(scene, undefined, {
      maxLoadedRooms: 4,
      pooledRoomLimit: 2,
    });

    try {
      const roomIds = graph.rooms.map((room) => room.id);
      const firstRoomId = roomIds[0];
      const secondRoomId = roomIds[1];
      const fifthRoomId = roomIds[4];
      const firstInstance = graph.rooms[0];
      const fifthInstance = graph.rooms[4];
      if (
        firstRoomId === undefined ||
        secondRoomId === undefined ||
        fifthRoomId === undefined ||
        firstInstance === undefined ||
        fifthInstance === undefined
      ) {
        throw new Error('Smoke graph did not contain the expected rooms.');
      }

      world.setGraph(graph);
      expect(world.registeredRoomCount).toBe(12);
      expect(world.loadedRoomCount).toBe(0);
      expect(world.metrics).toMatchObject({
        roomCount: 0,
        activeRoomCount: 0,
        pooledRoomCount: 0,
        meshCount: 0,
        materialCount: 11,
      });

      const firstView = world.loadRoom(firstRoomId);
      expect(world.loadRoom(firstRoomId)).toBe(firstView);
      for (const roomId of roomIds.slice(1, 4)) {
        world.loadRoom(roomId);
      }
      expect(world.loadedRoomCount).toBe(4);
      expect(world.metrics.roomCount).toBe(4);
      expect(world.metrics.meshCount).toBe(countActiveMeshes(world));
      expect(() => world.loadRoom(fifthRoomId)).toThrow(/more than 4 room views/);
      expect(world.loadedRoomCount).toBe(4);

      const beforeInvalidSync = world.loadedRoomIds;
      expect(() => world.syncLoadedRooms(['missing-room'])).toThrow(/Unknown room instance/);
      expect(world.loadedRoomIds).toEqual(beforeInvalidSync);

      const secondView = world.getLoadedRoom(secondRoomId);
      expect(secondView).not.toBeNull();
      expect(world.unloadRoom(secondRoomId)).toBe(true);
      expect(world.setRoomSpatialAnomaly(secondRoomId, true)).toBe(true);
      expect(world.setRoomSpatialAnomaly(secondRoomId, true)).toBe(false);
      expect(world.spatialAnomalyRoomIds).toEqual([secondRoomId]);
      expect(world.metrics.spatialAnomalyCount).toBe(1);
      expect(world.unloadRoom(secondRoomId)).toBe(false);
      const shiftedSecondView = world.loadRoom(secondRoomId);
      expect(shiftedSecondView).toBe(secondView);
      expect(shiftedSecondView.spatialAnomaly.mesh.isEnabled()).toBe(true);
      world.clearSpatialAnomalies();
      expect(shiftedSecondView.spatialAnomaly.mesh.isEnabled()).toBe(false);
      expect(world.metrics.spatialAnomalyCount).toBe(0);
      expect(() => world.setRoomSpatialAnomaly('missing-room', true)).toThrow(/Unknown room/);

      const offset = new Vector3(128, 0, -96);
      world.translate(offset);
      expect(world.unloadRoom(firstRoomId)).toBe(true);
      const fifthView = world.loadRoom(fifthRoomId);
      expect(fifthView.root.position.asArray()).toEqual([
        fifthInstance.worldTransform.position.x + offset.x,
        fifthInstance.worldTransform.position.y + offset.y,
        fifthInstance.worldTransform.position.z + offset.z,
      ]);
      expect(world.unloadRoom(fifthRoomId)).toBe(true);
      const reusedFirstView = world.loadRoom(firstRoomId);
      expect(reusedFirstView).toBe(firstView);
      expect(reusedFirstView.root.position.asArray()).toEqual([
        firstInstance.worldTransform.position.x + offset.x,
        firstInstance.worldTransform.position.y + offset.y,
        firstInstance.worldTransform.position.z + offset.z,
      ]);
      expect(fifthView.root.position.subtract(reusedFirstView.root.position).asArray()).toEqual([
        fifthInstance.worldTransform.position.x - firstInstance.worldTransform.position.x,
        fifthInstance.worldTransform.position.y - firstInstance.worldTransform.position.y,
        fifthInstance.worldTransform.position.z - firstInstance.worldTransform.position.z,
      ]);
      expect(world.getRoomAtPosition(world.spawnPoint)?.id).toBe(firstRoomId);

      const firstSet = roomIds.slice(0, 4);
      const secondSet = roomIds.slice(4, 8);
      world.syncLoadedRooms(firstSet);
      const reusableRoomId = firstSet[2];
      if (reusableRoomId === undefined) {
        throw new Error('Smoke graph did not contain a reusable room.');
      }
      const reusableView = world.getLoadedRoom(reusableRoomId);

      // Full-cap 1:1 swap must unload first, retain only two LRU views and never throw.
      world.syncLoadedRooms(secondSet);
      expect(world.loadedRoomIds).toEqual(secondSet);
      expect(world.pooledRoomCount).toBe(2);
      expect(world.metrics).toMatchObject({ activeRoomCount: 4, pooledRoomCount: 2 });
      world.syncLoadedRooms(firstSet);
      expect(world.getLoadedRoom(reusableRoomId)).toBe(reusableView);
      const firstSetMeshCount = scene.meshes.length;
      world.syncLoadedRooms(secondSet);
      const secondSetMeshCount = scene.meshes.length;

      for (let index = 0; index < 10; index += 1) {
        world.syncLoadedRooms(firstSet);
        expect(world.loadedRoomIds).toEqual(firstSet);
        expect(scene.meshes).toHaveLength(firstSetMeshCount);
        world.syncLoadedRooms(secondSet);
        expect(world.loadedRoomIds).toEqual(secondSet);
        expect(scene.meshes).toHaveLength(secondSetMeshCount);
        expect(world.loadedRoomCount).toBeLessThanOrEqual(world.maxLoadedRooms);
        expect(world.pooledRoomCount).toBeLessThanOrEqual(world.maxPooledRooms);
        expect(world.metrics.meshCount).toBe(countActiveMeshes(world));
        expect(scene.materials).toHaveLength(11);
      }

      world.unloadAllRooms();
      expect(world.loadedRoomCount).toBe(0);
      expect(world.pooledRoomCount).toBe(2);
      expect(world.metrics).toMatchObject({
        activeRoomCount: 0,
        pooledRoomCount: 2,
        meshCount: 0,
        materialCount: 11,
      });
      world.purgePool();
      expect(scene.meshes).toHaveLength(0);
      expect(scene.transformNodes).toHaveLength(0);

      world.dispose();
      world.dispose();
      expect(scene.meshes).toHaveLength(0);
      expect(scene.materials).toHaveLength(0);
      expect(scene.transformNodes).toHaveLength(0);
    } finally {
      world.dispose();
      scene.dispose();
      engine.dispose();
    }
  });

  it('revierte por completo un sync si Babylon falla al construir una vista entrante', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const graph = generateRoomGraph({ seed: 'modular-sync-rollback', targetRooms: 8 });
    const world = new ModularWorld(scene, undefined, {
      maxLoadedRooms: 3,
      pooledRoomLimit: 1,
    });

    try {
      const roomIds = graph.rooms.map((room) => room.id);
      const originalIds = roomIds.slice(0, 3);
      const requestedIds = roomIds.slice(2, 5);
      const failingRoomId = requestedIds[2];
      if (failingRoomId === undefined) {
        throw new Error('Rollback graph did not contain the expected rooms.');
      }

      world.setGraph(graph);
      world.syncLoadedRooms(originalIds);
      const originalViews = new Map(
        originalIds.map((roomId) => [roomId, world.getLoadedRoom(roomId)] as const),
      );
      const originalPoolIds = world.pooledRoomIds;
      const originalMeshCount = scene.meshes.length;
      const builder = Reflect.get(world, 'builder') as ModularRoomBuilder;
      const originalBuild = builder.build.bind(builder);
      const build = vi.spyOn(builder, 'build').mockImplementation((instance, definition) => {
        if (instance.id === failingRoomId) {
          throw new Error('synthetic Babylon build failure');
        }
        return originalBuild(instance, definition);
      });

      expect(() => world.syncLoadedRooms(requestedIds)).toThrow(/synthetic Babylon build failure/);
      expect(world.loadedRoomIds).toEqual(originalIds);
      expect(world.pooledRoomIds).toEqual(originalPoolIds);
      expect(scene.meshes).toHaveLength(originalMeshCount);
      for (const [roomId, view] of originalViews) {
        expect(world.getLoadedRoom(roomId)).toBe(view);
        expect(view?.root.isEnabled()).toBe(true);
      }
      build.mockRestore();
    } finally {
      world.dispose();
      scene.dispose();
      engine.dispose();
    }
  });
});

function countActiveMeshes(world: ModularWorld): number {
  return world.roomViews.reduce((total, view) => total + view.meshes.length, 0);
}
