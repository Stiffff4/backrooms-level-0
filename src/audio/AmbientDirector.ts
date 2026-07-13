import {
  FluorescentHum,
  type FluorescentHumAudioRuntime,
  type FluorescentHumProfile,
} from './FluorescentHum';
import { ProceduralAudioBank, type DeterministicAudioSequence } from './ProceduralAudioBank';

export const MAX_AMBIENT_DIRECTOR_NODES = 36;
const MAX_DIRECTOR_OWN_NODES = 8;

export interface AmbientAudioRuntime extends FluorescentHumAudioRuntime {
  readonly ambienceBus: AudioNode;
}

export interface AmbientProfile {
  readonly ambienceGain: number;
  readonly buzzBrightness: number;
  readonly humFrequencyOffset: number;
  readonly wetness: number;
  readonly silenceFactor: number;
}

export interface AmbientDirectorOptions {
  readonly autoPops?: boolean;
  readonly minimumPopIntervalSeconds?: number;
  readonly maximumPopIntervalSeconds?: number;
  readonly profile?: Partial<AmbientProfile>;
}

export interface AmbientDebugSnapshot {
  readonly activeNodes: number;
  readonly activePopVoices: number;
  readonly running: boolean;
  readonly paused: boolean;
  readonly nextPopInSeconds: number | null;
}

const DEFAULT_PROFILE: AmbientProfile = {
  ambienceGain: 0.2,
  buzzBrightness: 0.46,
  humFrequencyOffset: 0,
  wetness: 0.32,
  silenceFactor: 0,
};

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) {
    return minimum;
  }
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeProfile(profile: Partial<AmbientProfile>): AmbientProfile {
  return {
    ambienceGain: clamp(profile.ambienceGain ?? DEFAULT_PROFILE.ambienceGain, 0, 1),
    buzzBrightness: clamp(profile.buzzBrightness ?? DEFAULT_PROFILE.buzzBrightness, 0, 1),
    humFrequencyOffset: clamp(
      profile.humFrequencyOffset ?? DEFAULT_PROFILE.humFrequencyOffset,
      -8,
      8,
    ),
    wetness: clamp(profile.wetness ?? DEFAULT_PROFILE.wetness, 0, 1),
    silenceFactor: clamp(profile.silenceFactor ?? DEFAULT_PROFILE.silenceFactor, 0, 1),
  };
}

function automate(
  parameter: AudioParam,
  target: number,
  when: number,
  transitionSeconds: number,
): void {
  parameter.cancelScheduledValues(when);
  parameter.setValueAtTime(parameter.value, when);
  if (transitionSeconds <= 0) {
    parameter.setValueAtTime(target, when);
  } else {
    parameter.linearRampToValueAtTime(target, when + transitionSeconds);
  }
}

function safeStop(source: AudioScheduledSourceNode, when: number): void {
  try {
    source.stop(when);
  } catch {
    // Stop is intentionally safe when owner disposal races an ended source.
  }
}

function safeDisconnect(node: AudioNode): void {
  try {
    node.disconnect();
  } catch {
    // Disconnect is intentionally idempotent across browser implementations.
  }
}

/** Coordinates the non-spatial room bed, fluorescent layers and rare pops. */
export class AmbientDirector {
  private readonly context: AudioContext;
  private readonly hum: FluorescentHum;
  private readonly ownNodes = new Set<AudioNode>();
  private readonly ownSources = new Set<AudioScheduledSourceNode>();
  private readonly popSequence: DeterministicAudioSequence;
  private readonly autoPops: boolean;
  private readonly minimumPopInterval: number;
  private readonly maximumPopInterval: number;

  private profile: AmbientProfile;
  private ambienceGain: GainNode | null = null;
  private ambienceFilter: BiquadFilterNode | null = null;
  private ambienceModulation: GainNode | null = null;
  private tension = 0;
  private nextPopAt = Number.POSITIVE_INFINITY;
  private started = false;
  private stopped = false;
  private paused = false;
  private disposed = false;

