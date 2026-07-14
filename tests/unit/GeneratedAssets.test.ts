import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  ASSET_GENERATOR_VERSION,
  ASSET_LICENSE,
  ASSET_SEED,
  checkGeneratedAssets,
  generateAssetBundle,
  GENERATED_ASSET_DIRECTORY,
} from '../../tools/generate-assets/generate';

const EXPECTED_FILES = [
  'wall-paper.png',
  'wall-stained.png',
  'wall-normal.png',
  'carpet.png',
  'carpet-wet.png',
  'carpet-normal.png',
  'ceiling-tile.png',
  'trim.png',
  'fixture-housing.png',
  'fixture-tube.png',
  'fixture-tube-off.png',
  'column.png',
] as const;

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

interface DecodedPng {
  width: number;
  height: number;
  rgba: Buffer;
}

function crcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}

const CRC_TABLE = crcTable();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function decodePng(bytes: Buffer): DecodedPng {
  expect(bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)).toBe(true);
  let cursor = PNG_SIGNATURE.length;
  let width = 0;
  let height = 0;
  const imageData: Buffer[] = [];
  while (cursor < bytes.length) {
    const length = bytes.readUInt32BE(cursor);
    const type = bytes.toString('ascii', cursor + 4, cursor + 8);
    const dataStart = cursor + 8;
    const dataEnd = dataStart + length;
    const data = bytes.subarray(dataStart, dataEnd);
    const storedCrc = bytes.readUInt32BE(dataEnd);
    expect(storedCrc, `${type} CRC`).toBe(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])));
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      expect(data[8]).toBe(8);
      expect(data[9]).toBe(6);
      expect(data[10]).toBe(0);
      expect(data[11]).toBe(0);
      expect(data[12]).toBe(0);
    } else if (type === 'IDAT') {
      imageData.push(data);
    }
    cursor = dataEnd + 4;
    if (type === 'IEND') {
      break;
    }
  }
  expect(width).toBeGreaterThan(0);
  expect(height).toBeGreaterThan(0);
  const inflated = inflateSync(Buffer.concat(imageData));
  const stride = width * 4;
  expect(inflated).toHaveLength((stride + 1) * height);
  const rgba = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const source = y * (stride + 1);
    expect(inflated[source], `row ${y} PNG filter`).toBe(0);
    inflated.copy(rgba, y * stride, source + 1, source + 1 + stride);
  }
  return { width, height, rgba };
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function isPowerOfTwo(value: number): boolean {
  return value > 0 && (value & (value - 1)) === 0;
}

function averageLuminance(image: DecodedPng): number {
  let total = 0;
  const pixels = image.width * image.height;
  for (let offset = 0; offset < image.rgba.length; offset += 4) {
    total +=
      (image.rgba[offset] ?? 0) * 0.2126 +
      (image.rgba[offset + 1] ?? 0) * 0.7152 +
      (image.rgba[offset + 2] ?? 0) * 0.0722;
  }
  return total / pixels;
}

function averageChannel(image: DecodedPng, channel: number): number {
  let total = 0;
  const pixels = image.width * image.height;
  for (let offset = channel; offset < image.rgba.length; offset += 4) {
    total += image.rgba[offset] ?? 0;
  }
  return total / pixels;
}

function expectExactTileSeams(image: DecodedPng): void {
  for (let y = 0; y < image.height; y += 1) {
    const first = y * image.width * 4;
    const last = (y * image.width + image.width - 1) * 4;
    expect(image.rgba.subarray(last, last + 4).equals(image.rgba.subarray(first, first + 4))).toBe(
      true,
    );
  }
  for (let x = 0; x < image.width; x += 1) {
    const first = x * 4;
    const last = ((image.height - 1) * image.width + x) * 4;
    expect(image.rgba.subarray(last, last + 4).equals(image.rgba.subarray(first, first + 4))).toBe(
      true,
    );
  }
}

function collectKeys(value: unknown, result: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectKeys(item, result);
    }
  } else if (typeof value === 'object' && value !== null) {
    for (const [key, nested] of Object.entries(value)) {
      result.push(key);
      collectKeys(nested, result);
    }
  }
  return result;
}

