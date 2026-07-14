import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { RoomLightAnchor } from '../rooms/rendering/rendering.types';
import { FixtureFlickerController } from './FixtureFlickerController';
import { LightPool, type LightPoolCandidate, type LightPoolMetrics } from './LightPool';
import { getRoomLightingProfile, selectFixtureFlickerProfile } from './RoomLightingProfiles';
import type { FixtureFlickerOverride, FixtureFlickerSample } from './lighting.types';

const FLICKER_SAMPLE_RATE_HZ = 30;
const INTENSITY_EPSILON = 0.000_5;
const FORCE_SPATIAL_DISTANCE_SQUARED = 16;

export interface LightingUpdateInput {
  readonly anchors: readonly RoomLightAnchor[];
  readonly anchorRevision: number;
  readonly activeRoomId: string | null;
  readonly visibleRoomIds: readonly string[];
  readonly playerPosition: Vector3;
  readonly absoluteTimeSeconds: number;
}

export interface LightingSpatialSource {
  readonly fixtureId: string;
  readonly position: Vector3;
  readonly intensity: number;
  readonly eventId: string | null;
}

export interface LightingEventCue {
  readonly fixtureId: string;
  readonly position: Vector3;
  readonly intensity: number;
  readonly eventId: string;
}

export interface LightingDirectorMetrics {
  readonly fixtureCount: number;
  readonly enabledFixtureCount: number;
  readonly animatedFixtureCount: number;
  readonly emitterUploadCount: number;
  readonly lastDirtyEmitterCount: number;
  readonly evaluatedFrameCount: number;
  readonly globalAudioIntensity: number;
  readonly activeRoomProxyCount: number;
  readonly anchorRevision: number;
  readonly reducedFlashing: boolean;
  readonly pool: LightPoolMetrics;
  readonly disposed: boolean;
}

export interface LightingFrameSnapshot {
  readonly globalAudioIntensity: number;
  readonly spatialSources: readonly LightingSpatialSource[];
  readonly events: readonly LightingEventCue[];
  readonly metrics: LightingDirectorMetrics;
}

export interface LightingDirectorOptions {
  readonly lightBudget?: 4 | 6 | 8;
  readonly reducedFlashing?: boolean;
}

interface MutableColorBuffer {
  readonly data: Float32Array;
  dirty: boolean;
}

const EMPTY_SPATIAL_SOURCES: readonly LightingSpatialSource[] = Object.freeze([]);
const EMPTY_EVENTS: readonly LightingEventCue[] = Object.freeze([]);

export class LightingDirector {
  private readonly flicker: FixtureFlickerController;
  private readonly pool: LightPool;
  private anchorsById = new Map<string, RoomLightAnchor>();
  private samplesById = new Map<string, FixtureFlickerSample>();
  private readonly lastVisualIntensity = new Map<string, number>();
  private anchorRevisionValue = -1;
  private lastSampleTime = Number.NEGATIVE_INFINITY;
  private lastPlayerPosition = Vector3.Zero();
  private emitterUploadCount = 0;
  private lastDirtyEmitterCount = 0;
  private evaluatedFrameCount = 0;
  private globalAudioIntensity = 1;
  private activeRoomProxyCount = 0;
  private snapshot: LightingFrameSnapshot;
  private disposed = false;

  public constructor(scene: Scene, options: LightingDirectorOptions = {}) {
    this.flicker = new FixtureFlickerController({
      reducedFlashing: options.reducedFlashing ?? false,
    });
    this.pool = new LightPool(scene, { activeBudget: options.lightBudget ?? 6 });
    this.snapshot = this.createSnapshot();
  }

  public get metrics(): LightingDirectorMetrics {
    return this.snapshot.metrics;
  }

  public get frameSnapshot(): LightingFrameSnapshot {
    return this.snapshot;
  }

