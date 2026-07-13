import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Scene } from '@babylonjs/core/scene';
import { describe, expect, it } from 'vitest';

import { getRoomDefinition } from '../../src/procedural/RoomCatalog';
import { generateRoomGraph } from '../../src/procedural/RoomGraphGenerator';
import type { RoomInstance } from '../../src/procedural/procedural.types';
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
});
