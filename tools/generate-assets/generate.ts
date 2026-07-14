import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { constants as zlibConstants, deflateSync } from 'node:zlib';

export const ASSET_GENERATOR_VERSION = '1.2.0';
export const ASSET_MANIFEST_VERSION = 1;
export const ASSET_SEED = 'level-zero-threshold-textures-v2';
export const ASSET_LICENSE = 'CC0-1.0';
export const GENERATED_ASSET_DIRECTORY = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../public/assets/generated',
);

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const NORMAL_STRENGTH = 2.4;

type Rgba = readonly [number, number, number, number];
type TileableAxes = 'xy';
type ColorSpace = 'srgb' | 'linear';

interface PixelImage {
  width: number;
  height: number;
  data: Uint8Array;
}

interface AssetRecipe {
  id: string;
  file: string;
  role: string;
  width: number;
  height: number;
  colorSpace: ColorSpace;
  tileableAxes: TileableAxes;
  build: (seed: number) => PixelImage;
}

export interface GeneratedAssetManifestEntry {
  id: string;
  file: string;
  role: string;
  width: number;
  height: number;
  colorSpace: ColorSpace;
  tileableAxes: TileableAxes;
  seed: string;
  generatorVersion: string;
  sha256: string;
  license: string;
}

export interface GeneratedAssetManifest {
  manifestVersion: number;
  generator: {
    name: string;
    version: string;
    seed: string;
  };
  license: {
    spdx: string;
    source: string;
  };
  assets: GeneratedAssetManifestEntry[];
}

export interface GeneratedAsset {
  manifest: GeneratedAssetManifestEntry;
  bytes: Buffer;
}

export interface GeneratedAssetBundle {
  manifest: GeneratedAssetManifest;
  manifestText: string;
  assets: GeneratedAsset[];
}

const PALETTE = Object.freeze({
  agedYellow: [207, 197, 139, 255] as const,
  nicotineBeige: [218, 210, 159, 255] as const,
  sickCream: [231, 228, 208, 255] as const,
  dampBrown: [139, 125, 94, 255] as const,
  greenGray: [151, 151, 118, 255] as const,
  fluorescentWhite: [245, 245, 220, 255] as const,
  softShadow: [76, 74, 61, 255] as const,
  carpetTan: [164, 149, 116, 255] as const,
  carpetFiber: [139, 126, 98, 255] as const,
  ceilingSeam: [126, 128, 116, 255] as const,
});

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function smoothStep(value: number): number {
  return value * value * (3 - 2 * value);
}

function mix(first: number, second: number, amount: number): number {
  return first + (second - first) * amount;
}

function mixColor(first: Rgba, second: Rgba, amount: number): Rgba {
  const normalized = Math.max(0, Math.min(1, amount));
  return [
    clampByte(mix(first[0], second[0], normalized)),
    clampByte(mix(first[1], second[1], normalized)),
    clampByte(mix(first[2], second[2], normalized)),
    clampByte(mix(first[3], second[3], normalized)),
  ];
}

function shade(color: Rgba, delta: number): Rgba {
  return [
    clampByte(color[0] + delta),
    clampByte(color[1] + delta),
    clampByte(color[2] + delta),
    color[3],
  ];
}

function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  return (hash ^ (hash >>> 16)) >>> 0;
}