  public setLightBudget(lightBudget: 4 | 6 | 8): void {
    this.assertActive();
    this.pool.setActiveBudget(lightBudget);
    this.snapshot = this.createSnapshot(this.snapshot.spatialSources, this.snapshot.events);
  }

  public setReducedFlashing(reducedFlashing: boolean): void {
    this.assertActive();
    if (this.flicker.reducedFlashing === reducedFlashing) {
      return;
    }
    this.flicker.setReducedFlashing(reducedFlashing);
    this.lastSampleTime = Number.NEGATIVE_INFINITY;
  }

  public setRoomOverride(roomId: string, override: FixtureFlickerOverride | null): boolean {
    this.assertActive();
    const changed = this.flicker.setRoomOverride(roomId, override);
    if (changed) {
      this.lastSampleTime = Number.NEGATIVE_INFINITY;
    }
    return changed;
  }

  public setFixtureOverride(fixtureId: string, override: FixtureFlickerOverride | null): boolean {
    this.assertActive();
    const changed = this.flicker.setFixtureOverride(fixtureId, override);
    if (changed) {
      this.lastSampleTime = Number.NEGATIVE_INFINITY;
    }
    return changed;
  }

  public update(input: LightingUpdateInput): LightingFrameSnapshot {
    this.assertActive();
    if (!Number.isFinite(input.absoluteTimeSeconds) || input.absoluteTimeSeconds < 0) {
      throw new RangeError('Lighting time must be a finite non-negative value.');
    }
    if (input.anchorRevision !== this.anchorRevisionValue) {
      this.syncAnchors(input.anchors, input.anchorRevision);
    }

    const sampleTime =
      Math.floor(input.absoluteTimeSeconds * FLICKER_SAMPLE_RATE_HZ) / FLICKER_SAMPLE_RATE_HZ;
    const sampleChanged = sampleTime !== this.lastSampleTime;
    if (sampleChanged) {
      const samples = this.flicker.evaluateAll(sampleTime);
      this.samplesById = new Map(samples.map((sample) => [sample.id, sample]));
      this.lastSampleTime = sampleTime;
      this.evaluatedFrameCount += 1;
      this.applyEmitterSamples(samples);
    }

    const playerMovedFar =
      Vector3.DistanceSquared(input.playerPosition, this.lastPlayerPosition) >=
      FORCE_SPATIAL_DISTANCE_SQUARED;
    if (sampleChanged || playerMovedFar || this.pool.metrics.updateCount === 0) {
      this.lastPlayerPosition.copyFrom(input.playerPosition);
      this.snapshot = this.updateProxiesAndSnapshot(input);
    }
    return this.snapshot;
  }

  public reset(): void {
    if (this.disposed) {
      return;
    }
    this.flicker.reset();
    this.lastSampleTime = Number.NEGATIVE_INFINITY;
    this.samplesById.clear();
    this.lastVisualIntensity.clear();
    this.restoreEmitterColors();
    this.pool.update([], Vector3.Zero());
    this.globalAudioIntensity = 1;
    this.activeRoomProxyCount = 0;
    this.snapshot = this.createSnapshot();
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.restoreEmitterColors();
    this.disposed = true;
    this.flicker.dispose();
    this.pool.dispose();
    this.anchorsById.clear();
    this.samplesById.clear();
    this.lastVisualIntensity.clear();
    this.activeRoomProxyCount = 0;
    this.snapshot = this.createSnapshot();
  }

