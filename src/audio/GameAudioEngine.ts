import { audioConfig } from '../config/audio.config';
import { AudioBus } from './AudioBus';
import {
  AUDIO_BUS_NAMES,
  type AudioBusName,
  type AudioListenerPose,
  type AudioVector3,
  type AudioVolumeMap,
  type GameAudioEngineOptions,
  type GameAudioEngineSnapshot,
  type GameAudioEngineState,
} from './audio.types';

interface LegacyAudioListener {
  setPosition?(x: number, y: number, z: number): void;
  setOrientation?(
    forwardX: number,
    forwardY: number,
    forwardZ: number,
    upX: number,
    upY: number,
    upZ: number,
  ): void;
}

type WebkitAudioGlobal = typeof globalThis & {
  readonly webkitAudioContext?: typeof AudioContext;
};

const noop = (): void => undefined;

function createNativeAudioContext(): AudioContext {
  const AudioContextConstructor =
    globalThis.AudioContext ?? (globalThis as WebkitAudioGlobal).webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error('Web Audio API is not available in this browser.');
  }

  return new AudioContextConstructor({ latencyHint: 'interactive' });
}

function clampVolume(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be a finite number.`);
  }

  return Math.min(1, Math.max(0, value));
}

function createVolumeMap(overrides: Partial<AudioVolumeMap> | undefined): AudioVolumeMap {
  return {
    master: clampVolume(overrides?.master ?? audioConfig.defaultVolumes.master, 'master volume'),
    ambience: clampVolume(
      overrides?.ambience ?? audioConfig.defaultVolumes.ambience,
      'ambience volume',
    ),
    lights: clampVolume(overrides?.lights ?? audioConfig.defaultVolumes.lights, 'lights volume'),
    footsteps: clampVolume(
      overrides?.footsteps ?? audioConfig.defaultVolumes.footsteps,
      'footsteps volume',
    ),
    events: clampVolume(overrides?.events ?? audioConfig.defaultVolumes.events, 'events volume'),
    ui: clampVolume(overrides?.ui ?? audioConfig.defaultVolumes.ui, 'ui volume'),
  };
}

function assertFiniteVector(vector: AudioVector3, label: string): void {
  if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y) || !Number.isFinite(vector.z)) {
    throw new RangeError(`${label} must contain finite coordinates.`);
  }
}

function normalizeDirection(vector: AudioVector3, label: string): AudioVector3 {
  assertFiniteVector(vector, label);
  const length = Math.hypot(vector.x, vector.y, vector.z);

  if (length <= Number.EPSILON) {
    throw new RangeError(`${label} must not be a zero vector.`);
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
}

function setAudioParam(param: AudioParam, value: number, now: number): void {
  param.cancelScheduledValues(now);
  param.setValueAtTime(value, now);
}

function safeDisconnect(node: AudioNode): void {
  try {
    node.disconnect();
  } catch {
    // Disconnect is best effort during teardown and registration cleanup.
  }
}

/**
 * Owns the shared Web Audio graph. Construction is inert: the native context is
 * created and resumed exclusively by activateFromUserGesture().
 */
export class GameAudioEngine {
  private readonly enabledValue: boolean;
  private readonly contextFactory: () => AudioContext;
  private readonly muteOnFocusLoss: boolean;
  private readonly volumes: AudioVolumeMap;
  private readonly buses = new Map<AudioBusName, AudioBus>();
  private readonly managedNodes = new Set<AudioNode>();
  private readonly coreNodes = new Set<AudioNode>();
  private readonly externalNodeReferences = new Map<AudioNode, number>();

  private contextValue: AudioContext | null = null;
  private limiterValue: DynamicsCompressorNode | null = null;
  private activationInFlight: Promise<boolean> | null = null;
  private activationErrorValue: unknown = null;
  private pausedValue = false;
  private focusedValue = true;
  private unavailable = false;
  private disposed = false;

  public constructor(options: GameAudioEngineOptions = {}) {
    this.enabledValue = options.enabled ?? true;
    this.contextFactory = options.contextFactory ?? createNativeAudioContext;
    this.muteOnFocusLoss = options.muteOnFocusLoss ?? audioConfig.muteOnFocusLoss;
    this.volumes = createVolumeMap(options.initialVolumes);
  }

  public get enabled(): boolean {
    return this.enabledValue;
  }

  public get context(): AudioContext | null {
    return this.contextValue;
  }

  public get limiter(): DynamicsCompressorNode | null {
    return this.limiterValue;
  }

  public get masterBus(): AudioBus | null {
    return this.getBus('master');
  }

  public get ambienceBus(): AudioBus | null {
    return this.getBus('ambience');
  }

  public get lightsBus(): AudioBus | null {
    return this.getBus('lights');
  }

  public get footstepsBus(): AudioBus | null {
    return this.getBus('footsteps');
  }

  public get eventsBus(): AudioBus | null {
    return this.getBus('events');
  }

  public get uiBus(): AudioBus | null {
    return this.getBus('ui');
  }

  public get nodeCount(): number {
    return this.managedNodes.size;
  }

  public get activationError(): unknown {
    return this.activationErrorValue;
  }

  public get state(): GameAudioEngineState {
    if (this.disposed) {
      return 'disposed';
    }
    if (!this.enabledValue) {
      return 'disabled';
    }
    if (this.contextValue) {
      return this.contextValue.state;
    }
    return this.unavailable ? 'unavailable' : 'idle';
  }

  public get snapshot(): GameAudioEngineSnapshot {
    return {
      enabled: this.enabledValue,
      state: this.state,
      nodeCount: this.nodeCount,
      paused: this.pausedValue,
      focused: this.focusedValue,
      volumes: Object.freeze({ ...this.volumes }),
      hasActivationError: this.activationErrorValue !== null,
    };
  }

  /** Must be called directly from the title/resume user gesture handler. */
  public activateFromUserGesture(): Promise<boolean> {
    if (!this.enabledValue || this.disposed) {
      return Promise.resolve(false);
    }
    if (this.activationInFlight) {
      return this.activationInFlight;
    }

    const activation = this.activateInternal();
    this.activationInFlight = activation;
    void activation.then(() => {
      if (this.activationInFlight === activation) {
        this.activationInFlight = null;
      }
    });
    return activation;
  }

  public getBus(name: AudioBusName): AudioBus | null {
    return this.buses.get(name) ?? null;
  }

  public getVolume(name: AudioBusName): number {
    return this.volumes[name];
  }

  public setVolume(name: AudioBusName, volume: number): void {
    const normalized = clampVolume(volume, `${name} volume`);
    this.volumes[name] = normalized;
    this.buses.get(name)?.setVolume(normalized, audioConfig.ramps.volumeSeconds);
  }

  public setVolumes(volumes: Partial<AudioVolumeMap>): void {
    for (const name of AUDIO_BUS_NAMES) {
      const volume = volumes[name];
      if (volume !== undefined) {
        this.setVolume(name, volume);
      }
    }
  }

  public setPaused(paused: boolean): void {
    if (this.pausedValue === paused) {
      return;
    }

    this.pausedValue = paused;
    this.applyMasterEnvelope(audioConfig.ramps.pauseSeconds);
  }

  public setFocused(focused: boolean): void {
    if (this.focusedValue === focused) {
      return;
    }

    this.focusedValue = focused;
    if (this.muteOnFocusLoss) {
      this.applyMasterEnvelope(audioConfig.ramps.focusSeconds);
    }
  }

  /** Updates modern AudioParams, with legacy Safari methods as a fallback. */
  public updateListener(pose: AudioListenerPose): boolean {
    const context = this.contextValue;
    if (!context || this.disposed) {
      return false;
    }

    assertFiniteVector(pose.position, 'listener position');
    const forward = normalizeDirection(pose.forward, 'listener forward');
    const up = normalizeDirection(pose.up ?? audioConfig.listenerUp, 'listener up');
    const listener = context.listener;
    const now = context.currentTime;

    if (
      listener.positionX &&
      listener.positionY &&
      listener.positionZ &&
      listener.forwardX &&
      listener.forwardY &&
      listener.forwardZ &&
      listener.upX &&
      listener.upY &&
      listener.upZ
    ) {
      setAudioParam(listener.positionX, pose.position.x, now);
      setAudioParam(listener.positionY, pose.position.y, now);
      setAudioParam(listener.positionZ, pose.position.z, now);
      setAudioParam(listener.forwardX, forward.x, now);
      setAudioParam(listener.forwardY, forward.y, now);
      setAudioParam(listener.forwardZ, forward.z, now);
      setAudioParam(listener.upX, up.x, now);
      setAudioParam(listener.upY, up.y, now);
      setAudioParam(listener.upZ, up.z, now);
      return true;
    }

    const legacy = listener as AudioListener & LegacyAudioListener;
    legacy.setPosition?.(pose.position.x, pose.position.y, pose.position.z);
    legacy.setOrientation?.(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    return Boolean(legacy.setPosition || legacy.setOrientation);
  }

  /** Adds a future source/filter/panner to debug counts and engine-owned teardown. */
  public registerNode(node: AudioNode): () => void {
    const context = this.requireActiveContext();
    if (node.context !== context) {
      throw new Error('Managed audio nodes must belong to this engine AudioContext.');
    }
    if (this.coreNodes.has(node)) {
      return noop;
    }

    this.managedNodes.add(node);
    this.externalNodeReferences.set(node, (this.externalNodeReferences.get(node) ?? 0) + 1);
    let registered = true;

    return () => {
      if (!registered) {
        return;
      }
      registered = false;

      const references = this.externalNodeReferences.get(node);
      if (references === undefined) {
        return;
      }
      if (references > 1) {
        this.externalNodeReferences.set(node, references - 1);
        return;
      }

      this.externalNodeReferences.delete(node);
      this.managedNodes.delete(node);
      safeDisconnect(node);
    };
  }

  /** Connects and tracks a source node; the returned cleanup is idempotent. */
  public connectNode(node: AudioNode, busName: AudioBusName): () => void {
    const bus = this.buses.get(busName);
    if (!bus) {
      throw new Error('The audio engine must be activated before connecting nodes.');
    }

    const unregister = this.registerNode(node);
    try {
      node.connect(bus.input);
    } catch (error: unknown) {
      unregister();
      throw error;
    }

    let connected = true;
    return () => {
      if (!connected) {
        return;
      }
      connected = false;
      try {
        node.disconnect(bus.input);
      } catch {
        // It may already have been disconnected by dispose().
      }
      unregister();
    };
  }

  public async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    const context = this.contextValue;
    this.disconnectGraph();
    this.contextValue = null;
    this.limiterValue = null;

    if (context && context.state !== 'closed') {
      try {
        await context.close();
      } catch {
        // The owned graph is already disconnected even if a browser rejects close().
      }
    }
  }

  private async activateInternal(): Promise<boolean> {
    try {
      if (!this.contextValue) {
        const context = this.contextFactory();
        this.contextValue = context;
        try {
          this.initializeGraph(context);
        } catch (error: unknown) {
          this.disconnectGraph();
          this.contextValue = null;
          this.limiterValue = null;
          if (context.state !== 'closed') {
            try {
              await context.close();
            } catch {
              // The incomplete graph is disconnected even if close is rejected.
            }
          }
          throw error;
        }
        this.unavailable = false;
      }

      const context = this.contextValue;
      if (context.state === 'closed') {
        this.activationErrorValue = new Error('The AudioContext is already closed.');
        return false;
      }
      if (context.state !== 'running') {
        await context.resume();
      }

      const activated = !this.disposed && context.state === 'running';
      if (activated) {
        this.activationErrorValue = null;
      }
      return activated;
    } catch (error: unknown) {
      this.activationErrorValue = error;
      if (!this.contextValue) {
        this.unavailable = true;
      }
      return false;
    }
  }

  private initializeGraph(context: AudioContext): void {
    const master = this.createBus(context, 'master');
    const limiter = context.createDynamicsCompressor();
    this.trackCoreNode(limiter);
    this.configureLimiter(limiter, context.currentTime);
    master.connect(limiter);
    limiter.connect(context.destination);
    this.limiterValue = limiter;

    for (const name of AUDIO_BUS_NAMES) {
      if (name === 'master') {
        continue;
      }
      this.createBus(context, name).connect(master.input);
    }

    master.setMultiplier(this.shouldMute() ? 0 : 1, 0);
  }

  private createBus(context: AudioContext, name: AudioBusName): AudioBus {
    const bus = new AudioBus(name, context.createGain(), this.volumes[name]);
    this.buses.set(name, bus);
    this.trackCoreNode(bus.node);
    return bus;
  }

  private trackCoreNode(node: AudioNode): void {
    this.coreNodes.add(node);
    this.managedNodes.add(node);
  }

  private configureLimiter(limiter: DynamicsCompressorNode, now: number): void {
    setAudioParam(limiter.threshold, audioConfig.limiter.thresholdDb, now);
    setAudioParam(limiter.knee, audioConfig.limiter.kneeDb, now);
    setAudioParam(limiter.ratio, audioConfig.limiter.ratio, now);
    setAudioParam(limiter.attack, audioConfig.limiter.attackSeconds, now);
    setAudioParam(limiter.release, audioConfig.limiter.releaseSeconds, now);
  }

  private shouldMute(): boolean {
    return this.pausedValue || (this.muteOnFocusLoss && !this.focusedValue);
  }

  private applyMasterEnvelope(rampSeconds: number): void {
    this.buses.get('master')?.setMultiplier(this.shouldMute() ? 0 : 1, rampSeconds);
  }

  private requireActiveContext(): AudioContext {
    if (this.disposed) {
      throw new Error('The audio engine has been disposed.');
    }
    if (!this.contextValue) {
      throw new Error('The audio engine must be activated from a user gesture first.');
    }
    return this.contextValue;
  }

  private disconnectGraph(): void {
    for (const node of this.managedNodes) {
      safeDisconnect(node);
    }
    for (const bus of this.buses.values()) {
      bus.dispose();
    }

    this.buses.clear();
    this.managedNodes.clear();
    this.coreNodes.clear();
    this.externalNodeReferences.clear();
  }
}
