import type { PlayerMovementFrame } from '../player/player.types';
import { gameConfig } from '../config/game.config';

export const WET_CARPET_CONDITIONS = ['normal', 'damp', 'saturated', 'puddle'] as const;

export type WetCarpetCondition = (typeof WET_CARPET_CONDITIONS)[number];
export type FootSide = 'left' | 'right';

export interface FootstepAudioContext {
  readonly currentTime: number;
  readonly sampleRate: number;
  createBuffer(numberOfChannels: number, length: number, sampleRate: number): AudioBuffer;
  createBufferSource(): AudioBufferSourceNode;
  createGain(): GainNode;
  createStereoPanner(): StereoPannerNode;
}

export interface FootstepSystemOptions {
  readonly seed?: number;
  readonly walkStrideLength?: number;
  readonly sprintStrideLength?: number;
  readonly initialCondition?: WetCarpetCondition;
  readonly maxStepsPerUpdate?: number;
  readonly maxActiveVoices?: number;
}

export interface FootstepUpdateOptions {
  readonly paused?: boolean;
  readonly rebased?: boolean;
  readonly condition?: WetCarpetCondition;
  readonly wetness?: number;
}

export interface FootstepPlayback {
  readonly side: FootSide;
  readonly condition: WetCarpetCondition;
  readonly sprinting: boolean;
  readonly variant: number;
  readonly playbackRate: number;
  readonly gain: number;
}

export type FootstepListener = (playback: Readonly<FootstepPlayback>) => void;

interface WetCarpetProfile {
  readonly durationSeconds: number;
  readonly moisture: number;
  readonly impactFrequency: number;
  readonly fibreAmount: number;
  readonly waterAmount: number;
}

interface ActiveVoice {
  readonly source: AudioBufferSourceNode;
  readonly gain: GainNode;
  readonly panner: StereoPannerNode;
}

const DEFAULT_SEED = 0x6c65_7665;
const DEFAULT_WALK_STRIDE = gameConfig.movement.walkStepDistance;
const DEFAULT_SPRINT_STRIDE = gameConfig.movement.sprintStepDistance;
const DEFAULT_MAX_STEPS_PER_UPDATE = 4;
const DEFAULT_MAX_ACTIVE_VOICES = 8;
const BUFFER_VARIANTS = 3;
const MIN_SAMPLE_RATE = 8_000;
const TWO_PI = Math.PI * 2;

const WET_CARPET_PROFILES: Readonly<Record<WetCarpetCondition, WetCarpetProfile>> = {
  normal: {
    durationSeconds: 0.14,
    moisture: 0.08,
    impactFrequency: 74,
    fibreAmount: 0.76,
    waterAmount: 0.04,
  },
  damp: {
    durationSeconds: 0.17,
    moisture: 0.38,
    impactFrequency: 68,
    fibreAmount: 0.66,
    waterAmount: 0.26,
  },
  saturated: {
    durationSeconds: 0.21,
    moisture: 0.72,
    impactFrequency: 61,
    fibreAmount: 0.52,
    waterAmount: 0.55,
  },
  puddle: {
    durationSeconds: 0.25,
    moisture: 1,
    impactFrequency: 55,
    fibreAmount: 0.4,
    waterAmount: 0.82,
  },
};

/**
 * Distance-driven footsteps for the single Level 0 surface family.
 *
 * The class intentionally receives only the small Web Audio surface it uses, so
 * unit tests and non-browser tools can supply deterministic audio implementations.
 */
export class FootstepSystem {
  private readonly walkStrideLength: number;
  private readonly sprintStrideLength: number;
  private readonly maxStepsPerUpdate: number;
  private readonly maxActiveVoices: number;
  private readonly random: SeededRandom;
  private readonly buffers: Readonly<Record<WetCarpetCondition, readonly AudioBuffer[]>>;
  private readonly listeners = new Set<FootstepListener>();
  private readonly activeVoices = new Set<ActiveVoice>();
  private condition: WetCarpetCondition;
  private stepProgress = 0;
  private lastStrideLength: number = DEFAULT_WALK_STRIDE;
  private nextSide: FootSide = 'left';
  private paused = false;
  private disposed = false;

  public constructor(
    private readonly context: FootstepAudioContext,
    private readonly destination: AudioNode,
    options: FootstepSystemOptions = {},
  ) {
    this.walkStrideLength = positiveOr(options.walkStrideLength, DEFAULT_WALK_STRIDE);
    this.sprintStrideLength = positiveOr(options.sprintStrideLength, DEFAULT_SPRINT_STRIDE);
    this.maxStepsPerUpdate = positiveIntegerOr(
      options.maxStepsPerUpdate,
      DEFAULT_MAX_STEPS_PER_UPDATE,
    );
    this.maxActiveVoices = positiveIntegerOr(options.maxActiveVoices, DEFAULT_MAX_ACTIVE_VOICES);
    this.condition = options.initialCondition ?? 'damp';

    const seed = normalizeSeed(options.seed ?? DEFAULT_SEED);
    this.random = new SeededRandom(seed ^ 0xa511_e9b3);
    this.buffers = createWetCarpetBuffers(context, seed);
  }

