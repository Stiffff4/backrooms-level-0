import { ProceduralAudioBank } from './ProceduralAudioBank';

export const MAX_FLUORESCENT_HUM_NODES = 28;

export interface FluorescentHumAudioRuntime {
  readonly context: AudioContext;
  readonly lightsBus: AudioNode;
  readonly eventsBus?: AudioNode;
}

export interface FluorescentHumProfile {
  readonly gain: number;
  readonly buzzBrightness: number;
  readonly humFrequencyOffset: number;
  readonly silenceFactor: number;
  readonly modulationDepth: number;
}

export interface FluorescentHumOptions {
  readonly baseFrequency?: number;
  readonly maxPopVoices?: number;
  readonly profile?: Partial<FluorescentHumProfile>;
}

interface HarmonicVoice {
  readonly oscillator: OscillatorNode;
  readonly multiplier: number;
}

interface PopVoice {
  readonly source: AudioBufferSourceNode;
  readonly nodes: readonly AudioNode[];
}

const DEFAULT_PROFILE: FluorescentHumProfile = {
  gain: 0.34,
  buzzBrightness: 0.46,
  humFrequencyOffset: 0,
  silenceFactor: 0,
  modulationDepth: 0.42,
};

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) {
    return minimum;
  }
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeProfile(profile: Partial<FluorescentHumProfile>): FluorescentHumProfile {
  return {
    gain: clamp(profile.gain ?? DEFAULT_PROFILE.gain, 0, 1),
    buzzBrightness: clamp(profile.buzzBrightness ?? DEFAULT_PROFILE.buzzBrightness, 0, 1),
    humFrequencyOffset: clamp(
      profile.humFrequencyOffset ?? DEFAULT_PROFILE.humFrequencyOffset,
      -8,
      8,
    ),
    silenceFactor: clamp(profile.silenceFactor ?? DEFAULT_PROFILE.silenceFactor, 0, 1),
    modulationDepth: clamp(profile.modulationDepth ?? DEFAULT_PROFILE.modulationDepth, 0, 1),
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
    return;
  }
  parameter.linearRampToValueAtTime(target, when + transitionSeconds);
}

function safeStop(source: AudioScheduledSourceNode, when: number): void {
  try {
    source.stop(when);
  } catch {
    // A source can only be stopped once. Disposal must remain idempotent.
  }
}

function safeDisconnect(node: AudioNode): void {
  try {
    node.disconnect();
  } catch {
    // Some browser implementations throw when an already detached node is disconnected.
  }
}

/**
 * Layered mains hum: 60 Hz fundamentals, harmonics, shaped ballast noise,
 * high buzz and a slow oscillator modulation. The graph is deliberately small.
 */
export class FluorescentHum {
  private readonly context: AudioContext;
  private readonly nodes = new Set<AudioNode>();
  private readonly scheduledSources = new Set<AudioScheduledSourceNode>();
  private readonly popVoices = new Set<PopVoice>();
  private readonly harmonics: HarmonicVoice[] = [];
  private readonly baseFrequency: number;
  private readonly maxPopVoices: number;

  private profile: FluorescentHumProfile;
  private output: GainNode | null = null;
  private buzzFilter: BiquadFilterNode | null = null;
  private modulationGain: GainNode | null = null;
  private started = false;
  private stopped = false;
  private paused = false;
  private disposed = false;

  public constructor(
    private readonly runtime: FluorescentHumAudioRuntime,
    private readonly bank: ProceduralAudioBank,
    options: FluorescentHumOptions = {},
  ) {
    this.context = runtime.context;
    this.baseFrequency = clamp(options.baseFrequency ?? 60, 45, 75);
    this.maxPopVoices = Math.round(clamp(options.maxPopVoices ?? 3, 1, 3));
    this.profile = normalizeProfile(options.profile ?? {});
  }

  public get isRunning(): boolean {
    return this.started && !this.stopped && !this.disposed;
  }

  public get isDisposed(): boolean {
    return this.disposed;
  }

  public get nodeCount(): number {
    return this.nodes.size;
  }

  public get activePopCount(): number {
    return this.popVoices.size;
  }