function hashUnit(seed: number, x: number, y: number): number {
  let value = seed ^ Math.imul(x + 0x9e3779b9, 0x85ebca6b);
  value ^= Math.imul(y + 0x7f4a7c15, 0xc2b2ae35);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  return ((value ^ (value >>> 16)) >>> 0) / 0x1_0000_0000;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function valueNoise(
  x: number,
  y: number,
  width: number,
  height: number,
  cellSize: number,
  seed: number,
): number {
  const columns = Math.max(1, Math.floor(width / cellSize));
  const rows = Math.max(1, Math.floor(height / cellSize));
  const scaledX = x / cellSize;
  const scaledY = y / cellSize;
  const left = Math.floor(scaledX);
  const top = Math.floor(scaledY);
  const amountX = smoothStep(scaledX - left);
  const amountY = smoothStep(scaledY - top);
  const sample = (sampleX: number, sampleY: number): number =>
    hashUnit(seed, positiveModulo(sampleX, columns), positiveModulo(sampleY, rows));
  const upper = mix(sample(left, top), sample(left + 1, top), amountX);
  const lower = mix(sample(left, top + 1), sample(left + 1, top + 1), amountX);
  return mix(upper, lower, amountY);
}

function fractalNoise(x: number, y: number, width: number, height: number, seed: number): number {
  return (
    valueNoise(x, y, width, height, 32, seed) * 0.5 +
    valueNoise(x, y, width, height, 16, seed ^ 0x68bc21eb) * 0.3 +
    valueNoise(x, y, width, height, 8, seed ^ 0x02e5be93) * 0.2
  );
}

function torusDistance(value: number, center: number, size: number): number {
  const distance = Math.abs(value - center);
  return Math.min(distance, size - distance);
}

function createImage(
  width: number,
  height: number,
  painter: (x: number, y: number) => Rgba,
): PixelImage {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = painter(x, y);
      const offset = (y * width + x) * 4;
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = color[3];
    }
  }
  return { width, height, data };
}

function enforceTileable(image: PixelImage): PixelImage {
  const { width, height, data } = image;
  for (let y = 0; y < height; y += 1) {
    const first = y * width * 4;
    const last = (y * width + width - 1) * 4;
    for (let channel = 0; channel < 4; channel += 1) {
      data[last + channel] = data[first + channel] ?? 0;
    }
  }
  for (let x = 0; x < width; x += 1) {
    const first = x * 4;
    const last = ((height - 1) * width + x) * 4;
    for (let channel = 0; channel < 4; channel += 1) {
      data[last + channel] = data[first + channel] ?? 0;
    }
  }
  return image;
}

function heightMap(
  width: number,
  height: number,
  painter: (x: number, y: number) => number,
): Float32Array {
  const result = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      result[y * width + x] = painter(x, y);
    }
  }
  return result;
}

function normalMap(width: number, height: number, heights: Float32Array): PixelImage {
  const sample = (x: number, y: number): number =>
    heights[positiveModulo(y, height) * width + positiveModulo(x, width)] ?? 0;
  return enforceTileable(
    createImage(width, height, (x, y) => {
      const dx = (sample(x - 1, y) - sample(x + 1, y)) * NORMAL_STRENGTH;
      const dy = (sample(x, y - 1) - sample(x, y + 1)) * NORMAL_STRENGTH;
      const inverseLength = 1 / Math.hypot(dx, dy, 1);
      return [
        clampByte((dx * inverseLength * 0.5 + 0.5) * 255),
        clampByte((dy * inverseLength * 0.5 + 0.5) * 255),
        clampByte((inverseLength * 0.5 + 0.5) * 255),
        255,
      ];
    }),
  );
}

function wallHeight(width: number, height: number, seed: number): Float32Array {
  return heightMap(width, height, (x, y) => {
    const paper = fractalNoise(x, y, width, height, seed) * 0.08;
    const repeatX = positiveModulo(x, 24) - 12;
    const repeatY = positiveModulo(y, 18);
    const chevron = repeatY < 9 ? repeatY * 0.48 : (18 - repeatY) * 0.48;
    const motif = Math.abs(Math.abs(repeatX) - chevron) < 0.85 && Math.abs(repeatX) < 5;
    return 0.5 + paper + (motif ? 0.055 : 0);
  });
}

