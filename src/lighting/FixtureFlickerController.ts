import { fixtureFlickerCurves, lightingConfig } from '../config/lighting.config';
import { deriveSeed } from '../procedural/SeedBank';
import {
  FIXTURE_FLICKER_PROFILES,
  type FixtureFlickerControllerOptions,
  type FixtureFlickerDescriptor,
  type FixtureFlickerMetrics,
  type FixtureFlickerOverride,
  type FixtureFlickerOverrideScope,
  type FixtureFlickerProfile,
  type FixtureFlickerSample,
  type FixtureFlickerSeed,
  type FixtureFlickerSyncResult,
} from './lighting.types';

const UINT32_RANGE = 0x1_0000_0000;
const TAU = Math.PI * 2;
const PROFILE_SET = new Set<FixtureFlickerProfile>(FIXTURE_FLICKER_PROFILES);

interface FailureSample {
  readonly active: boolean;
  readonly eventSequence: number | null;
  readonly visualFactor: number;
  readonly audioFactor: number;
}

interface CurveSample {
  readonly visualIntensity: number;
  readonly audioIntensity: number;
  readonly failureActive: boolean;
  readonly eventSequence: number | null;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function smoothStep(value: number): number {
  const clamped = clamp01(value);
  return clamped * clamped * (3 - 2 * clamped);
}

function assertNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${label} cannot be empty.`);
  }
  return normalized;
}

function assertProfile(value: unknown): asserts value is FixtureFlickerProfile {
  if (!PROFILE_SET.has(value as FixtureFlickerProfile)) {
    throw new Error(`Unknown fixture flicker profile: ${String(value)}.`);
  }
}

function normalizeSeed(seed: FixtureFlickerSeed): FixtureFlickerSeed {
  if (typeof seed === 'number') {
    if (!Number.isFinite(seed)) {
      throw new Error('Fixture flicker seed must be finite.');
    }
    return seed;
  }
  return assertNonEmpty(seed, 'Fixture flicker seed');
}

function normalizeDescriptor(
  descriptor: FixtureFlickerDescriptor,
): Readonly<FixtureFlickerDescriptor> {
  assertProfile(descriptor.profile);
  if (typeof descriptor.enabled !== 'boolean') {
    throw new TypeError('Fixture flicker enabled must be a boolean.');
  }
  return Object.freeze({
    id: assertNonEmpty(descriptor.id, 'Fixture id'),
    roomId: assertNonEmpty(descriptor.roomId, 'Fixture room id'),
    profile: descriptor.profile,
    enabled: descriptor.enabled,
    seed: normalizeSeed(descriptor.seed),
  });
}

function assertScale(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${label} must be a finite number between 0 and 1.`);
  }
}

function normalizeOverride(override: FixtureFlickerOverride): Readonly<FixtureFlickerOverride> {
  if (override.profile !== undefined) {
    assertProfile(override.profile);
  }
  if (override.enabled !== undefined && typeof override.enabled !== 'boolean') {
    throw new TypeError('Fixture flicker override enabled must be a boolean.');
  }
  if (override.visualScale !== undefined) {
    assertScale(override.visualScale, 'Fixture flicker visualScale');
  }
  if (override.audioScale !== undefined) {
    assertScale(override.audioScale, 'Fixture flicker audioScale');
  }
  if (
    override.profile === undefined &&
    override.enabled === undefined &&
    override.visualScale === undefined &&
    override.audioScale === undefined
  ) {
    throw new Error('Fixture flicker override must define at least one field.');
  }

  return Object.freeze({
    ...(override.profile === undefined ? {} : { profile: override.profile }),
    ...(override.enabled === undefined ? {} : { enabled: override.enabled }),
    ...(override.visualScale === undefined ? {} : { visualScale: override.visualScale }),
    ...(override.audioScale === undefined ? {} : { audioScale: override.audioScale }),
  });
}

function descriptorsEqual(
  left: Readonly<FixtureFlickerDescriptor>,
  right: Readonly<FixtureFlickerDescriptor>,
): boolean {
  return (
    left.id === right.id &&
    left.roomId === right.roomId &&
    left.profile === right.profile &&
    left.enabled === right.enabled &&
    left.seed === right.seed
  );
}

function overridesEqual(
  left: Readonly<FixtureFlickerOverride> | undefined,
  right: Readonly<FixtureFlickerOverride>,
): boolean {
  return (
    left !== undefined &&
    left.profile === right.profile &&
    left.enabled === right.enabled &&
    left.visualScale === right.visualScale &&
    left.audioScale === right.audioScale
  );
}