describe('generated Level 0 assets', () => {
  it('mantiene un manifest estable, completo, licenciado y sin timestamps', () => {
    const bundle = generateAssetBundle();
    expect(bundle.manifest.generator).toEqual({
      name: 'backrooms-level-zero-original-texture-generator',
      version: ASSET_GENERATOR_VERSION,
      seed: ASSET_SEED,
    });
    expect(bundle.manifest.license.spdx).toBe(ASSET_LICENSE);
    expect(bundle.manifest.assets.map((asset) => asset.file)).toEqual(EXPECTED_FILES);
    expect(
      collectKeys(bundle.manifest).filter((key) => /date|time|created|generatedAt/i.test(key)),
    ).toEqual([]);
    for (const asset of bundle.manifest.assets) {
      expect(asset.seed).toBe(`${ASSET_SEED}/${asset.id}`);
      expect(asset.generatorVersion).toBe(ASSET_GENERATOR_VERSION);
      expect(asset.license).toBe('CC0-1.0');
      expect(asset.role.length).toBeGreaterThan(0);
      expect(asset.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(asset.tileableAxes).toBe('xy');
      expect(isPowerOfTwo(asset.width)).toBe(true);
      expect(isPowerOfTwo(asset.height)).toBe(true);
    }
  });

  it('produce PNG RGBA válidos con dimensiones, CRC, hash y tileado verificables', () => {
    const bundle = generateAssetBundle();
    let totalBytes = 0;
    for (const asset of bundle.assets) {
      const decoded = decodePng(asset.bytes);
      totalBytes += asset.bytes.length;
      expect(decoded.width).toBe(asset.manifest.width);
      expect(decoded.height).toBe(asset.manifest.height);
      expect(sha256(asset.bytes)).toBe(asset.manifest.sha256);
      expectExactTileSeams(decoded);
      for (let alpha = 3; alpha < decoded.rgba.length; alpha += 4) {
        expect(decoded.rgba[alpha]).toBe(255);
      }
    }
    expect(totalBytes).toBeLessThan(1_000_000);
  });

  it('es determinista en memoria y coincide byte por byte con los outputs versionados', () => {
    const first = generateAssetBundle();
    const second = generateAssetBundle();
    expect(second.manifestText).toBe(first.manifestText);
    for (let index = 0; index < first.assets.length; index += 1) {
      const expected = first.assets[index];
      const repeated = second.assets[index];
      expect(expected).toBeDefined();
      expect(repeated).toBeDefined();
      if (expected === undefined || repeated === undefined) {
        continue;
      }
      expect(repeated.bytes.equals(expected.bytes)).toBe(true);
      expect(
        readFileSync(resolve(GENERATED_ASSET_DIRECTORY, expected.manifest.file)).equals(
          expected.bytes,
        ),
      ).toBe(true);
    }
    expect(readFileSync(resolve(GENERATED_ASSET_DIRECTORY, 'manifest.json'), 'utf8')).toBe(
      first.manifestText,
    );
    expect(checkGeneratedAssets()).toEqual([]);
  });

  it('conserva relaciones visuales básicas de Level 0 y normales mip-friendly', () => {
    const images = new Map(
      generateAssetBundle().assets.map((asset) => [asset.manifest.id, decodePng(asset.bytes)]),
    );
    const requireImage = (id: string): DecodedPng => {
      const image = images.get(id);
      expect(image, id).toBeDefined();
      return image as DecodedPng;
    };
    const wallBase = requireImage('wall-paper');
    const wallStained = requireImage('wall-stained');
    const carpetDry = requireImage('carpet');
    const carpetWet = requireImage('carpet-wet');
    const tube = requireImage('fixture-tube');
    const off = requireImage('fixture-tube-off');

    expect(wallStained.rgba.equals(wallBase.rgba)).toBe(false);
    expect(Math.abs(averageLuminance(carpetWet) - averageLuminance(carpetDry))).toBeLessThan(1);
    expect(averageLuminance(tube)).toBeGreaterThan(averageLuminance(off) + 45);
    for (const id of ['wall-normal', 'carpet-normal']) {
      const normal = requireImage(id);
      expect(averageChannel(normal, 0)).toBeGreaterThan(110);
      expect(averageChannel(normal, 0)).toBeLessThan(146);
      expect(averageChannel(normal, 1)).toBeGreaterThan(110);
      expect(averageChannel(normal, 1)).toBeLessThan(146);
      expect(averageChannel(normal, 2)).toBeGreaterThan(220);
    }
  });
});