function buildWall(seed: number, stained: boolean): PixelImage {
  const width = 128;
  const height = 128;
  return enforceTileable(
    createImage(width, height, (x, y) => {
      const noise = fractalNoise(x, y, width, height, seed) - 0.5;
      let color = shade(PALETTE.nicotineBeige, noise * 7);

      // Repeating narrow chevrons and pin dots approximate the classic Level 0
      // wallpaper without copying the reference photograph itself.
      const repeatX = positiveModulo(x, 24) - 12;
      const repeatY = positiveModulo(y, 18);
      const chevron = repeatY < 9 ? repeatY * 0.48 : (18 - repeatY) * 0.48;
      const diagonal = Math.abs(Math.abs(repeatX) - chevron) < 0.72 && Math.abs(repeatX) < 5;
      const centerDash = Math.abs(repeatX) < 0.72 && (repeatY <= 2 || repeatY >= 16);
      const pinDot = repeatX * repeatX + (repeatY - 9) * (repeatY - 9) < 1.15;
      if (diagonal || centerDash || pinDot) {
        color = mixColor(color, PALETTE.greenGray, 0.28);
      }

      const secondaryDot = positiveModulo(x + 12, 24) === 0 && positiveModulo(y + 4, 18) === 0;
      if (secondaryDot) {
        color = mixColor(color, PALETTE.greenGray, 0.2);
      }

      if (stained) {
        const sparseAge = hashUnit(seed ^ 0x43a9f12b, Math.floor(x / 3), Math.floor(y / 3));
        if (sparseAge > 0.992) {
          color = mixColor(color, PALETTE.dampBrown, 0.09);
        }
      }
      return color;
    }),
  );
}

function carpetHeight(width: number, height: number, seed: number): Float32Array {
  return heightMap(width, height, (x, y) => {
    const broad = fractalNoise(x, y, width, height, seed) * 0.055;
    const fibers = Math.sin(((x * 5 + y * 2) / 10) * Math.PI * 2) * 0.018;
    return 0.48 + broad + fibers;
  });
}

function buildCarpet(seed: number): PixelImage {
  const width = 128;
  const height = 128;
  return enforceTileable(
    createImage(width, height, (x, y) => {
      const noise = fractalNoise(x, y, width, height, seed) - 0.5;
      const fiber = (Math.sin(((x * 5 + y * 2) / 10) * Math.PI * 2) + 1) * 0.5;
      let color = mixColor(PALETTE.carpetFiber, PALETTE.carpetTan, 0.72 + noise * 0.14);
      color = shade(color, fiber * 4 - 2);
      return color;
    }),
  );
}

function buildCeiling(seed: number): PixelImage {
  const width = 128;
  const height = 128;
  return enforceTileable(
    createImage(width, height, (x, y) => {
      const seam = x % 32 <= 1 || y % 32 <= 1;
      const panelX = Math.floor(x / 32);
      const panelY = Math.floor(y / 32);
      const panelVariation = hashUnit(seed, panelX, panelY) - 0.5;
      const noise = fractalNoise(x, y, width, height, seed) - 0.5;
      let color = shade(PALETTE.sickCream, panelVariation * 5 + noise * 4);
      if (seam) {
        color = mixColor(color, PALETTE.ceilingSeam, 0.48);
      }
      return color;
    }),
  );
}

function buildTrim(seed: number): PixelImage {
  const width = 128;
  const height = 32;
  return enforceTileable(
    createImage(width, height, (x, y) => {
      const vertical = Math.abs(y - height / 2) / (height / 2);
      const noise = fractalNoise(x, y, width, height, seed) - 0.5;
      let color = mixColor(PALETTE.dampBrown, PALETTE.nicotineBeige, 0.28 + (1 - vertical) * 0.2);
      color = shade(color, noise * 10);
      if (y === 4 || y === height - 5 || x % 32 === 0) {
        color = mixColor(color, PALETTE.softShadow, 0.38);
      }
      return color;
    }),
  );
}

