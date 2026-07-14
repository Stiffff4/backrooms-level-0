import type { LightingFrameSnapshot, LightingSpatialSource } from '../lighting/LightingDirector';
import type { AmbientDirector } from './AmbientDirector';
import type { ProceduralAudioBank } from './ProceduralAudioBank';

export const LIGHTING_AUDIO_MAX_VOICES = 4;
const POSITION_RAMP_SECONDS = 0.14;
const GAIN_RAMP_SECONDS = 0.1;
const MAX_SEEN_EVENT_IDS = 64;
const LOCAL_BUZZ_GAIN = 0.035;

export type LightingAudioVoiceBudget = 2 | 3 | 4;

export interface LightingAudioBridgeRuntime {
  readonly context: AudioContext;
  readonly lightsBus: AudioNode;
}

export interface LightingAudioVoiceSnapshot {
  readonly slotIndex: number;
  readonly fixtureId: string;
  readonly intensity: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface LightingAudioBridgeMetrics {
  readonly capacity: number;
  readonly voiceBudget: LightingAudioVoiceBudget;
  readonly activeVoiceCount: number;
  readonly nodeCount: number;
  readonly updateCount: number;
  readonly reassignmentCount: number;
  readonly popCount: number;
  readonly globalModulation: number;
  readonly disposed: boolean;
}

interface SpatialVoice {
  readonly source: AudioBufferSourceNode;
  readonly filter: BiquadFilterNode;
  readonly gain: GainNode;
  readonly panner: PannerNode;
  fixtureId: string | null;
  intensity: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) {
    return minimum;
  }
  return Math.min(maximum, Math.max(minimum, value));
}

function automate(param: AudioParam, value: number, now: number, seconds: number): void {
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(value, now + seconds);
}

function disconnect(node: AudioNode): void {
  try {
    node.disconnect();
  } catch {
    // Some implementations throw when an already detached node is disconnected.
  }
}

export class LightingAudioBridge {
  private readonly voices: SpatialVoice[];
  private readonly seenEventIds = new Set<string>();
  private voiceBudgetValue: LightingAudioVoiceBudget;
  private updateCount = 0;
  private reassignmentCount = 0;
  private popCount = 0;
  private globalModulation = 1;
  private lastFrame: LightingFrameSnapshot | null = null;
  private disposed = false;

  public constructor(
    private readonly runtime: LightingAudioBridgeRuntime,
    private readonly bank: ProceduralAudioBank,
    private readonly ambient: AmbientDirector,
    voiceBudget: LightingAudioVoiceBudget = 3,
  ) {
    this.voiceBudgetValue = voiceBudget;
    this.voices = Array.from({ length: LIGHTING_AUDIO_MAX_VOICES }, (_, slotIndex) =>
      this.createVoice(slotIndex),
    );
  }

  public get nodeCount(): number {
    return this.disposed ? 0 : this.voices.length * 4;
  }

  public get voiceBudget(): LightingAudioVoiceBudget {
    return this.voiceBudgetValue;
  }

  public get voiceSnapshots(): readonly LightingAudioVoiceSnapshot[] {
    return Object.freeze(
      this.voices.flatMap((voice, slotIndex) =>
        voice.fixtureId === null
          ? []
          : [
              Object.freeze({
                slotIndex,
                fixtureId: voice.fixtureId,
                intensity: voice.intensity,
                x: voice.panner.positionX.value,
                y: voice.panner.positionY.value,
                z: voice.panner.positionZ.value,
              }),
            ],
      ),
    );
  }

  public get metrics(): LightingAudioBridgeMetrics {
    return Object.freeze({
      capacity: LIGHTING_AUDIO_MAX_VOICES,
      voiceBudget: this.voiceBudgetValue,
      activeVoiceCount: this.voiceSnapshots.length,
      nodeCount: this.nodeCount,
      updateCount: this.updateCount,
      reassignmentCount: this.reassignmentCount,
      popCount: this.popCount,
      globalModulation: this.globalModulation,
      disposed: this.disposed,
    });
  }

  public setVoiceBudget(voiceBudget: LightingAudioVoiceBudget): void {
    this.assertActive();
    if (voiceBudget !== 2 && voiceBudget !== 3 && voiceBudget !== 4) {
      throw new RangeError('Lighting audio voice budget must be 2, 3 or 4.');
    }
    this.voiceBudgetValue = voiceBudget;
    const now = this.runtime.context.currentTime;
    for (let index = voiceBudget; index < this.voices.length; index += 1) {
      const voice = this.voices[index];
      if (voice) {
        this.clearVoice(voice, now);
      }
    }
  }