  public get pendingDistance(): number {
    return this.stepProgress * this.lastStrideLength;
  }

  public get footSide(): FootSide {
    return this.nextSide;
  }

  public get surfaceCondition(): WetCarpetCondition {
    return this.condition;
  }

  public get activeVoiceCount(): number {
    return this.activeVoices.size;
  }

  public get isDisposed(): boolean {
    return this.disposed;
  }

  public subscribe(listener: FootstepListener): () => void {
    if (this.disposed) {
      return () => undefined;
    }

    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
  }

  public setSurfaceCondition(condition: WetCarpetCondition): void {
    this.condition = condition;
  }

  public setWetness(wetness: number): void {
    this.condition = conditionFromWetness(wetness);
  }

  /** Clears teleport/rebase displacement without changing foot alternation. */
  public resetAfterRebase(): void {
    // A floating-origin rebase happens after the movement frame was measured,
    // so it contributes no artificial distance. Preserve the gait phase to
    // keep footsteps and head bob synchronized across long sessions.
  }

  /**
   * Consumes a PlayerController movement frame and returns the number of steps
   * started. deltaSeconds is deliberately irrelevant: cadence comes from distance.
   */
  public update(
    frame: Readonly<PlayerMovementFrame>,
    options: Readonly<FootstepUpdateOptions> = {},
  ): number {
    if (options.wetness !== undefined) {
      this.setWetness(options.wetness);
    } else if (options.condition !== undefined) {
      this.setSurfaceCondition(options.condition);
    }

    if (options.rebased === true) {
      this.resetAfterRebase();
      return 0;
    }

    if (this.disposed || this.paused || options.paused === true || !frame.moving) {
      return 0;
    }

    const distance = finiteNonNegative(frame.distance);
    if (distance === 0) {
      return 0;
    }

    const strideLength = frame.sprinting ? this.sprintStrideLength : this.walkStrideLength;
    this.lastStrideLength = strideLength;
    this.stepProgress += distance / strideLength;

    let played = 0;
    while (this.stepProgress >= 1 && played < this.maxStepsPerUpdate && !this.disposed) {
      this.stepProgress -= 1;
      this.play(frame.sprinting);
      played += 1;
    }

    // A corrupted/teleport-like frame must never create a backlog of steps.
    if (this.stepProgress >= 1) {
      this.stepProgress %= 1;
    }

    return played;
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.listeners.clear();

    for (const voice of [...this.activeVoices]) {
      voice.source.onended = null;
      try {
        voice.source.stop();
      } catch {
        // A source that naturally ended may reject a second stop; cleanup still applies.
      }
      this.cleanupVoice(voice);
    }

    this.stepProgress = 0;
  }

  private play(sprinting: boolean): void {
    const conditionBuffers = this.buffers[this.condition];
    const variant = Math.min(
      conditionBuffers.length - 1,
      Math.floor(this.random.next() * conditionBuffers.length),
    );
    const buffer = conditionBuffers[variant];
    if (buffer === undefined) {
      return;
    }

    while (this.activeVoices.size >= this.maxActiveVoices) {
      const oldest = this.activeVoices.values().next().value;
      if (!oldest) {
        break;
      }
      oldest.source.onended = null;
      try {
        oldest.source.stop();
      } catch {
        // A voice may have ended between the size check and eviction.
      }
      this.cleanupVoice(oldest);
    }

    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const panner = this.context.createStereoPanner();
    const playbackRate = 0.96 + this.random.next() * 0.08 + (sprinting ? 0.025 : 0);
    const gainValue = (sprinting ? 0.72 : 0.55) * (0.92 + this.random.next() * 0.16);
    const side = this.nextSide;
    const now = this.context.currentTime;

    source.buffer = buffer;
    source.playbackRate.setValueAtTime(playbackRate, now);
    gain.gain.setValueAtTime(gainValue, now);
    panner.pan.setValueAtTime(side === 'left' ? -0.12 : 0.12, now);
    source.connect(gain);
    gain.connect(panner);
    panner.connect(this.destination);

    const voice: ActiveVoice = { source, gain, panner };
    source.onended = () => this.cleanupVoice(voice);
    this.activeVoices.add(voice);

    try {
      source.start(now);
    } catch (error) {
      this.cleanupVoice(voice);
      throw error;
    }

    const playback: FootstepPlayback = {
      side,
      condition: this.condition,
      sprinting,
      variant,
      playbackRate,
      gain: gainValue,
    };
    for (const listener of this.listeners) {
      listener(playback);
    }

    this.nextSide = side === 'left' ? 'right' : 'left';
  }

