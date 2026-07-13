import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { afterEach, describe, expect, it } from 'vitest';
import { generateRoomGraph } from '../../src/procedural/RoomGraphGenerator';
import type { RoomGraph, RoomSocket } from '../../src/procedural/procedural.types';
import { ModularWorld } from '../../src/rooms/ModularWorld';
import { StreamingVisibilityGuard } from '../../src/world/StreamingVisibilityGuard';

interface Harness {
  readonly engine: NullEngine;
  readonly scene: Scene;
  readonly graph: RoomGraph;
  readonly world: ModularWorld;
  readonly camera: FreeCamera;
}

const harnesses: Harness[] = [];

function createHarness(seed: string, loadedRoomIds: readonly string[]): Harness {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const graph = generateRoomGraph({ seed, targetRooms: 24 });
  const world = new ModularWorld(scene, undefined, {
    maxLoadedRooms: graph.rooms.length,
    pooledRoomLimit: 0,
  });
  world.setGraph(graph);
  world.syncLoadedRooms(loadedRoomIds);
  const camera = new FreeCamera('visibility-camera', new Vector3(0, 1.6, 0), scene);
  camera.minZ = 0.05;
  camera.maxZ = 80;
  camera.fov = Math.PI / 2;
  scene.activeCamera = camera;
  const harness = { engine, scene, graph, world, camera };
  harnesses.push(harness);
  return harness;
}

function getConnectedSocket(harness: Harness): {
  socket: RoomSocket;
  neighborId: string;
  center: Vector3;
  forward: Vector3;
} {
  const start = harness.graph.rooms.find((room) => room.id === harness.graph.startRoomId);
  const view = harness.world.getLoadedRoom(harness.graph.startRoomId);
  if (start === undefined || view === null) {
    throw new Error('The harness did not load the start room.');
  }
  const socket = view.definition.sockets.find(
    (candidate) => start.socketStates[candidate.id]?.connection !== null,
  );
  if (socket === undefined) {
    throw new Error('The generated start room has no connected socket.');
  }
  const connection = start.socketStates[socket.id]?.connection;
  if (connection === null || connection === undefined) {
    throw new Error('The generated socket has no neighbor.');
  }
  const matrix = view.root.computeWorldMatrix(true);
  const center = Vector3.TransformCoordinates(
    new Vector3(socket.localPosition.x, socket.localPosition.y, socket.localPosition.z),
    matrix,
  );
  const forward = Vector3.TransformNormal(
    new Vector3(socket.localForward.x, socket.localForward.y, socket.localForward.z),
    matrix,
  ).normalize();
  return { socket, neighborId: connection.roomId, center, forward };
}

afterEach(() => {
  for (const harness of harnesses.splice(0)) {
    harness.world.dispose();
    harness.scene.dispose();
    harness.engine.dispose();
  }
});