  public start(when = this.context.currentTime): void {
    this.assertUsable();
    if (this.started) {
      return;
    }

    this.started = true;
    const startTime = Math.max(this.context.currentTime, when);

    try {
      const output = this.track(this.context.createGain());
      output.gain.setValueAtTime(0, startTime);
      output.connect(this.runtime.lightsBus);
      this.output = output;

      this.createHarmonic(1, 'sine', 0.19, output, startTime);
      this.createHarmonic(2, 'sine', 0.075, output, startTime);
      this.createHarmonic(3, 'triangle', 0.038, output, startTime);
      this.createHarmonic(5, 'sine', 0.018, output, startTime);

      const ballastSource = this.trackSource(this.context.createBufferSource());
      const ballastHighPass = this.track(this.context.createBiquadFilter());
      const ballastBandPass = this.track(this.context.createBiquadFilter());
      const ballastGain = this.track(this.context.createGain());
      ballastSource.buffer = this.bank.ballastNoise;
      ballastSource.loop = true;
      ballastSource.loopEnd = this.bank.ballastNoise.duration;
      ballastHighPass.type = 'highpass';
      ballastHighPass.frequency.value = 72;
      ballastBandPass.type = 'bandpass';
      ballastBandPass.frequency.value = 1_180;
      ballastBandPass.Q.value = 0.48;
      ballastGain.gain.value = 0.105;
      ballastSource.connect(ballastHighPass);
      ballastHighPass.connect(ballastBandPass);
      ballastBandPass.connect(ballastGain);
      ballastGain.connect(output);

      const buzzSource = this.trackSource(this.context.createBufferSource());
      const buzzFilter = this.track(this.context.createBiquadFilter());
      const buzzGain = this.track(this.context.createGain());
      buzzSource.buffer = this.bank.buzzNoise;
      buzzSource.loop = true;
      buzzSource.loopEnd = this.bank.buzzNoise.duration;
      buzzFilter.type = 'bandpass';
      buzzFilter.Q.value = 0.72;
      buzzGain.gain.value = 0.052;
      buzzSource.connect(buzzFilter);
      buzzFilter.connect(buzzGain);
      buzzGain.connect(output);
      this.buzzFilter = buzzFilter;

      const modulationOscillator = this.trackSource(this.context.createOscillator());
      const modulationGain = this.track(this.context.createGain());
      modulationOscillator.type = 'sine';
      modulationOscillator.frequency.value = 0.173;
      modulationOscillator.connect(modulationGain);
      modulationGain.connect(ballastGain.gain);
      this.modulationGain = modulationGain;

      this.applyProfile(this.profile, startTime, 0.85);

      for (const source of this.scheduledSources) {
        source.start(startTime);
      }
    } catch (error: unknown) {
      this.dispose();
      throw error;
    }
  }

  public setProfile(changes: Partial<FluorescentHumProfile>, transitionSeconds = 0.7): void {
    this.assertUsable();
    this.profile = normalizeProfile({ ...this.profile, ...changes });
    if (!this.started || this.stopped) {
      return;
    }
    this.applyProfile(this.profile, this.context.currentTime, clamp(transitionSeconds, 0, 10));
  }

  public setPaused(paused: boolean, transitionSeconds = paused ? 0.18 : 0.45): void {
    this.assertUsable();
    if (this.paused === paused) {
      return;
    }
    this.paused = paused;
    if (!this.started || this.stopped || !this.output) {
      return;
    }
    this.applyOutputGain(this.context.currentTime, clamp(transitionSeconds, 0, 4));
  }

  public playPop(when = this.context.currentTime, gain = 1): boolean {
    this.assertUsable();
    if (!this.started || this.stopped || this.popVoices.size >= this.maxPopVoices) {
      return false;
    }
    if (this.nodeCount + 3 > MAX_FLUORESCENT_HUM_NODES) {
      return false;
    }

    const startTime = Math.max(this.context.currentTime, when);
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const voiceGain = this.context.createGain();
    const voiceNodes: readonly AudioNode[] = [source, filter, voiceGain];
    const voice: PopVoice = { source, nodes: voiceNodes };

    try {
      for (const node of voiceNodes) {
        this.track(node);
      }
      this.scheduledSources.add(source);
      this.popVoices.add(voice);

      source.buffer = this.bank.fluorescentPop;
      filter.type = 'highpass';
      filter.frequency.value = 480;
      filter.Q.value = 0.65;
      const duration = this.bank.fluorescentPop.duration;
      const level = clamp(gain, 0, 1.5) * 0.42;
      voiceGain.gain.setValueAtTime(0, startTime);
      voiceGain.gain.linearRampToValueAtTime(level, startTime + 0.004);
      voiceGain.gain.linearRampToValueAtTime(0, startTime + duration);

      source.connect(filter);
      filter.connect(voiceGain);
      voiceGain.connect(this.runtime.eventsBus ?? this.runtime.lightsBus);
      source.onended = () => this.releasePopVoice(voice);
      source.start(startTime);
      source.stop(startTime + duration + 0.01);
      return true;
    } catch (error: unknown) {
      this.releasePopVoice(voice);
      throw error;
    }
  }

