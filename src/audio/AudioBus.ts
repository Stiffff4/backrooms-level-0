import type { AudioBusName } from './audio.types';

function clampUnitInterval(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be a finite number.`);
  }

  return Math.min(1, Math.max(0, value));
}

function normalizeRampSeconds(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError('rampSeconds must be a finite, non-negative number.');
  }

  return value;
}

/** A gain stage that keeps user volume separate from transient pause/focus fades. */
export class AudioBus {
  private volumeValue: number;
  private multiplierValue = 1;
  private disposed = false;

  public constructor(
    public readonly name: AudioBusName,
    public readonly node: GainNode,
    initialVolume: number,
  ) {
    this.volumeValue = clampUnitInterval(initialVolume, `${name} volume`);
    this.node.gain.setValueAtTime(this.volumeValue, this.node.context.currentTime);
  }

  public get input(): GainNode {
    return this.node;
  }

  public get output(): GainNode {
    return this.node;
  }

  public get volume(): number {
    return this.volumeValue;
  }

  public get multiplier(): number {
    return this.multiplierValue;
  }

  public get targetGain(): number {
    return this.volumeValue * this.multiplierValue;
  }

  public connect(destination: AudioNode): void {
    this.assertActive();
    this.node.connect(destination);
  }

  public setVolume(volume: number, rampSeconds = 0): void {
    this.assertActive();
    this.volumeValue = clampUnitInterval(volume, `${this.name} volume`);
    this.scheduleGain(this.targetGain, normalizeRampSeconds(rampSeconds));
  }

  public setMultiplier(multiplier: number, rampSeconds = 0): void {
    this.assertActive();
    this.multiplierValue = clampUnitInterval(multiplier, `${this.name} multiplier`);
    this.scheduleGain(this.targetGain, normalizeRampSeconds(rampSeconds));
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    try {
      this.node.disconnect();
    } catch {
      // Some browsers throw if an already-disconnected node is disconnected again.
    }
  }

  private scheduleGain(target: number, rampSeconds: number): void {
    const now = this.node.context.currentTime;
    const gain = this.node.gain;

    gain.cancelScheduledValues(now);
    if (rampSeconds === 0) {
      gain.setValueAtTime(target, now);
      return;
    }

    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(target, now + rampSeconds);
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error(`Audio bus "${this.name}" has been disposed.`);
    }
  }
}