function assertAbsoluteTime(absoluteTimeSeconds: number): void {
  if (!Number.isFinite(absoluteTimeSeconds) || absoluteTimeSeconds < 0) {
    throw new RangeError('absoluteTimeSeconds must be a finite non-negative number.');
  }
}

/**
 * Deterministic, render-agnostic fixture state. It never integrates deltas:
 * every sample is reconstructed from absolute time and stable hashes.
 */
export class FixtureFlickerController {
  private descriptors = new Map<string, Readonly<FixtureFlickerDescriptor>>();
  private readonly roomOverrides = new Map<string, Readonly<FixtureFlickerOverride>>();
  private readonly fixtureOverrides = new Map<string, Readonly<FixtureFlickerOverride>>();
  private reducedFlashingValue: boolean;
  private sampleCountValue = 0;
  private lastAbsoluteTimeSecondsValue: number | null = null;
  private lastEvaluationFixtureCountValue = 0;
  private revisionValue = 0;
  private disposedValue = false;

  public constructor(options: FixtureFlickerControllerOptions = {}) {
    this.reducedFlashingValue = options.reducedFlashing ?? false;
  }

  public get reducedFlashing(): boolean {
    return this.reducedFlashingValue;
  }

  public get metrics(): Readonly<FixtureFlickerMetrics> {
    const roomIds = new Set<string>();
    let enabledFixtureCount = 0;
    for (const descriptor of this.descriptors.values()) {
      roomIds.add(descriptor.roomId);
      if (descriptor.enabled) {
        enabledFixtureCount += 1;
      }
    }
    return Object.freeze({
      fixtureCount: this.descriptors.size,
      enabledFixtureCount,
      roomCount: roomIds.size,
      fixtureOverrideCount: this.fixtureOverrides.size,
      roomOverrideCount: this.roomOverrides.size,
      sampleCount: this.sampleCountValue,
      lastAbsoluteTimeSeconds: this.lastAbsoluteTimeSecondsValue,
      lastEvaluationFixtureCount: this.lastEvaluationFixtureCountValue,
      revision: this.revisionValue,
      reducedFlashing: this.reducedFlashingValue,
      disposed: this.disposedValue,
    });
  }

  public register(descriptor: FixtureFlickerDescriptor): Readonly<FixtureFlickerDescriptor> {
    this.assertActive();
    const normalized = normalizeDescriptor(descriptor);
    if (this.descriptors.has(normalized.id)) {
      throw new Error(`Fixture flicker descriptor already registered: ${normalized.id}.`);
    }
    this.descriptors.set(normalized.id, normalized);
    this.revisionValue += 1;
    return normalized;
  }

  public unregister(id: string): boolean {
    this.assertActive();
    const normalizedId = assertNonEmpty(id, 'Fixture id');
    const descriptor = this.descriptors.get(normalizedId);
    if (descriptor === undefined) {
      return false;
    }
    this.descriptors.delete(normalizedId);
    this.fixtureOverrides.delete(normalizedId);
    if (
      ![...this.descriptors.values()].some((candidate) => candidate.roomId === descriptor.roomId)
    ) {
      this.roomOverrides.delete(descriptor.roomId);
    }
    this.revisionValue += 1;
    return true;
  }

  public getDescriptor(id: string): Readonly<FixtureFlickerDescriptor> | null {
    this.assertActive();
    return this.descriptors.get(assertNonEmpty(id, 'Fixture id')) ?? null;
  }

