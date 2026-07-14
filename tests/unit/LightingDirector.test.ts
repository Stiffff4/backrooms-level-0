import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { describe, expect, it } from 'vitest';

import { LightingDirector } from '../../src/lighting/LightingDirector';
import { LIGHT_POOL_CAPACITY } from '../../src/lighting/LightPool';
import { getRoomDefinition } from '../../src/procedural/RoomCatalog';
import { generateRoomGraph } from '../../src/procedural/RoomGraphGenerator';
import { ModularRoomBuilder } from '../../src/rooms/builders/ModularRoomBuilder';
import { RoomMaterialLibrary, type RoomTextureFactory } from '../../src/rooms/RoomMaterialLibrary';

const textureFactory: RoomTextureFactory = (_request, scene, onLoad) => {
  const texture = RawTexture.CreateRGBATexture(
    new Uint8Array([255, 255, 255, 255]),
    1,
    1,
    scene,
    true,
    false,
    Texture.TRILINEAR_SAMPLINGMODE,
  );
  queueMicrotask(onLoad);
  return texture;
};

describe('LightingDirector', () => {
  it('anima slices aislados, limita proxies y conserva posiciones al rebasar', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const materials = new RoomMaterialLibrary(scene, {
      baseUrl: '/lighting-test-assets/',
      textureFactory,
    });
    const graph = generateRoomGraph({ seed: 'lighting-director-room', targetRooms: 1 });
    const instance = graph.rooms[0];
    if (!instance) {
      throw new Error('Lighting test graph did not produce a room.');
    }
    const room = new ModularRoomBuilder(scene, materials).build(
      instance,
      getRoomDefinition(instance.definitionId),
    );
    const director = new LightingDirector(scene, { lightBudget: 4 });

    try {
      const initial = director.update({
        anchors: room.lightAnchors,
        anchorRevision: 0,
        activeRoomId: room.id,
        visibleRoomIds: [room.id],
        playerPosition: Vector3.Zero(),
        absoluteTimeSeconds: 0,
      });
      expect(scene.lights).toHaveLength(LIGHT_POOL_CAPACITY);
      expect(initial.metrics.pool.capacity).toBe(LIGHT_POOL_CAPACITY);
      expect(initial.metrics.pool.activeBudget).toBe(4);
      expect(initial.metrics.pool.activeLightCount).toBeLessThanOrEqual(4);
      expect(initial.metrics.fixtureCount).toBe(room.lightAnchors.length);

      director.setRoomOverride(room.id, { profile: 'off' });
      const disabledRoom = director.update({
        anchors: room.lightAnchors,
        anchorRevision: 0,
        activeRoomId: room.id,
        visibleRoomIds: [room.id],
        playerPosition: Vector3.Zero(),
        absoluteTimeSeconds: 0,
      });
      expect(disabledRoom.metrics.pool.activeLightCount).toBe(0);
      expect(disabledRoom.metrics.activeRoomProxyCount).toBe(0);
      expect(disabledRoom.globalAudioIntensity).toBe(0);
      director.setRoomOverride(room.id, null);

      const enabledAnchors = room.lightAnchors.filter(
        (anchor) => anchor.enabled && anchor.emitterBinding !== null,
      );
      const first = enabledAnchors[0];
      const second = enabledAnchors[1];
      if (!first?.emitterBinding || !second?.emitterBinding) {
        throw new Error('Lighting test room needs at least two animated fixtures.');
      }
      director.setFixtureOverride(first.id, { profile: 'off' });
      director.update({
        anchors: room.lightAnchors,
        anchorRevision: 0,
        activeRoomId: room.id,
        visibleRoomIds: [room.id],
        playerPosition: Vector3.Zero(),
        absoluteTimeSeconds: 0.1,
      });
      const colors = first.emitterBinding.mesh.getVerticesData(VertexBuffer.ColorKind);
      expect(colors?.[first.emitterBinding.colorOffset]).toBeCloseTo(0, 5);
      expect(colors?.[second.emitterBinding.colorOffset]).toBeGreaterThan(0.7);

      const beforeRebase = director.frameSnapshot.spatialSources[0];
      if (!beforeRebase) {
        throw new Error('Lighting test expected an assigned spatial source.');
      }
      const delta = new Vector3(-240, 0, 36);
      room.root.position.addInPlace(delta);
      const playerAfter = delta.clone();
      const afterRebase = director
        .update({
          anchors: room.lightAnchors,
          anchorRevision: 0,
          activeRoomId: room.id,
          visibleRoomIds: [room.id],
          playerPosition: playerAfter,
          absoluteTimeSeconds: 0.1,
        })
        .spatialSources.find((source) => source.fixtureId === beforeRebase.fixtureId);
      expect(afterRebase).toBeDefined();
      expect(afterRebase?.position.subtract(playerAfter)).toEqual(
        beforeRebase.position.subtract(Vector3.Zero()),
      );

      director.setReducedFlashing(true);
      director.setFixtureOverride(first.id, { profile: 'intermittent-failure', enabled: true });
      const accessible = director.update({
        anchors: room.lightAnchors,
        anchorRevision: 0,
        activeRoomId: room.id,
        visibleRoomIds: [room.id],
        playerPosition: playerAfter,
        absoluteTimeSeconds: 7.5,
      });
      expect(accessible.metrics.reducedFlashing).toBe(true);
      expect(accessible.globalAudioIntensity).toBeGreaterThan(0);
    } finally {
      director.dispose();
      expect(scene.lights).toHaveLength(0);
      room.dispose();
      materials.dispose();
      scene.dispose();
      engine.dispose();
    }
  });

  it('sincroniza altas y bajas por revisión sin retener fixtures descargados', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const director = new LightingDirector(scene, { lightBudget: 6 });
    try {
      const empty = director.update({
        anchors: [],
        anchorRevision: 0,
        activeRoomId: null,
        visibleRoomIds: [],
        playerPosition: Vector3.Zero(),
        absoluteTimeSeconds: 0,
      });
      expect(empty.metrics.fixtureCount).toBe(0);
      expect(empty.metrics.pool.activeLightCount).toBe(0);
      director.reset();
      expect(director.metrics.fixtureCount).toBe(0);
      expect(director.metrics.pool.pooledLightCount).toBe(LIGHT_POOL_CAPACITY);
    } finally {
      director.dispose();
      expect(scene.lights).toHaveLength(0);
      scene.dispose();
      engine.dispose();
    }
  });
});