  private cleanupVoice(voice: ActiveVoice): void {
    if (!this.activeVoices.delete(voice)) {
      return;
    }

    voice.source.onended = null;
    safelyDisconnect(voice.source);
    safelyDisconnect(voice.gain);
    safelyDisconnect(voice.panner);
  }
}

export function conditionFromWetness(wetness: number): WetCarpetCondition {
  const normalized = Number.isFinite(wetness) ? Math.min(1, Math.max(0, wetness)) : 0;

  if (normalized < 0.25) {
    return 'normal';
  }
  if (normalized < 0.55) {
    return 'damp';
  }
  if (normalized < 0.82) {
    return 'saturated';
  }
  return 'puddle';
}

function createWetCarpetBuffers(
  context: FootstepAudioContext,
  seed: number,
): Readonly<Record<WetCarpetCondition, readonly AudioBuffer[]>> {
  return {
    normal: createConditionBuffers(context, 'normal', seed),
    damp: createConditionBuffers(context, 'damp', seed),
    saturated: createConditionBuffers(context, 'saturated', seed),
    puddle: createConditionBuffers(context, 'puddle', seed),
  };
}

function createConditionBuffers(
  context: FootstepAudioContext,
  condition: WetCarpetCondition,
  seed: number,
): readonly AudioBuffer[] {
  return Array.from({ length: BUFFER_VARIANTS }, (_, variant) =>
    synthesizeWetCarpetBuffer(context, condition, variant, seed),
  );
}

function synthesizeWetCarpetBuffer(
  context: FootstepAudioContext,
  condition: WetCarpetCondition,
  variant: number,
  seed: number,
): AudioBuffer {
  const profile = WET_CARPET_PROFILES[condition];
  const sampleRate = Math.max(MIN_SAMPLE_RATE, Math.round(context.sampleRate));
  const duration = profile.durationSeconds * (0.94 + variant * 0.045);
  const length = Math.max(1, Math.round(sampleRate * duration));
  const buffer = context.createBuffer(1, length, sampleRate);
  const samples = buffer.getChannelData(0);
  const conditionIndex = WET_CARPET_CONDITIONS.indexOf(condition);
  const random = new SeededRandom(
    normalizeSeed(seed ^ ((conditionIndex + 1) * 0x45d9_f3b) ^ ((variant + 1) * 0x119d_e1f3)),
  );
  let lowNoise = 0;
  let peak = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const time = index / sampleRate;
    const progress = index / samples.length;
    const whiteNoise = random.next() * 2 - 1;
    lowNoise += (whiteNoise - lowNoise) * (0.08 + profile.moisture * 0.06);

    const impact =
      Math.sin(TWO_PI * (profile.impactFrequency + variant * 2.7) * time) *
      Math.exp(-time * (31 - profile.moisture * 8)) *
      0.34;
    const fibre =
      (whiteNoise * 0.68 + lowNoise * 0.32) *
      Math.exp(-time * (25 - profile.moisture * 5)) *
      profile.fibreAmount *
      0.34;
    const squish =
      lowNoise *
      Math.sin(TWO_PI * (31 + variant * 3.5 + 5 * Math.sin(time * 24)) * time) *
      Math.exp(-time * (12 - profile.moisture * 3)) *
      profile.waterAmount *
      0.48;
    const displacedWater =
      Math.sin(TWO_PI * (118 + variant * 17) * time + lowNoise * 1.4) *
      Math.exp(-Math.pow((progress - 0.38) / 0.22, 2)) *
      profile.waterAmount *
      0.12;
    const fadeIn = Math.min(1, time / 0.003);
    const fadeOut = Math.min(1, (1 - progress) / 0.12);
    const sample = (impact + fibre + squish + displacedWater) * fadeIn * fadeOut;

    samples[index] = sample;
    peak = Math.max(peak, Math.abs(sample));
  }

  if (peak > 0.82) {
    const scale = 0.82 / peak;
    for (let index = 0; index < samples.length; index += 1) {
      samples[index] = (samples[index] ?? 0) * scale;
    }
  }

  return buffer;
}

class SeededRandom {
  private state: number;

  public constructor(seed: number) {
    this.state = normalizeSeed(seed);
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

function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) {
    return DEFAULT_SEED;
  }

  const normalized = Math.trunc(seed) >>> 0;
  return normalized === 0 ? 0x9e37_79b9 : normalized;
}

function positiveOr(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;
}

function positiveIntegerOr(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value >= 1 ? Math.floor(value) : fallback;
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function safelyDisconnect(node: AudioNode): void {
  try {
    node.disconnect();
  } catch {
    // Disconnect is idempotent for our lifecycle, despite differing browser behavior.
  }
}