  public syncDescriptors(
    descriptors: Iterable<FixtureFlickerDescriptor>,
  ): FixtureFlickerSyncResult {
    this.assertActive();
    const next = new Map<string, Readonly<FixtureFlickerDescriptor>>();
    for (const descriptor of descriptors) {
      const normalized = normalizeDescriptor(descriptor);
      if (next.has(normalized.id)) {
        throw new Error(`Duplicate fixture flicker descriptor: ${normalized.id}.`);
      }
      next.set(normalized.id, normalized);
    }

    let added = 0;
    let updated = 0;
    let unchanged = 0;
    for (const [id, descriptor] of next) {
      const previous = this.descriptors.get(id);
      if (previous === undefined) {
        added += 1;
      } else if (descriptorsEqual(previous, descriptor)) {
        unchanged += 1;
        next.set(id, previous);
      } else {
        updated += 1;
      }
    }
    let removed = 0;
    for (const id of this.descriptors.keys()) {
      if (!next.has(id)) {
        removed += 1;
      }
    }

    const roomIds = new Set([...next.values()].map((descriptor) => descriptor.roomId));
    let prunedOverrides = 0;
    for (const id of this.fixtureOverrides.keys()) {
      if (!next.has(id)) {
        this.fixtureOverrides.delete(id);
        prunedOverrides += 1;
      }
    }
    for (const roomId of this.roomOverrides.keys()) {
      if (!roomIds.has(roomId)) {
        this.roomOverrides.delete(roomId);
        prunedOverrides += 1;
      }
    }

    if (added > 0 || updated > 0 || removed > 0 || prunedOverrides > 0) {
      this.descriptors = next;
      this.revisionValue += 1;
    }

    return Object.freeze({ added, updated, removed, unchanged, total: next.size });
  }

  public setReducedFlashing(reducedFlashing: boolean): void {
    this.assertActive();
    if (typeof reducedFlashing !== 'boolean') {
      throw new TypeError('reducedFlashing must be a boolean.');
    }
    if (this.reducedFlashingValue !== reducedFlashing) {
      this.reducedFlashingValue = reducedFlashing;
      this.revisionValue += 1;
    }
  }

  public setRoomOverride(roomId: string, override: FixtureFlickerOverride | null): boolean {
    this.assertActive();
    const normalizedRoomId = assertNonEmpty(roomId, 'Fixture room id');
    if (
      ![...this.descriptors.values()].some((descriptor) => descriptor.roomId === normalizedRoomId)
    ) {
      throw new Error(`Cannot override unknown fixture room: ${normalizedRoomId}.`);
    }
    return this.setOverride(this.roomOverrides, normalizedRoomId, override);
  }

  public setFixtureOverride(id: string, override: FixtureFlickerOverride | null): boolean {
    this.assertActive();
    const normalizedId = assertNonEmpty(id, 'Fixture id');
    if (!this.descriptors.has(normalizedId)) {
      throw new Error(`Cannot override unknown fixture: ${normalizedId}.`);
    }
    return this.setOverride(this.fixtureOverrides, normalizedId, override);
  }

  public evaluate(id: string, absoluteTimeSeconds: number): FixtureFlickerSample {
    this.assertActive();
    assertAbsoluteTime(absoluteTimeSeconds);
    const descriptor = this.descriptors.get(assertNonEmpty(id, 'Fixture id'));
    if (descriptor === undefined) {
      throw new Error(`Unknown fixture flicker descriptor: ${id}.`);
    }
    const sample = this.evaluateDescriptor(descriptor, absoluteTimeSeconds);
    this.recordEvaluation(absoluteTimeSeconds, 1);
    return sample;
  }

  public evaluateAll(absoluteTimeSeconds: number): readonly FixtureFlickerSample[] {
    this.assertActive();
    assertAbsoluteTime(absoluteTimeSeconds);
    const samples = [...this.descriptors.values()]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((descriptor) => this.evaluateDescriptor(descriptor, absoluteTimeSeconds));
    this.recordEvaluation(absoluteTimeSeconds, samples.length);
    return Object.freeze(samples);
  }

  /** Clears transient overrides and counters while preserving synchronized fixtures. */
  public reset(): void {
    if (this.disposedValue) {
      return;
    }
    const changed =
      this.roomOverrides.size > 0 ||
      this.fixtureOverrides.size > 0 ||
      this.sampleCountValue !== 0 ||
      this.lastAbsoluteTimeSecondsValue !== null ||
      this.lastEvaluationFixtureCountValue !== 0;
    this.roomOverrides.clear();
    this.fixtureOverrides.clear();
    this.sampleCountValue = 0;
    this.lastAbsoluteTimeSecondsValue = null;
    this.lastEvaluationFixtureCountValue = 0;
    if (changed) {
      this.revisionValue += 1;
    }
  }

  public dispose(): void {
    if (this.disposedValue) {
      return;
    }
    this.descriptors.clear();
    this.roomOverrides.clear();
    this.fixtureOverrides.clear();
    this.sampleCountValue = 0;
    this.lastAbsoluteTimeSecondsValue = null;
    this.lastEvaluationFixtureCountValue = 0;
    this.disposedValue = true;
    this.revisionValue += 1;
  }

