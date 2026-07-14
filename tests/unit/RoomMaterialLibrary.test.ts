import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Scene } from '@babylonjs/core/scene';
import { describe, expect, it } from 'vitest';

import {
  ROOM_TEXTURE_IDS,
  RoomMaterialLibrary,
  type RoomTextureFactory,
  type RoomTextureId,
} from '../../src/rooms/RoomMaterialLibrary';

function createTextureFactory(
  failures: ReadonlySet<RoomTextureId> = new Set(),
): RoomTextureFactory {
  return (request, scene, onLoad, onError) => {
    const texture = RawTexture.CreateRGBATexture(
      new Uint8Array([
        255, 255, 255, 255, 200, 190, 120, 255, 180, 170, 100, 255, 255, 255, 255, 255,
      ]),
      2,
      2,
      scene,
      true,
      false,
      Texture.TRILINEAR_SAMPLINGMODE,
    );
    queueMicrotask(() => {
      if (failures.has(request.id)) {
        onError(`synthetic failure: ${request.id}`);
      } else {
        onLoad();
      }
    });
    return texture;
  };
}

describe('RoomMaterialLibrary', () => {
  it('no resuelve readiness antes de registrar todas las texturas con callbacks síncronos', async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const synchronousFactory: RoomTextureFactory = (_request, targetScene, onLoad) => {
      const texture = RawTexture.CreateRGBATexture(
        new Uint8Array([255, 255, 255, 255]),
        1,
        1,
        targetScene,
        true,
        false,
        Texture.TRILINEAR_SAMPLINGMODE,
      );
      onLoad();
      return texture;
    };
    const library = new RoomMaterialLibrary(scene, { textureFactory: synchronousFactory });

    try {
      await expect(library.whenCriticalTexturesSettled()).resolves.toMatchObject({
        criticalReady: true,
        criticalSettled: true,
        allSettled: true,
        readyCount: ROOM_TEXTURE_IDS.length,
        pendingCount: 0,
      });
      await expect(library.whenAllTexturesSettled()).resolves.toMatchObject({
        allSettled: true,
        readyCount: ROOM_TEXTURE_IDS.length,
      });
    } finally {
      library.dispose();
      scene.dispose();
      engine.dispose();
    }
  });

  it('comparte once materiales, configura mapas y publica readiness observable', async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const library = new RoomMaterialLibrary(scene, {
      baseUrl: '/test-assets',
      textureFactory: createTextureFactory(),
    });
    const snapshots: boolean[] = [];
    library.onReadinessChangedObservable.add((readiness) => {
      snapshots.push(readiness.criticalReady);
    });

    try {
      const readiness = await library.whenAllTexturesSettled();
      expect(readiness).toMatchObject({
        criticalReady: true,
        criticalSettled: true,
        allSettled: true,
        readyCount: 12,
        pendingCount: 0,
        failedCount: 0,
      });
      expect(snapshots).toContain(true);
      expect(library.materialCount).toBe(11);
      expect(library.textureCount).toBe(12);
      expect(scene.materials).toHaveLength(11);
      expect(scene.textures).toHaveLength(12);

      expect(library.wall.diffuseTexture).toBe(library.getTexture('wallPaper'));
      expect(library.wallStained.diffuseTexture).toBe(library.getTexture('wallStained'));
      expect(library.carpet.diffuseTexture).toBe(library.getTexture('carpet'));
      expect(library.carpetWet.diffuseTexture).toBe(library.getTexture('carpet'));
      expect(library.ceiling.diffuseTexture).toBe(library.getTexture('ceilingTile'));
      expect(library.fixtureEmitter.emissiveTexture).toBe(library.getTexture('fixtureTube'));
      expect(library.carpetWet.specularColor.r).toBeCloseTo(library.carpet.specularColor.r, 6);

      for (const id of ROOM_TEXTURE_IDS) {
        const texture = library.getTexture(id);
        expect(texture.wrapU).toBe(Texture.WRAP_ADDRESSMODE);
        expect(texture.wrapV).toBe(Texture.WRAP_ADDRESSMODE);
        expect(texture.samplingMode).toBe(Texture.TRILINEAR_SAMPLINGMODE);
        expect(texture.anisotropicFilteringLevel).toBe(4);
      }

      library.applyQuality({ normalMaps: false, anisotropy: 2 });
      expect(library.wall.bumpTexture).toBeNull();
      expect(library.carpet.bumpTexture).toBeNull();
      expect(library.getTexture('wallPaper').anisotropicFilteringLevel).toBe(2);

      library.applyQuality({ normalMaps: true, anisotropy: 8 });
      expect(library.wall.bumpTexture).toBe(library.getTexture('wallNormal'));
      expect(library.wallStained.bumpTexture).toBe(library.getTexture('wallNormal'));
      expect(library.carpet.bumpTexture).toBe(library.getTexture('carpetNormal'));
      expect(library.carpetWet.bumpTexture).toBe(library.getTexture('carpetNormal'));
      expect(library.quality).toEqual({ normalMaps: true, anisotropy: 8 });
      expect(() => library.applyQuality({ normalMaps: true, anisotropy: 0 })).toThrow(/anisotropy/);
    } finally {
      library.dispose();
      scene.dispose();
      engine.dispose();
    }
  });

  it('distingue fallos críticos, separa texturas rotas y conserva fallbacks de color', async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const library = new RoomMaterialLibrary(scene, {
      baseUrl: '/test-assets/',
      textureFactory: createTextureFactory(new Set<RoomTextureId>(['wallPaper', 'wallStained'])),
    });
    const snapshots: number[] = [];
    library.onReadinessChangedObservable.add((readiness) => {
      snapshots.push(readiness.failedCount);
    });

    try {
      const critical = await library.whenCriticalTexturesSettled();
      const all = await library.whenAllTexturesSettled();
      expect(critical.criticalSettled).toBe(true);
      expect(critical.criticalReady).toBe(false);
      expect(all).toMatchObject({ allSettled: true, failedCount: 2 });
      expect(all.failures.map((failure) => failure.id)).toEqual(['wallPaper', 'wallStained']);
      expect(all.failures.find((failure) => failure.id === 'wallPaper')?.critical).toBe(true);
      expect(all.failures.find((failure) => failure.id === 'wallStained')?.critical).toBe(false);
      expect(library.wall.diffuseTexture).toBeNull();
      expect(library.wallStained.diffuseTexture).toBeNull();
      expect(snapshots.at(-1)).toBe(2);
    } finally {
      library.dispose();
      scene.dispose();
      engine.dispose();
    }
  });
});
