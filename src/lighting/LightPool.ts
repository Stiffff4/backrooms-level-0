import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';

export const LIGHT_POOL_CAPACITY = 8;
export const LIGHT_POOL_MIN_BUDGET = 4;
export const LIGHT_POOL_DEFAULT_BUDGET = 6;
export const LIGHT_POOL_MAX_BUDGET = LIGHT_POOL_CAPACITY;
export const LIGHT_POOL_RANGE = 12;
export const LIGHT_POOL_MIN_INTENSITY = 0;
export const LIGHT_POOL_MAX_INTENSITY = 1.25;
const REASSIGNMENT_START_SCALE = 0.72;
const RETAINED_INTENSITY_RESPONSE = 0.42;
const REASSIGNED_INTENSITY_RESPONSE = 0.58;

const PROXY_DIFFUSE = Object.freeze({ r: 0.98, g: 0.96, b: 0.78 });
const PROXY_SPECULAR = Object.freeze({ r: 0.18, g: 0.18, b: 0.13 });

/**
 * Integration boundary between streamed fixtures and the bounded Babylon light
 * pool. Candidate ids must be stable for as long as their fixture is loaded.
 */
export interface LightPoolCandidate {
  readonly id: string;
  readonly position: Vector3;
  readonly enabled: boolean;
  readonly visible: boolean;
  readonly important: boolean;
  readonly flickering: boolean;
  readonly exitRelated: boolean;
  readonly intensity: number;
}

export interface LightPoolOptions {
  readonly activeBudget?: number;
}

export interface LightPoolAssignment {
  readonly slotIndex: number;
  readonly candidateId: string;
  readonly light: PointLight;
  readonly priority: number;
  readonly distanceSquared: number;
}

export interface LightPoolMetrics {
  readonly capacity: number;
  readonly pooledLightCount: number;
  readonly activeBudget: number;
  readonly inputCandidateCount: number;
  readonly eligibleCandidateCount: number;
  readonly activeLightCount: number;
  readonly updateCount: number;
  readonly reassignments: number;
  readonly lastUpdateReassignments: number;
  readonly disposed: boolean;
}

interface RankedCandidate {
  readonly candidate: LightPoolCandidate;
  readonly priority: number;
  readonly distanceSquared: number;
}

interface LightPoolSlot {
  readonly light: PointLight;
  candidateId: string | null;
  priority: number;
  distanceSquared: number;
  displayedIntensity: number;
}

interface RankedCandidates {
  readonly candidates: readonly RankedCandidate[];
  readonly eligibleCount: number;
}

const EMPTY_ASSIGNMENTS: readonly LightPoolAssignment[] = Object.freeze([]);
const EMPTY_CANDIDATES: readonly LightPoolCandidate[] = Object.freeze([]);

function assertBudget(activeBudget: number): void {
  if (
    !Number.isInteger(activeBudget) ||
    activeBudget < LIGHT_POOL_MIN_BUDGET ||
    activeBudget > LIGHT_POOL_MAX_BUDGET
  ) {
    throw new RangeError(
      `LightPool active budget must be an integer from ${LIGHT_POOL_MIN_BUDGET} to ${LIGHT_POOL_MAX_BUDGET}.`,
    );
  }
}

function isFinitePosition(position: Vector3): boolean {
  return Number.isFinite(position.x) && Number.isFinite(position.y) && Number.isFinite(position.z);
}

function clampIntensity(intensity: number): number {
  if (Number.isNaN(intensity)) {
    return LIGHT_POOL_MIN_INTENSITY;
  }

  return Math.min(LIGHT_POOL_MAX_INTENSITY, Math.max(LIGHT_POOL_MIN_INTENSITY, intensity));
}

function candidatePriority(candidate: LightPoolCandidate): number {
  return (
    (candidate.exitRelated ? 8 : 0) +
    (candidate.important ? 4 : 0) +
    (candidate.flickering ? 2 : 0) +
    (candidate.visible ? 1 : 0)
  );
}

function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function compareRankedCandidates(left: RankedCandidate, right: RankedCandidate): number {
  if (left.priority !== right.priority) {
    return right.priority - left.priority;
  }
  if (left.distanceSquared !== right.distanceSquared) {
    return left.distanceSquared - right.distanceSquared;
  }

  const idOrder = compareText(left.candidate.id, right.candidate.id);
  if (idOrder !== 0) {
    return idOrder;
  }

  const coordinateOrder =
    left.candidate.position.x - right.candidate.position.x ||
    left.candidate.position.y - right.candidate.position.y ||
    left.candidate.position.z - right.candidate.position.z;
  if (coordinateOrder !== 0) {
    return coordinateOrder;
  }

  return left.candidate.intensity - right.candidate.intensity;
}

function cloneCandidate(candidate: LightPoolCandidate): LightPoolCandidate {
  return Object.freeze({
    id: candidate.id,
    position: candidate.position.clone(),
    enabled: candidate.enabled,
    visible: candidate.visible,
    important: candidate.important,
    flickering: candidate.flickering,
    exitRelated: candidate.exitRelated,
    intensity: candidate.intensity,
  });
}

