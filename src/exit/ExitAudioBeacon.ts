import { deriveSeed, SeededRandom } from '../procedural/SeedBank';
import type { Vector3Like } from '../procedural/procedural.types';
import { exitPresentationConfig } from './exit.presentation.config';
import type {
  ExitAudioBeaconRuntime,
  ExitAudioBeaconSnapshot,
  ExitWallPlacement,
} from './exit.presentation.types';
import { normalizeExitWallPlacement } from './ExitPlacement';

interface LegacyPannerNode {
  setPosition?(x: number, y: number, z: number): void;
}

interface MutableAudioSnapshot {
  active: boolean;
  disposed: boolean;
  nodeCount: number;
  distance: number;
  modulation: number;
  phaseCancellation: number;
  transitionPlayed: boolean;
  reducedFlashing: boolean;
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be finite and non-negative.`);
  }
}

function automate(parameter: AudioParam, target: number, when: number, rampSeconds: number): void {
  parameter.cancelScheduledValues(when);
  parameter.setValueAtTime(parameter.value, when);
  if (rampSeconds <= 0) {
    parameter.setValueAtTime(target, when);
  } else {
    parameter.linearRampToValueAtTime(target, when + rampSeconds);
  }
}

function disconnect(node: AudioNode): void {
  try {
    node.disconnect();
  } catch {
    // Safari may throw after a graph was already detached by GameAudioEngine.
  }
}

/**
 * One bounded positional Web Audio graph for the exit. It synthesizes a low
 * electrical bed, a high ballast component and a subtle delayed inverse branch
 * whose cancellation grows near the wall. No looped external asset is needed.
 */
export class ExitAudioBeacon {
  private readonly context: AudioContext;
  private readonly humOscillator: OscillatorNode;
  private readonly electricalOscillator: OscillatorNode;
  private readonly transitionOscillator: OscillatorNode;
  private readonly humFilter: BiquadFilterNode;
  private readonly electricalFilter: BiquadFilterNode;
  private readonly humGain: GainNode;
  private readonly electricalGain: GainNode;
  private readonly outputGain: GainNode;
  private readonly directGain: GainNode;
  private readonly phaseDelay: DelayNode;
  private readonly phaseGain: GainNode;
  private readonly transitionGain: GainNode;
  private readonly panner: PannerNode;
  private readonly nodes: readonly AudioNode[];
  private readonly unregisterNodes: readonly (() => void)[];
  private readonly phaseA: number;
  private readonly phaseB: number;
  private readonly snapshotValue: MutableAudioSnapshot = {
    active: false,
    disposed: false,
    nodeCount: 0,
    distance: Number.POSITIVE_INFINITY,
    modulation: 0,
    phaseCancellation: 0,
    transitionPlayed: false,
    reducedFlashing: false,
  };
  private positionValue: Vector3Like;
  private activeValue = false;
  private reducedFlashingValue: boolean;
  private transitionPlayedValue = false;
  private modulationValue = 0;
  private disposed = false;

  public constructor(
    runtime: ExitAudioBeaconRuntime,
    placement: ExitWallPlacement,
    reducedFlashing = false,
  ) {
    const normalizedPlacement = normalizeExitWallPlacement(placement);
    this.context = runtime.context;
    this.positionValue = { ...normalizedPlacement.center };
    this.reducedFlashingValue = reducedFlashing;
    const rng = new SeededRandom(
      deriveSeed(normalizedPlacement.seed, 'exit-audio-beacon', normalizedPlacement.surfaceId),
    );
    this.phaseA = rng.next() * Math.PI * 2;
    this.phaseB = rng.next() * Math.PI * 2;

    this.humOscillator = this.context.createOscillator();
    this.humOscillator.type = 'triangle';
    this.electricalOscillator = this.context.createOscillator();
    this.electricalOscillator.type = 'sine';
    this.transitionOscillator = this.context.createOscillator();
    this.transitionOscillator.type = 'sine';
    this.humFilter = this.context.createBiquadFilter();
    this.humFilter.type = 'lowpass';
    this.electricalFilter = this.context.createBiquadFilter();
    this.electricalFilter.type = 'bandpass';
    this.humGain = this.context.createGain();
    this.electricalGain = this.context.createGain();
    this.outputGain = this.context.createGain();
    this.directGain = this.context.createGain();
    this.phaseDelay = this.context.createDelay(0.05);
    this.phaseGain = this.context.createGain();
    this.transitionGain = this.context.createGain();
    this.panner = this.context.createPanner();
    this.nodes = Object.freeze([
      this.humOscillator,
      this.electricalOscillator,
      this.transitionOscillator,
      this.humFilter,
      this.electricalFilter,
      this.humGain,
      this.electricalGain,
      this.outputGain,
      this.directGain,
      this.phaseDelay,
      this.phaseGain,
      this.transitionGain,
      this.panner,
    ]);
    this.unregisterNodes = Object.freeze(
      runtime.registerNode === undefined ? [] : this.nodes.map(runtime.registerNode),
    );

    this.configureGraph(runtime.destination);
    this.setPosition(this.positionValue);
    this.humOscillator.start();
    this.electricalOscillator.start();
    this.transitionOscillator.start();
    this.snapshotValue.nodeCount = this.nodes.length;
    this.snapshotValue.reducedFlashing = this.reducedFlashingValue;
  }

  public get snapshot(): ExitAudioBeaconSnapshot {
    return this.snapshotValue;
  }

  public get nodeCount(): number {
    return this.disposed ? 0 : this.nodes.length;
  }

  public setPosition(position: Vector3Like): void {
    this.assertActive();
    if (![position.x, position.y, position.z].every(Number.isFinite)) {
      throw new RangeError('Exit audio position must contain finite components.');
    }
    this.positionValue = { x: position.x, y: position.y, z: position.z };
    const now = this.context.currentTime;
    if (this.panner.positionX && this.panner.positionY && this.panner.positionZ) {
      this.panner.positionX.setValueAtTime(position.x, now);
      this.panner.positionY.setValueAtTime(position.y, now);
      this.panner.positionZ.setValueAtTime(position.z, now);
      return;
    }
    (this.panner as PannerNode & LegacyPannerNode).setPosition?.(
      position.x,
      position.y,
      position.z,
    );
  }

  public translate(delta: Vector3Like): void {
    if (![delta.x, delta.y, delta.z].every(Number.isFinite)) {
      throw new RangeError('Exit audio translation must contain finite components.');
    }
    this.setPosition({
      x: this.positionValue.x + delta.x,
      y: this.positionValue.y + delta.y,
      z: this.positionValue.z + delta.z,
    });
  }

  public setReducedFlashing(reducedFlashing: boolean): void {
    this.assertActive();
    this.reducedFlashingValue = reducedFlashing;
    this.snapshotValue.reducedFlashing = reducedFlashing;
  }

  public setActive(
    active: boolean,
    rampSeconds: number = exitPresentationConfig.audio.activationRampSeconds,
  ): void {
    this.assertActive();
    assertFiniteNonNegative(rampSeconds, 'Exit audio rampSeconds');
    this.activeValue = active;
    this.snapshotValue.active = active;
    const target = active ? exitPresentationConfig.audio.outputGain * this.modulationValue : 0;
    automate(this.outputGain.gain, target, this.context.currentTime, rampSeconds);
  }

  public update(elapsedSeconds: number, listenerDistance: number): ExitAudioBeaconSnapshot {
    this.assertActive();
    assertFiniteNonNegative(elapsedSeconds, 'Exit audio elapsedSeconds');
    assertFiniteNonNegative(listenerDistance, 'Exit audio listenerDistance');
    const modulationScale = this.reducedFlashingValue
      ? exitPresentationConfig.audio.reducedModulationScale
      : 1;
    const slow = Math.sin(elapsedSeconds * 1.731 + this.phaseA);
    const irregular = Math.sin(elapsedSeconds * 4.913 + this.phaseB);
    const brightness = Math.sin(elapsedSeconds * 0.419 + this.phaseA * 0.27);
    const modulation = Math.min(
      1,
      Math.max(0.58, 0.82 + (slow * 0.115 + irregular * 0.055) * modulationScale),
    );
    const proximity = 1 - clampUnit(listenerDistance / exitPresentationConfig.audio.maxDistance);
    const phaseCancellation =
      exitPresentationConfig.audio.farPhaseCancellation +
      (exitPresentationConfig.audio.nearPhaseCancellation -
        exitPresentationConfig.audio.farPhaseCancellation) *
        proximity;
    const now = this.context.currentTime;
    const ramp = exitPresentationConfig.audio.parameterRampSeconds;
    automate(
      this.humOscillator.frequency,
      exitPresentationConfig.audio.humFrequencyHz + slow * 1.45 + irregular * 0.38,
      now,
      ramp,
    );
    automate(
      this.electricalOscillator.frequency,
      exitPresentationConfig.audio.electricalFrequencyHz + brightness * 23 + irregular * 9,
      now,
      ramp,
    );
    automate(this.phaseGain.gain, -phaseCancellation, now, ramp);
    this.modulationValue = modulation;
    if (this.activeValue) {
      automate(
        this.outputGain.gain,
        exitPresentationConfig.audio.outputGain * modulation,
        now,
        ramp,
      );
    }

    this.snapshotValue.active = this.activeValue;
    this.snapshotValue.distance = listenerDistance;
    this.snapshotValue.modulation = modulation;
    this.snapshotValue.phaseCancellation = phaseCancellation;
    this.snapshotValue.transitionPlayed = this.transitionPlayedValue;
    this.snapshotValue.reducedFlashing = this.reducedFlashingValue;
    return this.snapshotValue;
  }

  public beginTransition(): void {
    this.assertActive();
    if (this.transitionPlayedValue) {
      return;
    }
    this.transitionPlayedValue = true;
    this.activeValue = false;
    this.snapshotValue.active = false;
    this.snapshotValue.transitionPlayed = true;
    const now = this.context.currentTime;
    automate(this.outputGain.gain, 0, now, exitPresentationConfig.audio.cutSeconds);

    const duration = exitPresentationConfig.audio.transitionToneSeconds;
    this.transitionGain.gain.cancelScheduledValues(now);
    this.transitionGain.gain.setValueAtTime(0, now);
    this.transitionGain.gain.linearRampToValueAtTime(0.105, now + 0.025);
    this.transitionGain.gain.linearRampToValueAtTime(0, now + duration);
    this.transitionOscillator.frequency.cancelScheduledValues(now);
    this.transitionOscillator.frequency.setValueAtTime(
      exitPresentationConfig.audio.transitionFrequencyHz,
      now,
    );
    this.transitionOscillator.frequency.linearRampToValueAtTime(
      exitPresentationConfig.audio.transitionFrequencyHz * 0.58,
      now + duration,
    );
  }

  public reset(): void {
    this.assertActive();
    this.activeValue = false;
    this.transitionPlayedValue = false;
    this.modulationValue = 0;
    this.snapshotValue.active = false;
    this.snapshotValue.transitionPlayed = false;
    const now = this.context.currentTime;
    automate(this.outputGain.gain, 0, now, 0);
    automate(this.transitionGain.gain, 0, now, 0);
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    for (const oscillator of [
      this.humOscillator,
      this.electricalOscillator,
      this.transitionOscillator,
    ]) {
      try {
        oscillator.stop();
      } catch {
        // Already stopped by a browser teardown.
      }
    }
    for (const node of this.nodes) {
      disconnect(node);
    }
    for (const unregister of this.unregisterNodes) {
      unregister();
    }
    this.snapshotValue.active = false;
    this.snapshotValue.disposed = true;
    this.snapshotValue.nodeCount = 0;
  }

  private configureGraph(destination: AudioNode): void {
    const now = this.context.currentTime;
    this.humOscillator.frequency.setValueAtTime(exitPresentationConfig.audio.humFrequencyHz, now);
    this.electricalOscillator.frequency.setValueAtTime(
      exitPresentationConfig.audio.electricalFrequencyHz,
      now,
    );
    this.transitionOscillator.frequency.setValueAtTime(
      exitPresentationConfig.audio.transitionFrequencyHz,
      now,
    );
    this.humFilter.frequency.setValueAtTime(410, now);
    this.electricalFilter.frequency.setValueAtTime(
      exitPresentationConfig.audio.electricalFrequencyHz,
      now,
    );
    this.electricalFilter.Q.setValueAtTime(0.72, now);
    this.humGain.gain.setValueAtTime(exitPresentationConfig.audio.humGain, now);
    this.electricalGain.gain.setValueAtTime(exitPresentationConfig.audio.electricalGain, now);
    this.outputGain.gain.setValueAtTime(0, now);
    this.directGain.gain.setValueAtTime(1, now);
    this.phaseDelay.delayTime.setValueAtTime(exitPresentationConfig.audio.phaseDelaySeconds, now);
    this.phaseGain.gain.setValueAtTime(-exitPresentationConfig.audio.farPhaseCancellation, now);
    this.transitionGain.gain.setValueAtTime(0, now);
    this.panner.panningModel = 'HRTF';
    this.panner.distanceModel = 'inverse';
    this.panner.refDistance = exitPresentationConfig.audio.refDistance;
    this.panner.maxDistance = exitPresentationConfig.audio.maxDistance;
    this.panner.rolloffFactor = exitPresentationConfig.audio.rolloffFactor;

    this.humOscillator.connect(this.humFilter);
    this.humFilter.connect(this.humGain);
    this.humGain.connect(this.outputGain);
    this.electricalOscillator.connect(this.electricalFilter);
    this.electricalFilter.connect(this.electricalGain);
    this.electricalGain.connect(this.outputGain);
    this.outputGain.connect(this.directGain);
    this.directGain.connect(this.panner);
    this.outputGain.connect(this.phaseDelay);
    this.phaseDelay.connect(this.phaseGain);
    this.phaseGain.connect(this.panner);
    this.transitionOscillator.connect(this.transitionGain);
    this.transitionGain.connect(this.panner);
    this.panner.connect(destination);
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error('ExitAudioBeacon has been disposed.');
    }
  }
}