  private syncAnchors(anchors: readonly RoomLightAnchor[], revision: number): void {
    if (!Number.isInteger(revision) || revision < 0) {
      throw new RangeError('Lighting anchor revision must be a non-negative integer.');
    }
    const nextAnchors = new Map<string, RoomLightAnchor>();
    for (const anchor of anchors) {
      if (nextAnchors.has(anchor.id)) {
        throw new Error(`Duplicate lighting anchor id: ${anchor.id}`);
      }
      nextAnchors.set(anchor.id, anchor);
    }
    this.flicker.syncDescriptors(
      [...nextAnchors.values()].map((anchor) => ({
        id: anchor.id,
        roomId: anchor.roomId,
        profile: anchor.enabled
          ? selectFixtureFlickerProfile(anchor.lightingProfile, anchor.flickerSeed)
          : 'off',
        enabled: anchor.enabled,
        seed: anchor.flickerSeed,
      })),
    );
    this.anchorsById = nextAnchors;
    for (const fixtureId of this.lastVisualIntensity.keys()) {
      if (!nextAnchors.has(fixtureId)) {
        this.lastVisualIntensity.delete(fixtureId);
      }
    }
    this.anchorRevisionValue = revision;
    this.lastSampleTime = Number.NEGATIVE_INFINITY;
  }

  private applyEmitterSamples(samples: readonly FixtureFlickerSample[]): void {
    const buffers = new Map<Mesh, MutableColorBuffer>();
    for (const sample of samples) {
      const anchor = this.anchorsById.get(sample.id);
      const binding = anchor?.emitterBinding;
      if (!anchor || !binding) {
        continue;
      }
      const previous = this.lastVisualIntensity.get(sample.id);
      if (
        previous !== undefined &&
        Math.abs(previous - sample.visualIntensity) <= INTENSITY_EPSILON
      ) {
        continue;
      }
      this.lastVisualIntensity.set(sample.id, sample.visualIntensity);
      let buffer = buffers.get(binding.mesh);
      if (!buffer) {
        const current = binding.mesh.getVerticesData(VertexBuffer.ColorKind);
        if (current === null) {
          throw new Error(`Fixture emitter ${binding.mesh.name} lost its color buffer.`);
        }
        buffer = { data: Float32Array.from(current), dirty: false };
        buffers.set(binding.mesh, buffer);
      }
      const end = binding.colorOffset + binding.colorLength;
      if (binding.colorOffset < 0 || end > buffer.data.length || binding.colorLength % 4 !== 0) {
        throw new RangeError(`Fixture color slice is outside ${binding.mesh.name}.`);
      }
      for (let index = binding.colorOffset; index < end; index += 4) {
        buffer.data[index] = sample.visualIntensity;
        buffer.data[index + 1] = sample.visualIntensity;
        buffer.data[index + 2] = sample.visualIntensity;
        buffer.data[index + 3] = 1;
      }
      buffer.dirty = true;
    }

    this.lastDirtyEmitterCount = 0;
    for (const [mesh, buffer] of buffers) {
      if (!buffer.dirty || mesh.isDisposed()) {
        continue;
      }
      mesh.updateVerticesData(VertexBuffer.ColorKind, buffer.data, false, false);
      this.lastDirtyEmitterCount += 1;
      this.emitterUploadCount += 1;
    }
  }