  /** Terminal fade. Call dispose once the owner no longer needs the graph. */
  public stop(fadeSeconds = 0.18): void {
    if (this.disposed || !this.started || this.stopped) {
      return;
    }
    this.stopped = true;
    const now = this.context.currentTime;
    const stopTime = now + clamp(fadeSeconds, 0, 3);
    if (this.output) {
      automate(this.output.gain, 0, now, stopTime - now);
    }
    for (const source of this.scheduledSources) {
      safeStop(source, stopTime + 0.01);
    }
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.stopped = true;
    const now = this.context.currentTime;

    for (const source of this.scheduledSources) {
      source.onended = null;
      safeStop(source, now);
    }
    for (const node of this.nodes) {
      safeDisconnect(node);
    }

    this.scheduledSources.clear();
    this.popVoices.clear();
    this.harmonics.length = 0;
    this.nodes.clear();
    this.output = null;
    this.buzzFilter = null;
    this.modulationGain = null;
  }

  private createHarmonic(
    multiplier: number,
    type: OscillatorType,
    gainValue: number,
    output: AudioNode,
    startTime: number,
  ): void {
    const oscillator = this.trackSource(this.context.createOscillator());
    const gain = this.track(this.context.createGain());
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(this.frequencyFor(multiplier), startTime);
    gain.gain.value = gainValue;
    oscillator.connect(gain);
    gain.connect(output);
    this.harmonics.push({ oscillator, multiplier });
  }

  private applyProfile(
    profile: FluorescentHumProfile,
    when: number,
    transitionSeconds: number,
  ): void {
    this.applyOutputGain(when, transitionSeconds);

    if (this.buzzFilter) {
      const filterFrequency = 720 + profile.buzzBrightness * 5_600;
      automate(this.buzzFilter.frequency, filterFrequency, when, transitionSeconds);
    }
    if (this.modulationGain) {
      automate(
        this.modulationGain.gain,
        0.004 + profile.modulationDepth * 0.024,
        when,
        transitionSeconds,
      );
    }
    for (const harmonic of this.harmonics) {
      automate(
        harmonic.oscillator.frequency,
        this.frequencyFor(harmonic.multiplier),
        when,
        transitionSeconds,
      );
    }
  }

  private applyOutputGain(when: number, transitionSeconds: number): void {
    if (!this.output) {
      return;
    }
    const activeGain = this.profile.gain * (1 - this.profile.silenceFactor);
    const target = this.paused ? activeGain * 0.025 : activeGain;
    automate(this.output.gain, target, when, transitionSeconds);
  }

  private frequencyFor(multiplier: number): number {
    return (this.baseFrequency + this.profile.humFrequencyOffset) * multiplier;
  }

  private track<T extends AudioNode>(node: T): T {
    if (this.nodes.size >= MAX_FLUORESCENT_HUM_NODES) {
      safeDisconnect(node);
      throw new Error(`Fluorescent hum exceeded its ${MAX_FLUORESCENT_HUM_NODES}-node budget.`);
    }
    this.nodes.add(node);
    return node;
  }

  private trackSource<T extends AudioScheduledSourceNode & AudioNode>(source: T): T {
    this.track(source);
    this.scheduledSources.add(source);
    return source;
  }

  private releasePopVoice(voice: PopVoice): void {
    if (!this.popVoices.delete(voice)) {
      return;
    }
    this.scheduledSources.delete(voice.source);
    voice.source.onended = null;
    for (const node of voice.nodes) {
      safeDisconnect(node);
      this.nodes.delete(node);
    }
  }

  private assertUsable(): void {
    if (this.disposed) {
      throw new Error('FluorescentHum has been disposed.');
    }
  }
}