  public update(frame: LightingFrameSnapshot): void {
    this.assertActive();
    if (frame === this.lastFrame) {
      return;
    }
    this.lastFrame = frame;
    this.updateCount += 1;
    const now = this.runtime.context.currentTime;
    this.globalModulation = clamp(frame.globalAudioIntensity, 0, 1);
    this.ambient.setLightingModulation(this.globalModulation, GAIN_RAMP_SECONDS);
    this.reconcileVoices(frame.spatialSources, now);
    // Flicker remains a visual/buzz modulation only. The former one-shot
    // ballast pop was read as a firecracker and distracted from the Level 0
    // ambience, so event ids are consumed without creating a transient voice.
    for (const event of frame.events) {
      if (!this.seenEventIds.has(event.eventId)) {
        this.rememberEvent(event.eventId);
      }
    }
  }

  public reset(): void {
    if (this.disposed) {
      return;
    }
    const now = this.runtime.context.currentTime;
    for (const voice of this.voices) {
      this.clearVoice(voice, now);
    }
    this.seenEventIds.clear();
    this.lastFrame = null;
    this.globalModulation = 1;
    this.ambient.setLightingModulation(1, GAIN_RAMP_SECONDS);
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    for (const voice of this.voices) {
      try {
        voice.source.stop();
      } catch {
        // Audio sources may already have ended during context teardown.
      }
      disconnect(voice.source);
      disconnect(voice.filter);
      disconnect(voice.gain);
      disconnect(voice.panner);
      voice.fixtureId = null;
      voice.intensity = 0;
    }
    this.voices.length = 0;
    this.seenEventIds.clear();
    this.lastFrame = null;
  }

  private createVoice(slotIndex: number): SpatialVoice {
    const { context, lightsBus } = this.runtime;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const panner = context.createPanner();
    source.buffer = this.bank.buzzNoise;
    source.loop = true;
    source.playbackRate.value = 0.985 + slotIndex * 0.008;
    filter.type = 'bandpass';
    filter.frequency.value = 1_150 + slotIndex * 230;
    filter.Q.value = 0.72;
    gain.gain.value = 0;
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1.4;
    panner.maxDistance = 16;
    panner.rolloffFactor = 1.1;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(lightsBus);
    source.start(context.currentTime);
    return { source, filter, gain, panner, fixtureId: null, intensity: 0 };
  }

  private reconcileVoices(sources: readonly LightingSpatialSource[], now: number): void {
    const desired = sources.slice(0, this.voiceBudgetValue);
    const desiredById = new Map(desired.map((source) => [source.fixtureId, source]));
    const retained = new Set<string>();

    for (let index = 0; index < this.voiceBudgetValue; index += 1) {
      const voice = this.voices[index];
      if (!voice?.fixtureId) {
        continue;
      }
      const source = desiredById.get(voice.fixtureId);
      if (source) {
        retained.add(source.fixtureId);
        this.applySource(voice, source, now, false);
      }
    }

    const unassigned = desired.filter((source) => !retained.has(source.fixtureId));
    let unassignedIndex = 0;
    for (let index = 0; index < this.voiceBudgetValue; index += 1) {
      const voice = this.voices[index];
      if (!voice || (voice.fixtureId !== null && retained.has(voice.fixtureId))) {
        continue;
      }
      const source = unassigned[unassignedIndex];
      if (source) {
        this.applySource(voice, source, now, voice.fixtureId !== source.fixtureId);
        unassignedIndex += 1;
      } else {
        this.clearVoice(voice, now);
      }
    }
    for (let index = this.voiceBudgetValue; index < this.voices.length; index += 1) {
      const voice = this.voices[index];
      if (voice) {
        this.clearVoice(voice, now);
      }
    }
  }

  private applySource(
    voice: SpatialVoice,
    source: LightingSpatialSource,
    now: number,
    reassigned: boolean,
  ): void {
    if (reassigned && voice.fixtureId !== null) {
      this.reassignmentCount += 1;
    }
    voice.fixtureId = source.fixtureId;
    voice.intensity = clamp(source.intensity, 0, 1);
    automate(voice.panner.positionX, source.position.x, now, POSITION_RAMP_SECONDS);
    automate(voice.panner.positionY, source.position.y, now, POSITION_RAMP_SECONDS);
    automate(voice.panner.positionZ, source.position.z, now, POSITION_RAMP_SECONDS);
    automate(voice.gain.gain, voice.intensity * LOCAL_BUZZ_GAIN, now, GAIN_RAMP_SECONDS);
  }

  private clearVoice(voice: SpatialVoice, now: number): void {
    voice.fixtureId = null;
    voice.intensity = 0;
    automate(voice.gain.gain, 0, now, GAIN_RAMP_SECONDS);
  }

  private rememberEvent(eventId: string): void {
    this.seenEventIds.add(eventId);
    while (this.seenEventIds.size > MAX_SEEN_EVENT_IDS) {
      const oldest = this.seenEventIds.values().next().value as string | undefined;
      if (oldest === undefined) {
        break;
      }
      this.seenEventIds.delete(oldest);
    }
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error('LightingAudioBridge has been disposed.');
    }
  }
}
