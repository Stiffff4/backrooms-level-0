import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Scene } from '@babylonjs/core/scene';
import { describe, expect, it } from 'vitest';

import { getRoomDefinition } from '../../src/procedural/RoomCatalog';
import { generateRoomGraph } from '../../src/procedural/RoomGraphGenerator';
import type { RoomDefinition, RoomInstance } from '../../src/procedural/procedural.types';
import { RoomMaterialLibrary, type RoomTextureFactory } from '../../src/rooms/RoomMaterialLibrary';
import { ModularRoomBuilder } from '../../src/rooms/builders/ModularRoomBuilder';

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

function getUvs(
  meshName: string,
  meshes: readonly { name: string; getVerticesData(kind: string): unknown }[],
): number[] {
  const mesh = meshes.find((candidate) => candidate.name === meshName);
  if (mesh === undefined) {
    throw new Error(`Missing visual mesh ${meshName}.`);
  }
  const data = mesh.getVerticesData(VertexBuffer.UVKind);
  if (data === null || data === undefined) {
    throw new Error(`Mesh ${meshName} has no UV channel.`);
  }
  return Array.from(data as ArrayLike<number>);
}

function faceUvRange(uvs: readonly number[], face: number): { u: number; v: number } {
  const values = uvs.slice(face * 8, face * 8 + 8);
  const u = values.filter((_value, index) => index % 2 === 0);
  const v = values.filter((_value, index) => index % 2 === 1);
  return {
    u: Math.max(...u) - Math.min(...u),
    v: Math.max(...v) - Math.min(...v),
  };
}

function createAdvancedInstance(definition: RoomDefinition, index: number): RoomInstance {
  return {
    id: `advanced-${String(index).padStart(2, '0')}`,
    definitionId: definition.id,
    seed: 8_100 + index,
    depth: definition.minDepth,
    worldTransform: { position: { x: index * 30, y: 0, z: 0 }, rotationQuarterTurns: 0 },
    socketStates: Object.fromEntries(
      definition.sockets.map((socket) => [socket.id, { status: 'sealed', connection: null }]),
    ),
    visitState: 'unvisited',
    spawnedAt: index,
  };
}