describe('StreamingVisibilityGuard', () => {
  it('sincroniza de forma validada el límite de niebla cuando cambia el preset', () => {
    const graph = generateRoomGraph({ seed: 'visibility-quality', targetRooms: 24 });
    const harness = createHarness('visibility-quality', [graph.startRoomId]);
    const guard = new StreamingVisibilityGuard(harness.graph, harness.world, harness.scene, {
      fogEnd: 36,
    });

    expect(guard.fogEnd).toBe(36);
    guard.setFogEnd(48);
    expect(guard.fogEnd).toBe(48);
    expect(() => guard.setFogEnd(0)).toThrow(/fogEnd must be a finite positive number/);
  });

  it('protege por distancia sin considerar meshes deshabilitados como activos', () => {
    const graph = generateRoomGraph({ seed: 'visibility-safety', targetRooms: 24 });
    const farRoom = [...graph.rooms].sort((left, right) => right.depth - left.depth)[0];
    if (farRoom === undefined) {
      throw new Error('Expected a generated room.');
    }
    const harness = createHarness('visibility-safety', [graph.startRoomId, farRoom.id]);
    const startView = harness.world.getLoadedRoom(harness.graph.startRoomId);
    const farView = harness.world.getLoadedRoom(farRoom.id);
    if (startView === null || farView === null) {
      throw new Error('Expected both selected rooms to be loaded.');
    }
    for (const mesh of [...startView.meshes, ...farView.meshes]) {
      mesh.setEnabled(false);
    }
    harness.camera.position.copyFrom(startView.trigger.center);
    harness.camera.position.y = 1.6;
    harness.camera.setTarget(harness.camera.position.add(new Vector3(0, 0, 1)));

    const guard = new StreamingVisibilityGuard(harness.graph, harness.world, harness.scene, {
      safetyDistance: 0.25,
      fogEnd: 20,
    });
    const result = guard.evaluate({
      camera: harness.camera,
      playerPosition: harness.camera.position,
    });

    expect(result.loadedRoomCount).toBe(2);
    expect(result.frustumRoomCount).toBe(0);
    expect(result.safetyRoomCount).toBe(1);
    expect(result.visibleRoomIds).toEqual([harness.graph.startRoomId]);
    expect(result.visibleRoomIds).not.toContain(farRoom.id);
  });

  it('usa el frustum real de Babylon para proteger una room cargada fuera de seguridad', () => {
    const graph = generateRoomGraph({ seed: 'visibility-frustum', targetRooms: 24 });
    const harness = createHarness('visibility-frustum', [graph.startRoomId]);
    const view = harness.world.getLoadedRoom(harness.graph.startRoomId);
    if (view === null) {
      throw new Error('Expected the start room view.');
    }
    const target = view.trigger.center.clone();
    target.y = 1.4;
    harness.camera.position.copyFrom(target.add(new Vector3(0, 0, -10)));
    harness.camera.setTarget(target);

    const guard = new StreamingVisibilityGuard(harness.graph, harness.world, harness.scene, {
      safetyDistance: 0,
      fogEnd: 24,
    });
    const result = guard.evaluate({
      camera: harness.camera,
      playerPosition: harness.camera.position,
    });

    expect(result.safetyRoomCount).toBe(0);
    expect(result.frustumRoomCount).toBe(1);
    expect(result.visibleRoomIds).toEqual([harness.graph.startRoomId]);
  });

  it('protege el vecino lógico detrás de una entrada visible antes de fogEnd', () => {
    const graph = generateRoomGraph({ seed: 'visibility-entrance', targetRooms: 24 });
    const harness = createHarness('visibility-entrance', [graph.startRoomId]);
    const entrance = getConnectedSocket(harness);
    harness.camera.position.copyFrom(entrance.center.subtract(entrance.forward.scale(2)));
    harness.camera.setTarget(entrance.center);

    const nearGuard = new StreamingVisibilityGuard(harness.graph, harness.world, harness.scene, {
      safetyDistance: 0,
      fogEnd: 4,
    });
    const visible = nearGuard.evaluate({
      camera: harness.camera,
      playerPosition: harness.camera.position,
    });
    expect(harness.world.isRoomLoaded(entrance.neighborId)).toBe(false);
    expect(visible.visibleEntranceRoomIds).toEqual([entrance.neighborId]);

    const foggedGuard = new StreamingVisibilityGuard(harness.graph, harness.world, harness.scene, {
      safetyDistance: 0,
      fogEnd: 1,
    });
    const fogged = foggedGuard.evaluate({
      camera: harness.camera,
      playerPosition: harness.camera.position,
    });
    expect(fogged.visibleEntranceRoomIds).toEqual([]);
  });

  it('ordena el resultado y contabiliza IDs protegidos ausentes tras streaming', () => {
    const graph = generateRoomGraph({ seed: 'visibility-verification', targetRooms: 24 });
    const harness = createHarness('visibility-verification', [graph.startRoomId]);
    const entrance = getConnectedSocket(harness);
    harness.camera.position.copyFrom(entrance.center.subtract(entrance.forward.scale(2)));
    harness.camera.setTarget(entrance.center);
    const guard = new StreamingVisibilityGuard(harness.graph, harness.world, harness.scene, {
      safetyDistance: 0,
      fogEnd: 4,
    });
    const visibility = guard.evaluate({
      camera: harness.camera,
      playerPosition: harness.camera.position,
    });

    const failed = guard.verifyRetention(visibility, {
      materializedRoomIds: [harness.graph.startRoomId],
      retainedRoomIds: [],
    });
    expect(failed.missingRoomIds).toEqual([entrance.neighborId]);
    expect(failed.violationCount).toBe(1);
    expect(failed.totalViolationCount).toBe(1);
    expect(guard.violationCount).toBe(1);
    expect(guard.lastViolationRoomIds).toEqual([entrance.neighborId]);

    const repaired = guard.verifyRetention(visibility, {
      materializedRoomIds: [harness.graph.startRoomId],
      retainedRoomIds: [entrance.neighborId],
    });
    expect(repaired.missingRoomIds).toEqual([]);
    expect(repaired.violationCount).toBe(0);
    expect(repaired.totalViolationCount).toBe(1);

    guard.resetViolationCount();
    expect(guard.violationCount).toBe(0);
    expect(guard.lastViolationRoomIds).toEqual([]);
  });
});
