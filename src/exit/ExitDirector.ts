import { exitConfig, type ExitDirectorConfig } from '../config/exit.config';
import type { SeedInput } from '../procedural/procedural.types';
import { canonicalizeSeed, deriveSeed, SeededRandom } from '../procedural/SeedBank';
import type {
  ExitCandidate,
  ExitCandidateDecision,
  ExitCandidateRejectionReason,
  ExitForceReason,
  ExitManualForceReason,
  ExitProgressInput,
  ExitReservation,
  ExitSnapshot,
} from './exit.types';

const EMPTY_REASONS: readonly ExitCandidateRejectionReason[] = Object.freeze([]);

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be finite and non-negative.`);
  }
}

function assertProgress(progress: ExitProgressInput): void {
  assertFiniteNonNegative(progress.elapsedSeconds, 'Exit elapsedSeconds');
  if (!Number.isInteger(progress.uniqueRooms) || progress.uniqueRooms < 0) {
    throw new RangeError('Exit uniqueRooms must be a non-negative integer.');
  }
}

function assertCandidate(candidate: ExitCandidate): void {
  if (candidate.roomId.trim().length === 0) {
    throw new Error('Exit candidate roomId cannot be empty.');
  }
  if (candidate.definitionId.trim().length === 0) {
    throw new Error('Exit candidate definitionId cannot be empty.');
  }
  if (candidate.surfaceId !== null && candidate.surfaceId.trim().length === 0) {
    throw new Error('Exit candidate surfaceId cannot be empty.');
  }
  if (!Number.isInteger(candidate.roomDepth) || candidate.roomDepth < 0) {
    throw new RangeError('Exit candidate roomDepth must be a non-negative integer.');
  }
  assertFiniteNonNegative(candidate.surfaceWidthMeters, 'Exit surface width');
  assertFiniteNonNegative(candidate.surfaceHeightMeters, 'Exit surface height');
  assertFiniteNonNegative(candidate.revealDistanceMeters, 'Exit reveal distance');
  assertFiniteNonNegative(candidate.approachDepthMeters, 'Exit approach depth');
}

function assertConfig(config: ExitDirectorConfig): void {
  const values = [
    config.eligibility.minimumElapsedSeconds,
    config.eligibility.minimumUniqueRooms,
    config.probability.initialChance,
    config.probability.chancePerMinuteAfterEligibility,
    config.probability.uniqueRoomsPerStep,
    config.probability.chancePerRoomStep,
    config.probability.maximumChancePerCandidate,
    config.guarantee.forceElapsedSeconds,
    config.guarantee.forceUniqueRooms,
    config.guarantee.lateRejectionsStartSeconds,
    config.guarantee.maximumLateRejections,
    config.candidate.minimumSurfaceWidthMeters,
    config.candidate.minimumSurfaceHeightMeters,
    config.candidate.minimumApproachDepthMeters,
    config.candidate.maximumRevealDistanceMeters,
    config.candidate.minimumRoomDepthFromSpawn,
  ];
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new RangeError('ExitDirector configuration values must be finite and non-negative.');
  }
  if (
    !Number.isInteger(config.eligibility.minimumUniqueRooms) ||
    !Number.isInteger(config.probability.uniqueRoomsPerStep) ||
    config.probability.uniqueRoomsPerStep < 1 ||
    !Number.isInteger(config.guarantee.forceUniqueRooms) ||
    !Number.isInteger(config.guarantee.maximumLateRejections) ||
    config.guarantee.maximumLateRejections < 1 ||
    !Number.isInteger(config.candidate.minimumRoomDepthFromSpawn)
  ) {
    throw new RangeError('ExitDirector room and rejection limits must be valid integers.');
  }
  if (
    config.probability.initialChance > 1 ||
    config.probability.maximumChancePerCandidate > 1 ||
    config.probability.initialChance > config.probability.maximumChancePerCandidate
  ) {
    throw new RangeError('ExitDirector probabilities must be ordered within [0, 1].');
  }
  if (
    config.guarantee.forceElapsedSeconds < config.eligibility.minimumElapsedSeconds ||
    config.guarantee.forceUniqueRooms < config.eligibility.minimumUniqueRooms ||
    config.guarantee.lateRejectionsStartSeconds < config.eligibility.minimumElapsedSeconds
  ) {
    throw new RangeError('ExitDirector guarantees cannot precede standard eligibility.');
  }
}

export function isExitEligible(
  progress: ExitProgressInput,
  config: ExitDirectorConfig = exitConfig,
): boolean {
  assertProgress(progress);
  return (
    progress.elapsedSeconds >= config.eligibility.minimumElapsedSeconds &&
    progress.uniqueRooms >= config.eligibility.minimumUniqueRooms
  );
}

export function calculateExitProbability(
  progress: ExitProgressInput,
  config: ExitDirectorConfig = exitConfig,
): number {
  assertProgress(progress);
  if (!isExitEligible(progress, config)) return 0;

  const elapsedMinutesAfterEligibility = Math.max(
    0,
    (progress.elapsedSeconds - config.eligibility.minimumElapsedSeconds) / 60,
  );
  const explorationSteps = Math.max(
    0,
    Math.floor(
      (progress.uniqueRooms - config.eligibility.minimumUniqueRooms) /
        config.probability.uniqueRoomsPerStep,
    ),
  );
  return clamp(
    config.probability.initialChance +
      elapsedMinutesAfterEligibility * config.probability.chancePerMinuteAfterEligibility +
      explorationSteps * config.probability.chancePerRoomStep,
    config.probability.initialChance,
    config.probability.maximumChancePerCandidate,
  );
}

export function getExitCandidateRejectionReasons(
  candidate: ExitCandidate,
  config: ExitDirectorConfig = exitConfig,
): readonly ExitCandidateRejectionReason[] {
  assertCandidate(candidate);
  const reasons: ExitCandidateRejectionReason[] = [];
  if (candidate.surfaceId === null) reasons.push('no-compatible-surface');
  if (
    candidate.surfaceWidthMeters < config.candidate.minimumSurfaceWidthMeters ||
    candidate.surfaceHeightMeters < config.candidate.minimumSurfaceHeightMeters
  ) {
    reasons.push('surface-too-small');
  }
  if (!candidate.visibleFromApproach) reasons.push('not-visible-from-approach');
  if (candidate.revealDistanceMeters > config.candidate.maximumRevealDistanceMeters) {
    reasons.push('reveal-distance-out-of-range');
  }
  if (candidate.approachDepthMeters < config.candidate.minimumApproachDepthMeters) {
    reasons.push('insufficient-approach-space');
  }
  if (!candidate.approachPathClear) reasons.push('approach-path-blocked');
  if (candidate.roomTags.includes('blackout')) reasons.push('blackout-zone');
  if (candidate.roomDepth < config.candidate.minimumRoomDepthFromSpawn) {
    reasons.push('adjacent-to-spawn');
  }
  if (!candidate.reachable) reasons.push('unreachable');
  if (candidate.visuallyExhausted) reasons.push('visually-exhausted');
  if (candidate.roomTags.includes('dangerous')) reasons.push('dangerous-module');
  if (!candidate.navigable) reasons.push('not-navigable');
  if (candidate.behindPlayer) reasons.push('behind-player');
  return Object.freeze(reasons);
}

/**
 * Pure, deterministic exit scheduler. It only consumes RNG for a new, valid,
 * eligible room candidate, never during per-frame progress updates.
 */
export class ExitDirector {
  private readonly seed: string;
  private readonly config: ExitDirectorConfig;
  private rng: SeededRandom;
  private readonly consideredRoomIds = new Set<string>();
  private lastElapsedSeconds = 0;
  private lastUniqueRooms = 0;
  private validCandidateCount = 0;
  private invalidCandidateCount = 0;
  private probabilisticRejectionCount = 0;
  private lateRejectionCount = 0;
  private forceReason: ExitForceReason | null = null;
  private reservation: ExitReservation | null = null;
  private revision = 0;
  private disposed = false;
  private snapshot: ExitSnapshot;

  public constructor(seed: SeedInput, config: ExitDirectorConfig = exitConfig) {
    assertConfig(config);
    this.seed = canonicalizeSeed(seed);
    this.config = config;
    this.rng = this.createRng();
    this.snapshot = this.createSnapshot({ elapsedSeconds: 0, uniqueRooms: 0 });
  }

  public get current(): ExitSnapshot {
    return this.snapshot;
  }

  public update(progress: ExitProgressInput): ExitSnapshot {
    this.assertActive();
    assertProgress(progress);
    if (progress.elapsedSeconds < this.lastElapsedSeconds) {
      throw new RangeError('Exit time cannot move backwards without reset.');
    }
    if (progress.uniqueRooms < this.lastUniqueRooms) {
      throw new RangeError('Exit uniqueRooms cannot decrease without reset.');
    }

    this.lastElapsedSeconds = progress.elapsedSeconds;
    this.lastUniqueRooms = progress.uniqueRooms;
    this.armGuarantee(progress);
    this.snapshot = this.createSnapshot(progress);
    return this.snapshot;
  }

  public considerCandidate(
    progress: ExitProgressInput,
    candidate: ExitCandidate,
  ): ExitCandidateDecision {
    this.update(progress);
    assertCandidate(candidate);
    const candidateId = this.candidateId(candidate);

    if (this.reservation !== null) {
      return this.createDecision('already-spawned', candidateId, null, EMPTY_REASONS);
    }
    if (this.consideredRoomIds.has(candidate.roomId)) {
      return this.createDecision('duplicate', candidateId, null, EMPTY_REASONS);
    }

    this.consideredRoomIds.add(candidate.roomId);
    this.revision += 1;
    if (!this.current.eligible && this.forceReason === null) {
      this.snapshot = this.createSnapshot(progress);
      return this.createDecision('ineligible', candidateId, null, EMPTY_REASONS);
    }

    const rejectionReasons = getExitCandidateRejectionReasons(candidate, this.config);
    if (rejectionReasons.length > 0) {
      this.invalidCandidateCount += 1;
      this.revision += 1;
      this.snapshot = this.createSnapshot(progress);
      return this.createDecision('invalid', candidateId, null, rejectionReasons);
    }

    this.validCandidateCount += 1;
    this.revision += 1;
    if (this.forceReason !== null) {
      this.reserve(candidate, progress, null);
      return this.createDecision('reserved', candidateId, null, EMPTY_REASONS);
    }

    const roll = this.rng.next();
    if (roll < this.current.probability) {
      this.reserve(candidate, progress, roll);
      return this.createDecision('reserved', candidateId, roll, EMPTY_REASONS);
    }

    this.probabilisticRejectionCount += 1;
    if (progress.elapsedSeconds >= this.config.guarantee.lateRejectionsStartSeconds) {
      this.lateRejectionCount += 1;
    }
    this.revision += 1;
    this.armGuarantee(progress);
    this.snapshot = this.createSnapshot(progress);
    return this.createDecision('rejected', candidateId, roll, EMPTY_REASONS);
  }

  public forceNextCandidate(reason: ExitManualForceReason = 'debug'): ExitSnapshot {
    this.assertActive();
    this.armForce(reason);
    this.snapshot = this.createSnapshot({
      elapsedSeconds: this.lastElapsedSeconds,
      uniqueRooms: this.lastUniqueRooms,
    });
    return this.snapshot;
  }

  public reset(): void {
    this.assertActive();
    this.rng = this.createRng();
    this.consideredRoomIds.clear();
    this.lastElapsedSeconds = 0;
    this.lastUniqueRooms = 0;
    this.validCandidateCount = 0;
    this.invalidCandidateCount = 0;
    this.probabilisticRejectionCount = 0;
    this.lateRejectionCount = 0;
    this.forceReason = null;
    this.reservation = null;
    this.revision += 1;
    this.snapshot = this.createSnapshot({ elapsedSeconds: 0, uniqueRooms: 0 });
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.consideredRoomIds.clear();
    this.reservation = null;
  }

  private createRng(): SeededRandom {
    return new SeededRandom(deriveSeed(this.seed, 'exit', 'director'));
  }

  private armGuarantee(progress: ExitProgressInput): void {
    if (this.forceReason !== null || this.reservation !== null) return;
    if (progress.shortMode === true) {
      this.armForce('short-mode');
    } else if (progress.elapsedSeconds >= this.config.guarantee.forceElapsedSeconds) {
      this.armForce('elapsed-limit');
    } else if (progress.uniqueRooms >= this.config.guarantee.forceUniqueRooms) {
      this.armForce('room-limit');
    } else if (this.lateRejectionCount >= this.config.guarantee.maximumLateRejections) {
      this.armForce('late-rejections');
    }
  }

  private armForce(reason: ExitForceReason): void {
    if (this.forceReason !== null || this.reservation !== null) return;
    this.forceReason = reason;
    this.revision += 1;
  }

  private reserve(
    candidate: ExitCandidate,
    progress: ExitProgressInput,
    roll: number | null,
  ): void {
    const surfaceId = candidate.surfaceId;
    if (surfaceId === null) {
      throw new Error('Cannot reserve an exit candidate without a compatible surface.');
    }
    const candidateId = this.candidateId(candidate);
    this.reservation = Object.freeze({
      id: `exit:${candidateId}`,
      candidateId,
      roomId: candidate.roomId,
      definitionId: candidate.definitionId,
      surfaceId,
      seed: deriveSeed(this.seed, 'exit', 'wall', candidate.roomId, surfaceId),
      spawnedAtSeconds: progress.elapsedSeconds,
      spawnedAtUniqueRooms: progress.uniqueRooms,
      probability: this.current.probability,
      roll,
      forced: this.forceReason !== null,
      forceReason: this.forceReason,
      protectFromStreaming: true,
      protectFromLayoutShift: true,
    });
    this.revision += 1;
    this.snapshot = this.createSnapshot(progress);
  }

  private candidateId(candidate: ExitCandidate): string {
    return `${candidate.roomId}/${candidate.surfaceId ?? 'no-surface'}`;
  }

  private createSnapshot(progress: ExitProgressInput): ExitSnapshot {
    return Object.freeze({
      elapsedSeconds: progress.elapsedSeconds,
      uniqueRooms: progress.uniqueRooms,
      eligible: isExitEligible(progress, this.config),
      probability: calculateExitProbability(progress, this.config),
      forcedPending: this.forceReason !== null && this.reservation === null,
      forceReason: this.forceReason,
      exitSpawned: this.reservation !== null,
      reservation: this.reservation,
      consideredRoomCount: this.consideredRoomIds.size,
      validCandidateCount: this.validCandidateCount,
      invalidCandidateCount: this.invalidCandidateCount,
      probabilisticRejectionCount: this.probabilisticRejectionCount,
      lateRejectionCount: this.lateRejectionCount,
      revision: this.revision,
    });
  }

  private createDecision(
    status: ExitCandidateDecision['status'],
    candidateId: string,
    roll: number | null,
    rejectionReasons: readonly ExitCandidateRejectionReason[],
  ): ExitCandidateDecision {
    return Object.freeze({
      status,
      candidateId,
      probability: this.snapshot.probability,
      roll,
      rejectionReasons,
      reservation: this.reservation,
      snapshot: this.snapshot,
    });
  }

  private assertActive(): void {
    if (this.disposed) throw new Error('ExitDirector has been disposed.');
  }
}
