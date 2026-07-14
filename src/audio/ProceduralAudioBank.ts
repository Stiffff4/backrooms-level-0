export type AudioSeed = number | string;

export interface AudioBufferFactory {
  readonly sampleRate: number;
  createBuffer(numberOfChannels: number, length: number, sampleRate: number): AudioBuffer;
}

export interface ProceduralAudioBankOptions {
  readonly seed?: AudioSeed;
  readonly ambienceLoopSeconds?: number;
  readonly ballastLoopSeconds?: number;
  readonly buzzLoopSeconds?: number;
  readonly popDurationSeconds?: number;
}

export type ProceduralAudioBufferName =
  'ambienceNoise' | 'ballastNoise' | 'buzzNoise' | 'fluorescentPop';

export interface DeterministicAudioSequence {
  next(): number;
}

interface NoiseBand {
  readonly frequency: number;
  readonly gain: number;
}

interface ProceduralAudioBuffers {
  readonly ambienceNoise: AudioBuffer;
  readonly ballastNoise: AudioBuffer;
  readonly buzzNoise: AudioBuffer;
  readonly fluorescentPop: AudioBuffer;
}

const DEFAULT_SEED = 'threshold-level-zero';
const MIN_BUFFER_SECONDS = 0.04;
const MAX_BUFFER_SECONDS = 30;
const MIN_BUFFER_SAMPLES = 128;

const AMBIENCE_BANDS: readonly NoiseBand[] = [
  { frequency: 0.7, gain: 0.08 },
  { frequency: 3.1, gain: 0.16 },
  { frequency: 19, gain: 0.27 },
  { frequency: 113, gain: 0.29 },
  { frequency: 677, gain: 0.2 },
];

const BALLAST_BANDS: readonly NoiseBand[] = [
  { frequency: 2.3, gain: 0.09 },
  { frequency: 17, gain: 0.18 },
  { frequency: 137, gain: 0.31 },
  { frequency: 941, gain: 0.28 },
  { frequency: 3_701, gain: 0.14 },
];

const BUZZ_BANDS: readonly NoiseBand[] = [
  { frequency: 31, gain: 0.08 },
  { frequency: 211, gain: 0.19 },
  { frequency: 1_487, gain: 0.33 },
  { frequency: 5_291, gain: 0.26 },
  { frequency: 9_973, gain: 0.14 },
];

class XorShift32 implements DeterministicAudioSequence {
  private state: number;

  public constructor(seed: number) {
    this.state = seed === 0 ? 0x6d2b79f5 : seed >>> 0;
  }

  public next(): number {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state / 0x1_0000_0000;
  }
}

/** Stable FNV-1a hash used to split independent procedural audio streams. */
export function hashAudioSeed(seed: AudioSeed): number {
  const text = typeof seed === 'number' ? `n:${seed}` : `s:${seed}`;
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  const normalized = hash >>> 0;
  return normalized === 0 ? 0x6d2b79f5 : normalized;
}

export function createDeterministicAudioSequence(seed: AudioSeed): DeterministicAudioSequence {
  return new XorShift32(hashAudioSeed(seed));
}

function clampDuration(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(MAX_BUFFER_SECONDS, Math.max(MIN_BUFFER_SECONDS, value));
}

function smootherStep(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * clamped * (clamped * (clamped * 6 - 15) + 10);
}

function createBufferFromData(context: AudioBufferFactory, data: Float32Array): AudioBuffer {
  const buffer = context.createBuffer(1, data.length, context.sampleRate);
  buffer.getChannelData(0).set(data);
  return buffer;
}

function removeDcAndNormalize(samples: Float32Array, peakTarget: number): void {
  let mean = 0;
  for (const sample of samples) {
    mean += sample;
  }
  mean /= samples.length;

  let peak = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const centered = (samples[index] ?? 0) - mean;
    samples[index] = centered;
    peak = Math.max(peak, Math.abs(centered));
  }

  if (peak <= Number.EPSILON) {
    return;
  }

  const scale = peakTarget / peak;
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = (samples[index] ?? 0) * scale;
  }
}

/**
 * Builds periodic value noise. Every octave wraps onto its first knot with a
 * zero-slope interpolation, so looping does not introduce a click or DC step.
 */
function synthesizeNoiseLoop(
  sampleRate: number,
  durationSeconds: number,
  seed: number,
  bands: readonly NoiseBand[],
): Float32Array {
  const length = Math.max(MIN_BUFFER_SAMPLES, Math.round(sampleRate * durationSeconds));
  const samples = new Float32Array(length);
  const maximumKnots = Math.max(3, Math.floor(length / 4));

  for (let bandIndex = 0; bandIndex < bands.length; bandIndex += 1) {
    const band = bands[bandIndex];
    if (!band) {
      continue;
    }

    const sequence = new XorShift32((seed ^ Math.imul(bandIndex + 1, 0x9e3779b1)) >>> 0);
    const knotCount = Math.max(
      3,
      Math.min(maximumKnots, Math.round(durationSeconds * band.frequency)),
    );
    const knots = new Float32Array(knotCount);
    let knotMean = 0;

    for (let knotIndex = 0; knotIndex < knotCount; knotIndex += 1) {
      const value = sequence.next() * 2 - 1;
      knots[knotIndex] = value;
      knotMean += value;
    }
    knotMean /= knotCount;

    for (let knotIndex = 0; knotIndex < knotCount; knotIndex += 1) {
      knots[knotIndex] = (knots[knotIndex] ?? 0) - knotMean;
    }

    for (let sampleIndex = 0; sampleIndex < length; sampleIndex += 1) {
      const position = (sampleIndex * knotCount) / length;
      const leftIndex = Math.floor(position);
      const rightIndex = (leftIndex + 1) % knotCount;
      const blend = smootherStep(position - leftIndex);
      const left = knots[leftIndex] ?? 0;
      const right = knots[rightIndex] ?? 0;
      samples[sampleIndex] =
        (samples[sampleIndex] ?? 0) + (left + (right - left) * blend) * band.gain;
    }
  }

  removeDcAndNormalize(samples, 0.72);
  samples[length - 1] = samples[0] ?? 0;
  removeDcAndNormalize(samples, 0.72);
  return samples;
}

