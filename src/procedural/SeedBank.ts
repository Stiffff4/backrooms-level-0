import type { SeedInput } from './procedural.types';

export type SeedStream = 'world' | 'visual' | 'audio' | 'tension';

const UINT32_RANGE = 0x1_0000_0000;

export function canonicalizeSeed(seed: SeedInput): string {
  if (typeof seed === 'number') {
    if (!Number.isFinite(seed)) {
      throw new Error('The procedural seed must be a finite number.');
    }

    return String(seed);
  }

  const normalized = seed.trim();
  if (normalized.length === 0) {
    throw new Error('The procedural seed cannot be empty.');
  }

  return normalized;
}

export function hashSeed(value: SeedInput): number {
  const text = canonicalizeSeed(value);
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

export function deriveSeed(seed: SeedInput, ...parts: readonly (string | number)[]): number {
  return hashSeed([canonicalizeSeed(seed), ...parts.map(String)].join('\u001f'));
}

export class SeededRandom {
  private state: number;

  public constructor(seed: number) {
    this.state = seed >>> 0;
  }

  public nextUint32(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return (value ^ (value >>> 14)) >>> 0;
  }

  public next(): number {
    return this.nextUint32() / UINT32_RANGE;
  }

  public int(minInclusive: number, maxExclusive: number): number {
    if (!Number.isInteger(minInclusive) || !Number.isInteger(maxExclusive)) {
      throw new Error('SeededRandom.int bounds must be integers.');
    }
    if (maxExclusive <= minInclusive) {
      throw new Error('SeededRandom.int requires maxExclusive > minInclusive.');
    }

    return minInclusive + Math.floor(this.next() * (maxExclusive - minInclusive));
  }

  public pick<T>(values: readonly T[]): T {
    if (values.length === 0) {
      throw new Error('Cannot pick from an empty collection.');
    }

    return values[this.int(0, values.length)] as T;
  }

  public weightedPick<T>(values: readonly T[], weightOf: (value: T) => number): T {
    if (values.length === 0) {
      throw new Error('Cannot pick from an empty weighted collection.');
    }

    const weights = values.map((value) => Math.max(0, weightOf(value)));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    if (!(total > 0)) {
      throw new Error('At least one weighted value must have a positive weight.');
    }

    let cursor = this.next() * total;
    for (let index = 0; index < values.length; index += 1) {
      cursor -= weights[index] as number;
      if (cursor < 0) {
        return values[index] as T;
      }
    }

    return values[values.length - 1] as T;
  }

  public shuffle<T>(values: readonly T[]): T[] {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const other = this.int(0, index + 1);
      [result[index], result[other]] = [result[other] as T, result[index] as T];
    }
    return result;
  }
}

export class SeedBank {
  public readonly seed: string;
  public readonly worldRng: SeededRandom;
  public readonly visualRng: SeededRandom;
  public readonly audioRng: SeededRandom;
  public readonly tensionRng: SeededRandom;

  public constructor(seed: SeedInput) {
    this.seed = canonicalizeSeed(seed);
    this.worldRng = this.createRng('world');
    this.visualRng = this.createRng('visual');
    this.audioRng = this.createRng('audio');
    this.tensionRng = this.createRng('tension');
  }

  public createRng(stream: SeedStream, scope = 'root'): SeededRandom {
    return new SeededRandom(deriveSeed(this.seed, stream, scope));
  }

  public derive(stream: SeedStream, scope: string | number): number {
    return deriveSeed(this.seed, stream, scope);
  }
}