  private updateProxiesAndSnapshot(input: LightingUpdateInput): LightingFrameSnapshot {
    const visibleRooms = new Set(input.visibleRoomIds);
    const candidates: LightPoolCandidate[] = [];
    const candidateSamples = new Map<string, FixtureFlickerSample>();
    for (const [fixtureId, anchor] of this.anchorsById) {
      const sample = this.samplesById.get(fixtureId);
      if (!sample || !sample.enabled) {
        continue;
      }
      const roomProfile = getRoomLightingProfile(anchor.lightingProfile);
      anchor.node.computeWorldMatrix(true);
      const position = anchor.node.getAbsolutePosition().clone();
      candidates.push({
        id: fixtureId,
        position,
        enabled: sample.visualIntensity > 0,
        visible: visibleRooms.has(anchor.roomId) || anchor.roomId === input.activeRoomId,
        important: anchor.roomId === input.activeRoomId,
        flickering: sample.effectiveProfile !== 'stable',
        exitRelated: sample.effectiveProfile === 'exit',
        intensity: roomProfile.proxyIntensity * sample.visualIntensity,
      });
      candidateSamples.set(fixtureId, sample);
    }

    const assignments = this.pool.update(candidates, input.playerPosition);
    this.activeRoomProxyCount = assignments.filter(
      (assignment) => this.anchorsById.get(assignment.candidateId)?.roomId === input.activeRoomId,
    ).length;
    const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    const spatialSources = Object.freeze(
      assignments.flatMap((assignment) => {
        const candidate = candidatesById.get(assignment.candidateId);
        const sample = candidateSamples.get(assignment.candidateId);
        if (!candidate || !sample) {
          return [];
        }
        const anchor = this.anchorsById.get(assignment.candidateId);
        const audioGain = anchor ? getRoomLightingProfile(anchor.lightingProfile).audioGain : 1;
        return [
          Object.freeze({
            fixtureId: assignment.candidateId,
            position: candidate.position.clone(),
            intensity: Math.min(1, sample.audioIntensity * audioGain),
            eventId: sample.eventId,
          }),
        ];
      }),
    );
    const events = Object.freeze(
      [...candidateSamples.values()].flatMap((sample) => {
        if (sample.eventId === null) {
          return [];
        }
        const candidate = candidatesById.get(sample.id);
        if (!candidate) {
          return [];
        }
        return [
          Object.freeze({
            fixtureId: sample.id,
            position: candidate.position.clone(),
            intensity: sample.audioIntensity,
            eventId: sample.eventId,
          }),
        ];
      }),
    );

    const activeAudio = [...candidateSamples.values()].filter(
      (sample) => sample.roomId === input.activeRoomId,
    );
    const audioSamples = activeAudio.length > 0 ? activeAudio : [...candidateSamples.values()];
    this.globalAudioIntensity =
      audioSamples.length === 0
        ? 0
        : audioSamples.reduce((total, sample) => total + sample.audioIntensity, 0) /
          audioSamples.length;
    return this.createSnapshot(spatialSources, events);
  }

  private restoreEmitterColors(): void {
    const meshes = new Set<Mesh>();
    for (const anchor of this.anchorsById.values()) {
      if (anchor.emitterBinding) {
        meshes.add(anchor.emitterBinding.mesh);
      }
    }
    for (const mesh of meshes) {
      if (mesh.isDisposed()) {
        continue;
      }
      const current = mesh.getVerticesData(VertexBuffer.ColorKind);
      if (current !== null) {
        const restored = new Float32Array(current.length);
        restored.fill(1);
        mesh.updateVerticesData(VertexBuffer.ColorKind, restored, false, false);
      }
    }
  }

  private createSnapshot(
    spatialSources: readonly LightingSpatialSource[] = EMPTY_SPATIAL_SOURCES,
    events: readonly LightingEventCue[] = EMPTY_EVENTS,
  ): LightingFrameSnapshot {
    const samples = [...this.samplesById.values()];
    return Object.freeze({
      globalAudioIntensity: this.globalAudioIntensity,
      spatialSources,
      events,
      metrics: Object.freeze({
        fixtureCount: this.anchorsById.size,
        enabledFixtureCount: samples.filter((sample) => sample.enabled).length,
        animatedFixtureCount: samples.filter(
          (sample) => sample.enabled && sample.effectiveProfile !== 'stable',
        ).length,
        emitterUploadCount: this.emitterUploadCount,
        lastDirtyEmitterCount: this.lastDirtyEmitterCount,
        evaluatedFrameCount: this.evaluatedFrameCount,
        globalAudioIntensity: this.globalAudioIntensity,
        activeRoomProxyCount: this.activeRoomProxyCount,
        anchorRevision: this.anchorRevisionValue,
        reducedFlashing: this.flicker.reducedFlashing,
        pool: this.pool.metrics,
        disposed: this.disposed,
      }),
    });
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error('LightingDirector has been disposed.');
    }
  }
}