export class LightPool {
  private readonly slots: readonly LightPoolSlot[];
  private readonly pooledLights: PointLight[];
  private activeBudgetValue: number;
  private assignmentsSnapshot: readonly LightPoolAssignment[] = EMPTY_ASSIGNMENTS;
  private metricsSnapshot: LightPoolMetrics;
  private lastCandidates: readonly LightPoolCandidate[] = EMPTY_CANDIDATES;
  private lastReferencePosition = Vector3.Zero();
  private inputCandidateCount = 0;
  private eligibleCandidateCount = 0;
  private updateCount = 0;
  private reassignmentCount = 0;
  private lastUpdateReassignments = 0;
  private disposed = false;

  public constructor(scene: Scene, options: LightPoolOptions = {}) {
    const activeBudget = options.activeBudget ?? LIGHT_POOL_DEFAULT_BUDGET;
    assertBudget(activeBudget);
    this.activeBudgetValue = activeBudget;

    this.pooledLights = Array.from({ length: LIGHT_POOL_CAPACITY }, (_, slotIndex) => {
      const light = new PointLight(
        `level-zero-light-pool-${String(slotIndex).padStart(2, '0')}`,
        Vector3.Zero(),
        scene,
      );
      light.diffuse = new Color3(PROXY_DIFFUSE.r, PROXY_DIFFUSE.g, PROXY_DIFFUSE.b);
      light.specular = new Color3(PROXY_SPECULAR.r, PROXY_SPECULAR.g, PROXY_SPECULAR.b);
      light.intensity = LIGHT_POOL_MIN_INTENSITY;
      light.range = LIGHT_POOL_RANGE;
      light.shadowEnabled = false;
      light.setEnabled(false);
      return light;
    });

    this.slots = this.pooledLights.map((light) => ({
      light,
      candidateId: null,
      priority: 0,
      distanceSquared: Number.POSITIVE_INFINITY,
      displayedIntensity: 0,
    }));
    this.metricsSnapshot = this.createMetrics();
  }

  public get activeBudget(): number {
    return this.activeBudgetValue;
  }

  public get lights(): readonly PointLight[] {
    return this.pooledLights;
  }

  public get assignments(): readonly LightPoolAssignment[] {
    return this.assignmentsSnapshot;
  }

  public get metrics(): LightPoolMetrics {
    return this.metricsSnapshot;
  }

  public get reassignments(): number {
    return this.reassignmentCount;
  }

  public get isDisposed(): boolean {
    return this.disposed;
  }

  public setActiveBudget(activeBudget: number): void {
    this.assertActive();
    assertBudget(activeBudget);

    if (activeBudget === this.activeBudgetValue) {
      return;
    }

    this.activeBudgetValue = activeBudget;
    this.reconcile(this.lastCandidates, this.lastReferencePosition);
  }

  public update(
    candidates: readonly LightPoolCandidate[],
    referencePosition: Vector3,
  ): readonly LightPoolAssignment[] {
    this.assertActive();
    if (!isFinitePosition(referencePosition)) {
      throw new RangeError('LightPool reference position must contain finite coordinates.');
    }

    this.lastCandidates = Object.freeze(candidates.map(cloneCandidate));
    this.lastReferencePosition = referencePosition.clone();
    this.inputCandidateCount = candidates.length;
    this.updateCount += 1;
    this.reconcile(this.lastCandidates, this.lastReferencePosition);
    return this.assignmentsSnapshot;
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    for (const light of this.pooledLights) {
      light.dispose();
    }
    this.pooledLights.length = 0;
    this.assignmentsSnapshot = EMPTY_ASSIGNMENTS;
    this.lastCandidates = EMPTY_CANDIDATES;
    this.inputCandidateCount = 0;
    this.eligibleCandidateCount = 0;
    this.lastUpdateReassignments = 0;
    this.metricsSnapshot = this.createMetrics();
  }