describe('ModularRoomBuilder visual UVs', () => {
  it('usa escala física, offsets deterministas y conserva UV al fusionar geometría', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const materials = new RoomMaterialLibrary(scene, {
      baseUrl: '/test-assets/',
      textureFactory,
    });
    const builder = new ModularRoomBuilder(scene, materials);
    const graph = generateRoomGraph({ seed: 'physical-uv-room', targetRooms: 1 });
    const instance = graph.rooms[0];
    if (instance === undefined) {
      throw new Error('UV test graph did not produce its start room.');
    }
    const definition = getRoomDefinition(instance.definitionId);
    const first = builder.build(instance, definition);
    const second = builder.build(instance, definition);
    const variantInstance: RoomInstance = {
      ...instance,
      id: `${instance.id}-uv-variant`,
      seed: instance.seed + 1,
      socketStates: Object.fromEntries(
        Object.entries(instance.socketStates).map(([id, state]) => [id, { ...state }]),
      ),
    };
    const variant = builder.build(variantInstance, definition);

    try {
      const floorUvs = getUvs(`${instance.id}.floor`, first.meshes);
      const repeatedFloorUvs = getUvs(`${instance.id}.floor`, second.meshes);
      const variantFloorUvs = getUvs(`${variantInstance.id}.floor`, variant.meshes);
      expect(repeatedFloorUvs).toEqual(floorUvs);
      expect(variantFloorUvs).not.toEqual(floorUvs);

      const topFace = faceUvRange(floorUvs, 4);
      expect(topFace.u).toBeCloseTo(definition.footprint.width / 2.4, 5);
      expect(topFace.v).toBeCloseTo(definition.footprint.depth / 2.4, 5);
      expect(Math.max(...floorUvs) - Math.min(...floorUvs)).toBeGreaterThan(1);

      const walls = first.meshes.find((mesh) => mesh.name === `${instance.id}.walls`);
      if (walls === undefined) {
        throw new Error('UV test room did not contain merged wall geometry.');
      }
      const wallUvs = getUvs(walls.name, first.meshes);
      expect(wallUvs).toHaveLength(walls.getTotalVertices() * 2);
      expect(wallUvs.every(Number.isFinite)).toBe(true);
      expect(Math.max(...wallUvs) - Math.min(...wallUvs)).toBeGreaterThan(1);
      expect(first.meshes.length).toBeLessThanOrEqual(9);
      expect(materials.materialCount).toBe(11);

      const animatedAnchors = first.lightAnchors.filter(
        (anchor) => anchor.enabled && anchor.emitterBinding !== null,
      );
      expect(animatedAnchors.length).toBeGreaterThan(0);
      expect(first.lightAnchors.map((anchor) => anchor.flickerSeed)).toEqual(
        second.lightAnchors.map((anchor) => anchor.flickerSeed),
      );
      const emitterMesh = animatedAnchors[0]?.emitterBinding?.mesh;
      if (emitterMesh === undefined) {
        throw new Error('Visual test room did not expose an animated emitter mesh.');
      }
      const colorData = emitterMesh.getVerticesData(VertexBuffer.ColorKind);
      if (colorData === null) {
        throw new Error('Animated emitter mesh did not preserve its vertex colors.');
      }
      const sortedBindings = animatedAnchors
        .map((anchor) => anchor.emitterBinding)
        .filter((binding) => binding !== null)
        .sort((left, right) => left.colorOffset - right.colorOffset);
      expect(sortedBindings.every((binding) => binding.mesh === emitterMesh)).toBe(true);
      expect(sortedBindings[0]?.colorOffset).toBe(0);
      for (let index = 1; index < sortedBindings.length; index += 1) {
        const previous = sortedBindings[index - 1];
        const current = sortedBindings[index];
        expect(current?.colorOffset).toBe(
          (previous?.colorOffset ?? 0) + (previous?.colorLength ?? 0),
        );
      }
      const finalBinding = sortedBindings.at(-1);
      expect((finalBinding?.colorOffset ?? 0) + (finalBinding?.colorLength ?? 0)).toBe(
        colorData.length,
      );

      if (sortedBindings.length > 1) {
        const firstBinding = sortedBindings[0];
        const secondBinding = sortedBindings[1];
        if (firstBinding && secondBinding) {
          const changedColors = Float32Array.from(colorData);
          changedColors.fill(
            0.25,
            firstBinding.colorOffset,
            firstBinding.colorOffset + firstBinding.colorLength,
          );
          emitterMesh.updateVerticesData(VertexBuffer.ColorKind, changedColors);
          const updatedColors = emitterMesh.getVerticesData(VertexBuffer.ColorKind);
          expect(updatedColors?.[firstBinding.colorOffset]).toBeCloseTo(0.25, 5);
          expect(updatedColors?.[secondBinding.colorOffset]).toBeCloseTo(1, 5);
        }
      }
    } finally {
      first.dispose();
      second.dispose();
      variant.dispose();
      materials.dispose();
      expect(scene.meshes).toHaveLength(0);
      expect(scene.transformNodes).toHaveLength(0);
      scene.dispose();
      engine.dispose();
    }
  });

  it('construye arcos escalonados, grids de pilares, humedad y shifts fuera de vista', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const materials = new RoomMaterialLibrary(scene, {
      baseUrl: '/advanced-test-assets/',
      textureFactory,
    });
    const builder = new ModularRoomBuilder(scene, materials);
    const definitions = [
      getRoomDefinition('arch_gallery_long'),
      getRoomDefinition('pillar_grid_large'),
      getRoomDefinition('damp_depression'),
    ];
    const rooms = definitions.map((definition, index) =>
      builder.build(createAdvancedInstance(definition, index), definition),
    );
    try {
      const arch = rooms[0];
      const pillar = rooms[1];
      const damp = rooms[2];
      if (!arch || !pillar || !damp) {
        throw new Error('Advanced visual test did not build every room.');
      }
      const archMesh = arch.meshes.find((mesh) => mesh.name.endsWith('.arches'));
      expect(archMesh).toBeDefined();
      expect(archMesh?.getTotalVertices()).toBeGreaterThan(200);
      expect(arch.colliders).toContain(archMesh);

      const pillarMesh = pillar.meshes.find((mesh) => mesh.name.endsWith('.columns'));
      expect(pillarMesh).toBeDefined();
      expect(pillarMesh?.getTotalVertices()).toBe(6 * 24);
      expect(pillar.colliders).toContain(pillarMesh);

      const dampFloor = damp.meshes.find((mesh) => mesh.name.endsWith('.floor'));
      expect(dampFloor?.material).toBe(materials.carpet);

      for (const room of rooms) {
        expect(room.spatialAnomaly.kind).toBe('ceiling-shift');
        expect(room.spatialAnomaly.mesh.isEnabled()).toBe(false);
        room.spatialAnomaly.mesh.setEnabled(true);
        expect(room.spatialAnomaly.mesh.isEnabled()).toBe(true);
        expect(room.spatialAnomaly.mesh.checkCollisions).toBe(false);
      }
    } finally {
      for (const room of rooms) room.dispose();
      materials.dispose();
      expect(scene.meshes).toHaveLength(0);
      scene.dispose();
      engine.dispose();
    }
  });
});