function synthesizeFluorescentPop(
  sampleRate: number,
  durationSeconds: number,
  seed: number,
): Float32Array {
  const length = Math.max(MIN_BUFFER_SAMPLES, Math.round(sampleRate * durationSeconds));
  const samples = new Float32Array(length);
  const sequence = new XorShift32(seed);
  let previousNoise = sequence.next() * 2 - 1;
  let phase = 0;

  for (let index = 0; index < length; index += 1) {
    const time = index / sampleRate;
    const progress = index / Math.max(1, length - 1);
    const attack = smootherStep(time / 0.009);
    const release = smootherStep((durationSeconds - time) / 0.055);
    const decay = Math.exp(-time * 17.5);
    const envelope = attack * release * decay;
    const currentNoise = sequence.next() * 2 - 1;
    const highPassedNoise = currentNoise - previousNoise * 0.91;
    previousNoise = currentNoise;

    // Keep the event in the dull ballast-click range. The previous 2.35 kHz
    // snap read as a firecracker in headphones.
    const frequency = 1_280 - progress * 690;
    phase += (Math.PI * 2 * frequency) / sampleRate;
    const electricalSnap = Math.sin(phase) * 0.22 + Math.sin(phase * 0.503) * 0.11;
    const ballastThump = Math.sin(Math.PI * 2 * 104 * time) * Math.exp(-time * 24) * 0.3;

    samples[index] = (highPassedNoise * 0.27 + electricalSnap + ballastThump) * envelope;
  }

  removeDcAndNormalize(samples, 0.7);
  samples[0] = 0;
  samples[length - 1] = 0;
  return samples;
}

export class ProceduralAudioBank {
  /** Buffers do not allocate graph nodes; kept for shared audio debug tooling. */
  public readonly nodeCount = 0;

  private readonly baseSeed: number;
  private buffers: ProceduralAudioBuffers | null;
  private disposed = false;

  public constructor(context: AudioBufferFactory, options: ProceduralAudioBankOptions = {}) {
    if (!Number.isFinite(context.sampleRate) || context.sampleRate <= 0) {
      throw new RangeError('Audio sample rate must be a positive finite number.');
    }

    this.baseSeed = hashAudioSeed(options.seed ?? DEFAULT_SEED);
    const ambienceDuration = clampDuration(options.ambienceLoopSeconds, 8.173);
    const ballastDuration = clampDuration(options.ballastLoopSeconds, 6.371);
    const buzzDuration = clampDuration(options.buzzLoopSeconds, 4.927);
    const popDuration = clampDuration(options.popDurationSeconds, 0.42);

    this.buffers = {
      ambienceNoise: createBufferFromData(
        context,
        synthesizeNoiseLoop(
          context.sampleRate,
          ambienceDuration,
          this.deriveSeed('ambience-noise'),
          AMBIENCE_BANDS,
        ),
      ),
      ballastNoise: createBufferFromData(
        context,
        synthesizeNoiseLoop(
          context.sampleRate,
          ballastDuration,
          this.deriveSeed('ballast-noise'),
          BALLAST_BANDS,
        ),
      ),
      buzzNoise: createBufferFromData(
        context,
        synthesizeNoiseLoop(
          context.sampleRate,
          buzzDuration,
          this.deriveSeed('buzz-noise'),
          BUZZ_BANDS,
        ),
      ),
      fluorescentPop: createBufferFromData(
        context,
        synthesizeFluorescentPop(
          context.sampleRate,
          popDuration,
          this.deriveSeed('fluorescent-pop'),
        ),
      ),
    };
  }

  public get ambienceNoise(): AudioBuffer {
    return this.requireBuffers().ambienceNoise;
  }

  public get ballastNoise(): AudioBuffer {
    return this.requireBuffers().ballastNoise;
  }

  public get buzzNoise(): AudioBuffer {
    return this.requireBuffers().buzzNoise;
  }

  public get fluorescentPop(): AudioBuffer {
    return this.requireBuffers().fluorescentPop;
  }

  public get isDisposed(): boolean {
    return this.disposed;
  }

  public getBuffer(name: ProceduralAudioBufferName): AudioBuffer {
    return this.requireBuffers()[name];
  }

  public createSequence(streamName: string): DeterministicAudioSequence {
    if (this.disposed) {
      throw new Error('ProceduralAudioBank has been disposed.');
    }
    return new XorShift32(this.deriveSeed(streamName));
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.buffers = null;
  }

  private deriveSeed(streamName: string): number {
    return hashAudioSeed(`${this.baseSeed}:${streamName}`);
  }

  private requireBuffers(): ProceduralAudioBuffers {
    if (!this.buffers) {
      throw new Error('ProceduralAudioBank has been disposed.');
    }
    return this.buffers;
  }
}