  private setOverride(
    target: Map<string, Readonly<FixtureFlickerOverride>>,
    key: string,
    override: FixtureFlickerOverride | null,
  ): boolean {
    if (override === null) {
      const deleted = target.delete(key);
      if (deleted) {
        this.revisionValue += 1;
      }
      return deleted;
    }
    const normalized = normalizeOverride(override);
    if (overridesEqual(target.get(key), normalized)) {
      return false;
    }
    target.set(key, normalized);
    this.revisionValue += 1;
    return true;
  }

  private evaluateDescriptor(
    descriptor: Readonly<FixtureFlickerDescriptor>,
    absoluteTimeSeconds: number,
  ): FixtureFlickerSample {
    const roomOverride = this.roomOverrides.get(descriptor.roomId);
    const fixtureOverride = this.fixtureOverrides.get(descriptor.id);
    const effectiveProfile =
      fixtureOverride?.profile ?? roomOverride?.profile ?? descriptor.profile;
    const enabled = fixtureOverride?.enabled ?? roomOverride?.enabled ?? descriptor.enabled;
    const visualScale = (roomOverride?.visualScale ?? 1) * (fixtureOverride?.visualScale ?? 1);
    const audioScale = (roomOverride?.audioScale ?? 1) * (fixtureOverride?.audioScale ?? 1);
    const overrideScope = this.getOverrideScope(roomOverride, fixtureOverride);

    if (!enabled || effectiveProfile === 'off') {
      return Object.freeze({
        id: descriptor.id,
        roomId: descriptor.roomId,
        sourceProfile: descriptor.profile,
        effectiveProfile,
        enabled,
        visualIntensity: 0,
        audioIntensity: 0,
        failureActive: false,
        eventId: null,
        reducedFlashingApplied: false,
        overrideScope,
      });
    }

    const curveSample = this.evaluateCurve(descriptor, effectiveProfile, absoluteTimeSeconds);
    const curve = fixtureFlickerCurves[effectiveProfile];
    const reducedFlashingApplied = this.reducedFlashingValue && effectiveProfile !== 'stable';
    const visualIntensity = reducedFlashingApplied
      ? Math.max(
          curve.reducedVisualFloor,
          1 - (1 - curveSample.visualIntensity) * curve.reducedVisualDepthScale,
        )
      : curveSample.visualIntensity;
    const audioIntensity = reducedFlashingApplied
      ? Math.max(
          curve.reducedAudioFloor,
          1 - (1 - curveSample.audioIntensity) * curve.reducedAudioDepthScale,
        )
      : curveSample.audioIntensity;

    return Object.freeze({
      id: descriptor.id,
      roomId: descriptor.roomId,
      sourceProfile: descriptor.profile,
      effectiveProfile,
      enabled,
      visualIntensity: clamp01(visualIntensity * visualScale),
      audioIntensity: clamp01(audioIntensity * audioScale),
      failureActive: curveSample.failureActive,
      eventId:
        curveSample.failureActive && curveSample.eventSequence !== null
          ? `${descriptor.id}:${effectiveProfile}:${String(curveSample.eventSequence)}`
          : null,
      reducedFlashingApplied,
      overrideScope,
    });
  }

  private evaluateCurve(
    descriptor: Readonly<FixtureFlickerDescriptor>,
    profile: FixtureFlickerProfile,
    absoluteTimeSeconds: number,
  ): CurveSample {
    const curve = fixtureFlickerCurves[profile];
    const primaryFrequency =
      curve.primaryFrequencyHz *
      (1 +
        (this.hashUnit(descriptor, profile, 'primary-frequency') * 2 - 1) * curve.frequencyJitter);
    const secondaryFrequency =
      curve.secondaryFrequencyHz *
      (1 +
        (this.hashUnit(descriptor, profile, 'secondary-frequency') * 2 - 1) *
          curve.frequencyJitter);
    const primary =
      0.5 +
      Math.sin(
        absoluteTimeSeconds * primaryFrequency * TAU +
          this.hashUnit(descriptor, profile, 'primary-phase') * TAU,
      ) *
        0.5;
    const secondary =
      0.5 +
      Math.sin(
        absoluteTimeSeconds * secondaryFrequency * TAU +
          this.hashUnit(descriptor, profile, 'secondary-phase') * TAU,
      ) *
        0.5;
    const carrier = lerp(primary, secondary, curve.secondaryMix);
    let visualIntensity = lerp(curve.visualMin, curve.visualMax, carrier);
    let audioIntensity = lerp(curve.audioMin, curve.audioMax, smoothStep(carrier));
    let failureActive = false;
    let eventSequence: number | null = null;

    if (curve.failure !== null) {
      const failure = this.evaluateFailure(descriptor, profile, absoluteTimeSeconds);
      visualIntensity *= failure.visualFactor;
      audioIntensity *= failure.audioFactor;
      failureActive = failure.active;
      eventSequence = failure.eventSequence;
    }

    return {
      visualIntensity: clamp01(visualIntensity),
      audioIntensity: clamp01(audioIntensity),
      failureActive,
      eventSequence,
    };
  }