  private reconcile(candidates: readonly LightPoolCandidate[], referencePosition: Vector3): void {
    const ranked = this.rankCandidates(candidates, referencePosition);
    this.eligibleCandidateCount = ranked.eligibleCount;
    const selected = ranked.candidates.slice(0, this.activeBudgetValue);
    const selectedById = new Map(selected.map((candidate) => [candidate.candidate.id, candidate]));
    const desiredSlots = Array<RankedCandidate | null>(LIGHT_POOL_CAPACITY).fill(null);
    const retainedCandidateIds = new Set<string>();

    for (let slotIndex = 0; slotIndex < this.activeBudgetValue; slotIndex += 1) {
      const assignedId = this.slots[slotIndex]?.candidateId ?? null;
      if (assignedId === null) {
        continue;
      }

      const selectedCandidate = selectedById.get(assignedId);
      if (selectedCandidate !== undefined && !retainedCandidateIds.has(assignedId)) {
        desiredSlots[slotIndex] = selectedCandidate;
        retainedCandidateIds.add(assignedId);
      }
    }

    const unplacedCandidates = selected.filter(
      (candidate) => !retainedCandidateIds.has(candidate.candidate.id),
    );
    let unplacedIndex = 0;
    for (let slotIndex = 0; slotIndex < this.activeBudgetValue; slotIndex += 1) {
      if (desiredSlots[slotIndex] !== null) {
        continue;
      }

      const candidate = unplacedCandidates[unplacedIndex];
      if (candidate !== undefined) {
        desiredSlots[slotIndex] = candidate;
        unplacedIndex += 1;
      }
    }

    let updateReassignments = 0;
    for (let slotIndex = 0; slotIndex < LIGHT_POOL_CAPACITY; slotIndex += 1) {
      const slot = this.slots[slotIndex];
      if (slot === undefined) {
        continue;
      }

      const desired = desiredSlots[slotIndex];
      if (desired === null || desired === undefined) {
        this.clearSlot(slot);
        continue;
      }

      const reassigned = slot.candidateId !== null && slot.candidateId !== desired.candidate.id;
      if (reassigned) {
        updateReassignments += 1;
      }
      this.applyCandidate(slot, desired, reassigned);
    }

    this.lastUpdateReassignments = updateReassignments;
    this.reassignmentCount += updateReassignments;
    this.assignmentsSnapshot = Object.freeze(
      this.slots.flatMap((slot, slotIndex) => {
        if (slot.candidateId === null) {
          return [];
        }

        return [
          Object.freeze({
            slotIndex,
            candidateId: slot.candidateId,
            light: slot.light,
            priority: slot.priority,
            distanceSquared: slot.distanceSquared,
          }),
        ];
      }),
    );
    this.metricsSnapshot = this.createMetrics();
  }

  private rankCandidates(
    candidates: readonly LightPoolCandidate[],
    referencePosition: Vector3,
  ): RankedCandidates {
    const candidatesById = new Map<string, RankedCandidate>();

    for (const candidate of candidates) {
      if (
        !candidate.enabled ||
        candidate.id.length === 0 ||
        !isFinitePosition(candidate.position)
      ) {
        continue;
      }

      const rankedCandidate: RankedCandidate = {
        candidate,
        priority: candidatePriority(candidate),
        distanceSquared: Vector3.DistanceSquared(candidate.position, referencePosition),
      };
      const previous = candidatesById.get(candidate.id);
      if (previous === undefined || compareRankedCandidates(rankedCandidate, previous) < 0) {
        candidatesById.set(candidate.id, rankedCandidate);
      }
    }

    const rankedCandidates = [...candidatesById.values()].sort(compareRankedCandidates);
    return {
      candidates: rankedCandidates,
      eligibleCount: rankedCandidates.length,
    };
  }

  private applyCandidate(slot: LightPoolSlot, ranked: RankedCandidate, reassigned: boolean): void {
    const targetIntensity = clampIntensity(ranked.candidate.intensity);
    const initialAssignment = slot.candidateId === null;
    if (initialAssignment) {
      slot.displayedIntensity = targetIntensity;
    } else if (reassigned) {
      slot.displayedIntensity = Math.min(
        slot.displayedIntensity,
        targetIntensity * REASSIGNMENT_START_SCALE,
      );
      slot.displayedIntensity +=
        (targetIntensity - slot.displayedIntensity) * REASSIGNED_INTENSITY_RESPONSE;
    } else {
      slot.displayedIntensity +=
        (targetIntensity - slot.displayedIntensity) * RETAINED_INTENSITY_RESPONSE;
    }
    slot.candidateId = ranked.candidate.id;
    slot.priority = ranked.priority;
    slot.distanceSquared = ranked.distanceSquared;
    slot.light.position.copyFrom(ranked.candidate.position);
    slot.light.intensity = clampIntensity(slot.displayedIntensity);
    slot.light.range = LIGHT_POOL_RANGE;
    slot.light.shadowEnabled = false;
    slot.light.setEnabled(true);
  }

  private clearSlot(slot: LightPoolSlot): void {
    slot.candidateId = null;
    slot.priority = 0;
    slot.distanceSquared = Number.POSITIVE_INFINITY;
    slot.displayedIntensity = 0;
    slot.light.position.set(0, 0, 0);
    slot.light.intensity = LIGHT_POOL_MIN_INTENSITY;
    slot.light.range = LIGHT_POOL_RANGE;
    slot.light.shadowEnabled = false;
    slot.light.setEnabled(false);
  }

  private createMetrics(): LightPoolMetrics {
    return Object.freeze({
      capacity: LIGHT_POOL_CAPACITY,
      pooledLightCount: this.pooledLights.length,
      activeBudget: this.activeBudgetValue,
      inputCandidateCount: this.inputCandidateCount,
      eligibleCandidateCount: this.eligibleCandidateCount,
      activeLightCount: this.assignmentsSnapshot.length,
      updateCount: this.updateCount,
      reassignments: this.reassignmentCount,
      lastUpdateReassignments: this.lastUpdateReassignments,
      disposed: this.disposed,
    });
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error('LightPool has been disposed.');
    }
  }
}