  public constructor(
    private readonly runtime: AmbientAudioRuntime,
    private readonly bank: ProceduralAudioBank,
    options: AmbientDirectorOptions = {},
  ) {
    this.context = runtime.context;
    this.profile = normalizeProfile(options.profile ?? {});
    this.autoPops = options.autoPops ?? true;
    this.minimumPopInterval = clamp(options.minimumPopIntervalSeconds ?? 17, 4, 180);
    this.maximumPopInterval = Math.max(
      this.minimumPopInterval,
      clamp(options.maximumPopIntervalSeconds ?? 43, 4, 240),
    );
    this.popSequence = bank.createSequence('ambient-director-pops');
    this.hum = new FluorescentHum(runtime, bank, {
      profile: this.toHumProfile(),
      maxPopVoices: 3,
    });
  }

  public get isRunning(): boolean {
    return this.started && !this.stopped && !this.disposed;
  }

  public get isDisposed(): boolean {
    return this.disposed;
  }

  public get nodeCount(): number {
    return this.ownNodes.size + this.hum.nodeCount;
  }

  public get debugSnapshot(): AmbientDebugSnapshot {
    const now = this.context.currentTime;
    return {
      activeNodes: this.nodeCount,
      activePopVoices: this.hum.activePopCount,
      running: this.isRunning,
      paused: this.paused,
      nextPopInSeconds:
        this.autoPops && Number.isFinite(this.nextPopAt) ? Math.max(0, this.nextPopAt - now) : null,
    };
  }

  public start(when = this.context.currentTime): void {
    this.assertUsable();
    if (this.started) {
      return;
    }
    this.started = true;
    const startTime = Math.max(this.context.currentTime, when);

    try {
      const source = this.trackSource(this.context.createBufferSource());
      const highPass = this.track(this.context.createBiquadFilter());
      const lowPass = this.track(this.context.createBiquadFilter());
      const gain = this.track(this.context.createGain());
      source.buffer = this.bank.ambienceNoise;
      source.loop = true;
      source.loopEnd = this.bank.ambienceNoise.duration;
      highPass.type = 'highpass';
      highPass.frequency.value = 24;
      lowPass.type = 'lowpass';
      lowPass.Q.value = 0.4;
      gain.gain.setValueAtTime(0, startTime);
      source.connect(highPass);
      highPass.connect(lowPass);
      lowPass.connect(gain);
      gain.connect(this.runtime.ambienceBus);
      this.ambienceGain = gain;
      this.ambienceFilter = lowPass;

      const modulationOscillator = this.trackSource(this.context.createOscillator());
      const modulationGain = this.track(this.context.createGain());
      modulationOscillator.type = 'sine';
      modulationOscillator.frequency.value = 0.071;
      modulationGain.gain.value = 0;
      modulationOscillator.connect(modulationGain);
      modulationGain.connect(gain.gain);
      this.ambienceModulation = modulationGain;

      this.applyProfile(startTime, 1.1);
      for (const scheduledSource of this.ownSources) {
        scheduledSource.start(startTime);
      }
      this.hum.start(startTime);

      if (this.nodeCount > MAX_AMBIENT_DIRECTOR_NODES) {
        throw new Error(`Ambient director exceeded its ${MAX_AMBIENT_DIRECTOR_NODES}-node budget.`);
      }
      this.scheduleNextPop(startTime);
    } catch (error: unknown) {
      this.dispose();
      throw error;
    }
  }

  /** Call from the game update loop; returns true only when an automatic pop fired. */
  public update(): boolean {
    if (!this.isRunning || this.paused || !this.autoPops) {
      return false;
    }

    const now = this.context.currentTime;
    if (now < this.nextPopAt) {
      return false;
    }

    const fired = this.playFluorescentPop(now, 0.72 + this.tension * 0.38);
    this.scheduleNextPop(now);
    return fired;
  }

  public setProfile(changes: Partial<AmbientProfile>, transitionSeconds = 0.8): void {
    this.assertUsable();
    this.profile = normalizeProfile({ ...this.profile, ...changes });
    if (!this.started || this.stopped) {
      return;
    }
    this.applyProfile(this.context.currentTime, clamp(transitionSeconds, 0, 10));
  }

  public setTension(value: number, transitionSeconds = 1.4): void {
    this.assertUsable();
    this.tension = clamp(value, 0, 1);
    if (!this.started || this.stopped) {
      return;
    }
    this.applyProfile(this.context.currentTime, clamp(transitionSeconds, 0, 10));
  }