  private evaluateFailure(
    descriptor: Readonly<FixtureFlickerDescriptor>,
    profile: FixtureFlickerProfile,
    absoluteTimeSeconds: number,
  ): FailureSample {
    const failure = fixtureFlickerCurves[profile].failure;
    if (failure === null) {
      return { active: false, eventSequence: null, visualFactor: 1, audioFactor: 1 };
    }
    const cycleIndex = Math.floor(absoluteTimeSeconds / failure.cycleSeconds);
    if (this.hashUnit(descriptor, profile, 'failure-event', cycleIndex) >= failure.eventChance) {
      return { active: false, eventSequence: null, visualFactor: 1, audioFactor: 1 };
    }

    const holdSeconds = lerp(
      failure.holdSecondsMin,
      failure.holdSecondsMax,
      this.hashUnit(descriptor, profile, 'failure-hold', cycleIndex),
    );
    const eventSeconds = failure.attackSeconds + holdSeconds + failure.releaseSeconds;
    const marginSeconds = 0.16;
    const availableStart = Math.max(0, failure.cycleSeconds - eventSeconds - marginSeconds * 2);
    const eventStart =
      cycleIndex * failure.cycleSeconds +
      marginSeconds +
      this.hashUnit(descriptor, profile, 'failure-start', cycleIndex) * availableStart;
    const localTime = absoluteTimeSeconds - eventStart;
    if (localTime < 0 || localTime > eventSeconds) {
      return { active: false, eventSequence: null, visualFactor: 1, audioFactor: 1 };
    }

    let envelope: number;
    if (localTime < failure.attackSeconds) {
      envelope = smoothStep(localTime / failure.attackSeconds);
    } else if (localTime < failure.attackSeconds + holdSeconds) {
      envelope = 1;
    } else {
      envelope =
        1 - smoothStep((localTime - failure.attackSeconds - holdSeconds) / failure.releaseSeconds);
    }
    const visualTarget = lerp(
      failure.visualTargetMin,
      failure.visualTargetMax,
      this.hashUnit(descriptor, profile, 'failure-visual-target', cycleIndex),
    );
    const audioTarget = lerp(
      failure.audioTargetMin,
      failure.audioTargetMax,
      this.hashUnit(descriptor, profile, 'failure-audio-target', cycleIndex),
    );
    return {
      active: envelope > 0,
      eventSequence: envelope > 0 ? cycleIndex : null,
      visualFactor: lerp(1, visualTarget, envelope),
      audioFactor: lerp(1, audioTarget, envelope),
    };
  }

  private hashUnit(
    descriptor: Readonly<FixtureFlickerDescriptor>,
    profile: FixtureFlickerProfile,
    channel: string,
    index = 0,
  ): number {
    return (
      deriveSeed(
        descriptor.seed,
        lightingConfig.flickerHashNamespace,
        descriptor.roomId,
        descriptor.id,
        profile,
        channel,
        index,
      ) / UINT32_RANGE
    );
  }

  private getOverrideScope(
    roomOverride: Readonly<FixtureFlickerOverride> | undefined,
    fixtureOverride: Readonly<FixtureFlickerOverride> | undefined,
  ): FixtureFlickerOverrideScope {
    if (roomOverride !== undefined && fixtureOverride !== undefined) {
      return 'room-and-fixture';
    }
    if (fixtureOverride !== undefined) {
      return 'fixture';
    }
    return roomOverride === undefined ? 'none' : 'room';
  }

  private recordEvaluation(absoluteTimeSeconds: number, fixtureCount: number): void {
    this.sampleCountValue += fixtureCount;
    this.lastAbsoluteTimeSecondsValue = absoluteTimeSeconds;
    this.lastEvaluationFixtureCountValue = fixtureCount;
  }

  private assertActive(): void {
    if (this.disposedValue) {
      throw new Error('FixtureFlickerController has been disposed.');
    }
  }
}