function buildFixture(seed: number, kind: 'housing' | 'tube' | 'off'): PixelImage {
  const width = 128;
  const height = 64;
  return enforceTileable(
    createImage(width, height, (x, y) => {
      const edgeDistance = Math.min(x, width - 1 - x, y, height - 1 - y);
      const noise = fractalNoise(x, y, width, height, seed) - 0.5;
      if (kind === 'housing') {
        let color = shade(PALETTE.greenGray, noise * 9 + (edgeDistance > 5 ? 7 : -17));
        if (y === 8 || y === height - 9 || x % 32 === 0) {
          color = mixColor(color, PALETTE.softShadow, 0.35);
        }
        return color;
      }
      const centerDistance = Math.abs(y - (height - 1) / 2) / (height / 2);
      const tubeMask = Math.max(0, 1 - centerDistance * 2.35);
      const endFade = smoothStep(Math.min(1, torusDistance(x, 0, width) / 20));
      const base = kind === 'tube' ? PALETTE.fluorescentWhite : PALETTE.greenGray;
      const surround = kind === 'tube' ? PALETTE.sickCream : PALETTE.softShadow;
      let color = mixColor(surround, base, tubeMask * (0.72 + endFade * 0.28));
      color = shade(color, noise * (kind === 'tube' ? 3 : 7));
      return color;
    }),
  );
}

function buildColumn(seed: number): PixelImage {
  const width = 128;
  const height = 128;
  return enforceTileable(
    createImage(width, height, (x, y) => {
      const noise = fractalNoise(x, y, width, height, seed ^ 0x2bb0d0ac) - 0.5;
      let color = mixColor(PALETTE.sickCream, PALETTE.nicotineBeige, 0.74);
      color = shade(color, noise * 6);

      const repeatX = positiveModulo(x, 24) - 12;
      const repeatY = positiveModulo(y, 18);
      const chevron = repeatY < 9 ? repeatY * 0.48 : (18 - repeatY) * 0.48;
      const diagonal = Math.abs(Math.abs(repeatX) - chevron) < 0.68 && Math.abs(repeatX) < 5;
      const centerDash = Math.abs(repeatX) < 0.72 && (repeatY <= 2 || repeatY >= 16);
      const pinDot = repeatX * repeatX + (repeatY - 9) * (repeatY - 9) < 1.15;
      if (diagonal || centerDash || pinDot) {
        color = mixColor(color, PALETTE.greenGray, 0.24);
      }

      if (x % 32 <= 1) {
        color = mixColor(color, PALETTE.softShadow, 0.08);
      }
      return color;
    }),
  );
}

const RECIPES: readonly AssetRecipe[] = [
  {
    id: 'wall-paper',
    file: 'wall-paper.png',
    role: 'wall-albedo-base',
    width: 128,
    height: 128,
    colorSpace: 'srgb',
    tileableAxes: 'xy',
    build: (seed) => buildWall(seed, false),
  },
  {
    id: 'wall-stained',
    file: 'wall-stained.png',
    role: 'wall-albedo-stained',
    width: 128,
    height: 128,
    colorSpace: 'srgb',
    tileableAxes: 'xy',
    build: (seed) => buildWall(seed, true),
  },
  {
    id: 'wall-normal',
    file: 'wall-normal.png',
    role: 'wall-normal',
    width: 128,
    height: 128,
    colorSpace: 'linear',
    tileableAxes: 'xy',
    build: (seed) => normalMap(128, 128, wallHeight(128, 128, seed)),
  },
  {
    id: 'carpet',
    file: 'carpet.png',
    role: 'carpet-albedo-dry',
    width: 128,
    height: 128,
    colorSpace: 'srgb',
    tileableAxes: 'xy',
    build: buildCarpet,
  },
  {
    id: 'carpet-wet',
    file: 'carpet-wet.png',
    role: 'carpet-albedo-wet',
    width: 128,
    height: 128,
    colorSpace: 'srgb',
    tileableAxes: 'xy',
    build: buildCarpet,
  },
  {
    id: 'carpet-normal',
    file: 'carpet-normal.png',
    role: 'carpet-normal',
    width: 128,
    height: 128,
    colorSpace: 'linear',
    tileableAxes: 'xy',
    build: (seed) => normalMap(128, 128, carpetHeight(128, 128, seed)),
  },
  {
    id: 'ceiling-tile',
    file: 'ceiling-tile.png',
    role: 'ceiling-albedo',
    width: 128,
    height: 128,
    colorSpace: 'srgb',
    tileableAxes: 'xy',
    build: buildCeiling,
  },
  {
    id: 'trim',
    file: 'trim.png',
    role: 'trim-albedo',
    width: 128,
    height: 32,
    colorSpace: 'srgb',
    tileableAxes: 'xy',
    build: buildTrim,
  },
  {
    id: 'fixture-housing',
    file: 'fixture-housing.png',
    role: 'fixture-housing-albedo',
    width: 128,
    height: 64,
    colorSpace: 'srgb',
    tileableAxes: 'xy',
    build: (seed) => buildFixture(seed, 'housing'),
  },
  {
    id: 'fixture-tube',
    file: 'fixture-tube.png',
    role: 'fixture-tube-emissive',
    width: 128,
    height: 64,
    colorSpace: 'srgb',
    tileableAxes: 'xy',
    build: (seed) => buildFixture(seed, 'tube'),
  },
  {
    id: 'fixture-tube-off',
    file: 'fixture-tube-off.png',
    role: 'fixture-tube-off',
    width: 128,
    height: 64,
    colorSpace: 'srgb',
    tileableAxes: 'xy',
    build: (seed) => buildFixture(seed, 'off'),
  },
  {
    id: 'column',
    file: 'column.png',
    role: 'column-albedo',
    width: 128,
    height: 128,
    colorSpace: 'srgb',
    tileableAxes: 'xy',
    build: buildColumn,
  },
];