  public setPaused(paused: boolean): void {
    this.assertUsable();
    if (this.paused === paused) {
      return;
    }
    this.paused = paused;
    this.hum.setPaused(paused);
    if (this.started && !this.stopped) {
      this.applyAmbienceGain(this.context.currentTime, paused ? 0.16 : 0.5);
      if (!paused) {
        this.scheduleNextPop(this.context.currentTime);
      }
    }
  }

  public playFluorescentPop(when = this.context.currentTime, gain = 1): boolean {
    this.assertUsable();
    if (this.nodeCount + 3 > MAX_AMBIENT_DIRECTOR_NODES) {
      return false;
    }
    return this.hum.playPop(when, gain);
  }

  /** Terminal fade. The owner may call dispose immediately during teardown. */
  public stop(fadeSeconds = 0.25): void {
    if (this.disposed || !this.started || this.stopped) {
      return;
    }
    this.stopped = true;
    this.nextPopAt = Number.POSITIVE_INFINITY;
    const now = this.context.currentTime;
    const fade = clamp(fadeSeconds, 0, 3);
    if (this.ambienceGain) {
      automate(this.ambienceGain.gain, 0, now, fade);
    }
    this.hum.stop(fade);
    for (const source of this.ownSources) {
      safeStop(source, now + fade + 0.01);
    }
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.stopped = true;
    this.nextPopAt = Number.POSITIVE_INFINITY;
    const now = this.context.currentTime;

    this.hum.dispose();
    for (const source of this.ownSources) {
      safeStop(source, now);
    }
    for (const node of this.ownNodes) {
      safeDisconnect(node);
    }
    this.ownSources.clear();
    this.ownNodes.clear();
    this.ambienceGain = null;
    this.ambienceFilter = null;
    this.ambienceModulation = null;
  }

  private applyProfile(when: number, transitionSeconds: number): void {
    this.applyAmbienceGain(when, transitionSeconds);

    if (this.ambienceFilter) {
      const dampedBrightness = 2_150 + this.profile.buzzBrightness * 4_100;
      const wetnessDamping = 1 - this.profile.wetness * 0.38;
      automate(
        this.ambienceFilter.frequency,
        dampedBrightness * wetnessDamping,
        when,
        transitionSeconds,
      );
    }
    if (this.ambienceModulation) {
      automate(this.ambienceModulation.gain, 0.002 + this.tension * 0.012, when, transitionSeconds);
    }

    this.hum.setProfile(this.toHumProfile(), transitionSeconds);
  }

  private applyAmbienceGain(when: number, transitionSeconds: number): void {
    if (!this.ambienceGain) {
      return;
    }
    const audible = 1 - this.profile.silenceFactor;
    const tensionLift = 1 + this.tension * 0.16;
    const pauseFactor = this.paused ? 0.02 : 1;
    const target = this.profile.ambienceGain * audible * tensionLift * pauseFactor;
    automate(this.ambienceGain.gain, target, when, transitionSeconds);
  }

  private toHumProfile(): Partial<FluorescentHumProfile> {
    return {
      gain: 0.3 + this.tension * 0.08,
      buzzBrightness: clamp(this.profile.buzzBrightness + this.tension * 0.22, 0, 1),
      humFrequencyOffset: this.profile.humFrequencyOffset,
      silenceFactor: this.profile.silenceFactor,
      modulationDepth: 0.34 + this.tension * 0.54,
    };
  }

  private scheduleNextPop(fromTime: number): void {
    if (!this.autoPops) {
      this.nextPopAt = Number.POSITIVE_INFINITY;
      return;
    }
    const tensionCompression = 1 - this.tension * 0.34;
    const range = this.maximumPopInterval - this.minimumPopInterval;
    const interval =
      (this.minimumPopInterval + this.popSequence.next() * range) * tensionCompression;
    this.nextPopAt = fromTime + interval;
  }

  private track<T extends AudioNode>(node: T): T {
    if (this.ownNodes.size >= MAX_DIRECTOR_OWN_NODES) {
      safeDisconnect(node);
      throw new Error(`Ambient director exceeded its ${MAX_DIRECTOR_OWN_NODES}-node bed budget.`);
    }
    this.ownNodes.add(node);
    return node;
  }

  private trackSource<T extends AudioScheduledSourceNode & AudioNode>(source: T): T {
    this.track(source);
    this.ownSources.add(source);
    return source;
  }

  private assertUsable(): void {
    if (this.disposed) {
      throw new Error('AmbientDirector has been disposed.');
    }
  }
}