function createCrcTable(): Uint32Array {
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

const CRC_TABLE = createCrcTable();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([length, typeBytes, data, checksum]);
}

export function encodePng(image: PixelImage): Buffer {
  if (image.data.length !== image.width * image.height * 4) {
    throw new Error('RGBA image data does not match its dimensions.');
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.width, 0);
  header.writeUInt32BE(image.height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const stride = image.width * 4;
  const scanlines = Buffer.alloc((stride + 1) * image.height);
  for (let y = 0; y < image.height; y += 1) {
    const targetOffset = y * (stride + 1);
    scanlines[targetOffset] = 0;
    scanlines.set(image.data.subarray(y * stride, (y + 1) * stride), targetOffset + 1);
  }
  const compressed = deflateSync(scanlines, {
    level: 9,
    memLevel: 9,
    strategy: zlibConstants.Z_FIXED,
  });
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', header),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function validateRecipeOutput(recipe: AssetRecipe, image: PixelImage): void {
  if (image.width !== recipe.width || image.height !== recipe.height) {
    throw new Error(`${recipe.id} generated unexpected dimensions.`);
  }
  if (
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    (image.width & (image.width - 1)) !== 0 ||
    (image.height & (image.height - 1)) !== 0
  ) {
    throw new Error(`${recipe.id} dimensions must be powers of two.`);
  }
  for (let y = 0; y < image.height; y += 1) {
    for (let channel = 0; channel < 4; channel += 1) {
      const first = image.data[y * image.width * 4 + channel];
      const last = image.data[(y * image.width + image.width - 1) * 4 + channel];
      if (first !== last) {
        throw new Error(`${recipe.id} is not horizontally tileable.`);
      }
    }
  }
  for (let x = 0; x < image.width; x += 1) {
    for (let channel = 0; channel < 4; channel += 1) {
      const first = image.data[x * 4 + channel];
      const last = image.data[((image.height - 1) * image.width + x) * 4 + channel];
      if (first !== last) {
        throw new Error(`${recipe.id} is not vertically tileable.`);
      }
    }
  }
}

export function generateAssetBundle(): GeneratedAssetBundle {
  const assets: GeneratedAsset[] = RECIPES.map((recipe) => {
    const seedText = `${ASSET_SEED}/${recipe.id}`;
    const image = recipe.build(hashString(seedText));
    validateRecipeOutput(recipe, image);
    const bytes = encodePng(image);
    return {
      bytes,
      manifest: {
        id: recipe.id,
        file: recipe.file,
        role: recipe.role,
        width: recipe.width,
        height: recipe.height,
        colorSpace: recipe.colorSpace,
        tileableAxes: recipe.tileableAxes,
        seed: seedText,
        generatorVersion: ASSET_GENERATOR_VERSION,
        sha256: sha256(bytes),
        license: ASSET_LICENSE,
      },
    };
  });
  const manifest: GeneratedAssetManifest = {
    manifestVersion: ASSET_MANIFEST_VERSION,
    generator: {
      name: 'backrooms-level-zero-original-texture-generator',
      version: ASSET_GENERATOR_VERSION,
      seed: ASSET_SEED,
    },
    license: {
      spdx: ASSET_LICENSE,
      source: 'Original procedural artwork generated locally by this repository.',
    },
    assets: assets.map((asset) => asset.manifest),
  };
  return {
    manifest,
    manifestText: `${JSON.stringify(manifest, null, 2)}\n`,
    assets,
  };
}

export function writeGeneratedAssets(
  outputDirectory = GENERATED_ASSET_DIRECTORY,
): GeneratedAssetBundle {
  const bundle = generateAssetBundle();
  mkdirSync(outputDirectory, { recursive: true });
  const expectedFiles = new Set([
    'manifest.json',
    ...bundle.assets.map((asset) => asset.manifest.file),
  ]);
  for (const entry of readdirSync(outputDirectory, { withFileTypes: true })) {
    if (entry.isFile() && !expectedFiles.has(entry.name)) {
      unlinkSync(resolve(outputDirectory, entry.name));
    }
  }
  for (const asset of bundle.assets) {
    writeFileSync(resolve(outputDirectory, asset.manifest.file), asset.bytes);
  }
  writeFileSync(resolve(outputDirectory, 'manifest.json'), bundle.manifestText, 'utf8');
  return bundle;
}

export function checkGeneratedAssets(outputDirectory = GENERATED_ASSET_DIRECTORY): string[] {
  const expected = generateAssetBundle();
  const issues: string[] = [];
  if (!existsSync(outputDirectory)) {
    return [`Missing generated asset directory: ${outputDirectory}`];
  }
  const expectedFiles = new Set([
    'manifest.json',
    ...expected.assets.map((asset) => asset.manifest.file),
  ]);
  const actualFiles = readdirSync(outputDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  for (const file of actualFiles) {
    if (!expectedFiles.has(file)) {
      issues.push(`Unexpected generated asset: ${file}`);
    }
  }
  for (const file of expectedFiles) {
    const target = resolve(outputDirectory, file);
    if (!existsSync(target)) {
      issues.push(`Missing generated asset: ${file}`);
    }
  }
  const manifestPath = resolve(outputDirectory, 'manifest.json');
  if (existsSync(manifestPath) && readFileSync(manifestPath, 'utf8') !== expected.manifestText) {
    issues.push('manifest.json does not match deterministic generator output.');
  }
  for (const asset of expected.assets) {
    const target = resolve(outputDirectory, asset.manifest.file);
    if (existsSync(target) && !readFileSync(target).equals(asset.bytes)) {
      issues.push(`${asset.manifest.file} does not match deterministic generator output.`);
    }
  }
  return issues;
}

function runCli(): void {
  const mode = process.argv[2] ?? '--write';
  if (mode === '--check') {
    const issues = checkGeneratedAssets();
    if (issues.length > 0) {
      for (const issue of issues) {
        console.error(`- ${issue}`);
      }
      process.exitCode = 1;
      return;
    }
    console.log(`Generated assets are current (${RECIPES.length} deterministic PNG files).`);
    return;
  }
  if (mode !== '--write') {
    throw new Error(`Unknown asset generator mode: ${mode}`);
  }
  const bundle = writeGeneratedAssets();
  const totalBytes = bundle.assets.reduce((total, asset) => total + asset.bytes.length, 0);
  console.log(
    `Generated ${bundle.assets.length} original PNG textures (${totalBytes} bytes) in ${GENERATED_ASSET_DIRECTORY}.`,
  );
}

const invokedUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedUrl) {
  runCli();
}
