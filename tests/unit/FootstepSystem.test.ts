import { describe, expect, it } from 'vitest';
import {
  FootstepSystem,
  conditionFromWetness,
  type FootstepAudioContext,
  type FootstepPlayback,
} from '../../src/audio/FootstepSystem';
import type { PlayerMovementFrame } from '../../src/player/player.types';

class MockAudioParam {
  public value = 0;
  public readonly changes: { readonly value: number; readonly time: number }[] = [];

  public setValueAtTime(value: number, time: number): MockAudioParam {
    this.value = value;
    this.changes.push({ value, time });
    return this;
  }
}

class MockAudioNode {
  public readonly connections: unknown[] = [];
  public disconnectCount = 0;

  public connect(destination: unknown): unknown {
    this.connections.push(destination);
    return destination;
  }

  public disconnect(): void {
    this.disconnectCount += 1;
  }
}

class MockAudioBuffer {
  public readonly channels: Float32Array[];

  public constructor(
    numberOfChannels: number,
    public readonly length: number,
    public readonly sampleRate: number,
  ) {
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }

  public getChannelData(channel: number): Float32Array {
    const data = this.channels[channel];
    if (data === undefined) {
      throw new RangeError(`Missing channel ${channel}`);
    }
    return data;
  }
}

class MockBufferSource extends MockAudioNode {
  public buffer: AudioBuffer | null = null;
  public readonly playbackRate = new MockAudioParam();
  public onended: (() => void) | null = null;
  public readonly startTimes: number[] = [];
  public stopCount = 0;

  public start(when = 0): void {
    this.startTimes.push(when);
  }

  public stop(): void {
    this.stopCount += 1;
  }

  public finish(): void {
    this.onended?.();
  }
}

class MockGainNode extends MockAudioNode {
  public readonly gain = new MockAudioParam();
}

class MockStereoPannerNode extends MockAudioNode {
  public readonly pan = new MockAudioParam();
}

class MockAudioRuntime implements FootstepAudioContext {
  public currentTime = 12.5;
  public readonly sampleRate = 8_000;
  public readonly buffers: MockAudioBuffer[] = [];
  public readonly sources: MockBufferSource[] = [];
  public readonly gains: MockGainNode[] = [];
  public readonly panners: MockStereoPannerNode[] = [];
  public readonly destination = new MockAudioNode();

  public createBuffer(numberOfChannels: number, length: number, sampleRate: number): AudioBuffer {
    const buffer = new MockAudioBuffer(numberOfChannels, length, sampleRate);
    this.buffers.push(buffer);
    return buffer as unknown as AudioBuffer;
  }

  public createBufferSource(): AudioBufferSourceNode {
    const source = new MockBufferSource();
    this.sources.push(source);
    return source as unknown as AudioBufferSourceNode;
  }

  public createGain(): GainNode {
    const gain = new MockGainNode();
    this.gains.push(gain);
    return gain as unknown as GainNode;
  }

  public createStereoPanner(): StereoPannerNode {
    const panner = new MockStereoPannerNode();
    this.panners.push(panner);
    return panner as unknown as StereoPannerNode;
  }
}

function movementFrame(overrides: Partial<PlayerMovementFrame> = {}): PlayerMovementFrame {
  return {
    deltaSeconds: 1 / 60,
    distance: 0,
    horizontalSpeed: 0,
    moving: false,
    sprinting: false,
    grounded: true,
    velocity: { x: 0, z: 0 },
    ...overrides,
  };
}

function moving(distance: number, sprinting = false): PlayerMovementFrame {
  return movementFrame({
    distance,
    horizontalSpeed: distance * 60,
    moving: distance > 0,
    sprinting,
  });
}

function createSystem(
  runtime: MockAudioRuntime,
  options: ConstructorParameters<typeof FootstepSystem>[2] = {},
): FootstepSystem {
  return new FootstepSystem(runtime, runtime.destination as unknown as AudioNode, options);
}

describe('FootstepSystem', () => {
  it('sintetiza variantes originales y normalizadas para los cuatro niveles de alfombra', () => {
    const runtime = new MockAudioRuntime();

    createSystem(runtime, { seed: 42 });

    expect(runtime.buffers).toHaveLength(12);
    for (const buffer of runtime.buffers) {
      const samples = buffer.getChannelData(0);
      expect(samples.some((sample) => Math.abs(sample) > 0.001)).toBe(true);
      expect(Math.max(...samples.map((sample) => Math.abs(sample)))).toBeLessThanOrEqual(0.821);
      expect(buffer.sampleRate).toBe(runtime.sampleRate);
    }
    expect(runtime.buffers.at(-1)?.length).toBeGreaterThan(runtime.buffers[0]?.length ?? 0);
  });

  it('dispara por distancia acumulada y nunca por deltaSeconds', () => {
    const runtime = new MockAudioRuntime();
    const system = createSystem(runtime, { walkStrideLength: 1, seed: 7 });

    expect(system.update(movementFrame({ deltaSeconds: 30 }))).toBe(0);
    expect(system.update(moving(0.4))).toBe(0);
    expect(system.pendingDistance).toBeCloseTo(0.4);
    expect(system.update(movementFrame({ deltaSeconds: 90 }))).toBe(0);
    expect(system.update(moving(0.6))).toBe(1);

    expect(runtime.sources).toHaveLength(1);
    expect(system.pendingDistance).toBeCloseTo(0);
  });

  it('usa cadencias distintas para caminar y correr y alterna izquierda/derecha', () => {
    const runtime = new MockAudioRuntime();
    const events: FootstepPlayback[] = [];
    const system = createSystem(runtime, {
      walkStrideLength: 2,
      sprintStrideLength: 1,
      seed: 11,
    });
    system.subscribe((event) => events.push(event));

    expect(system.update(moving(4))).toBe(2);
    expect(system.update(moving(4, true))).toBe(4);

    expect(events.map((event) => event.side)).toEqual([
      'left',
      'right',
      'left',
      'right',
      'left',
      'right',
    ]);
    expect(events.slice(0, 2).every((event) => !event.sprinting)).toBe(true);
    expect(events.slice(2).every((event) => event.sprinting)).toBe(true);
    expect(events[2]?.gain).toBeGreaterThan(events[0]?.gain ?? 0);
    expect(runtime.panners.map((panner) => panner.pan.value)).toEqual([
      -0.12, 0.12, -0.12, 0.12, -0.12, 0.12,
    ]);
  });

  it('ignora distancia durante pausa, airborne y rebase', () => {
    const runtime = new MockAudioRuntime();
    const system = createSystem(runtime, { walkStrideLength: 1 });

    expect(system.update(moving(0.75))).toBe(0);
    expect(system.update(moving(20), { paused: true })).toBe(0);
    expect(system.pendingDistance).toBeCloseTo(0.75);
    expect(system.update({ ...moving(20), grounded: false })).toBe(0);
    expect(system.pendingDistance).toBeCloseTo(0.75);
    expect(system.update(moving(50), { rebased: true })).toBe(0);
    expect(system.pendingDistance).toBe(0);

    system.setPaused(true);
    expect(system.update(moving(2))).toBe(0);
    system.setPaused(false);
    expect(system.update(moving(1))).toBe(1);
    expect(runtime.sources).toHaveLength(1);
  });

  it('cambia de perfil wet_carpet mediante condición o mojado continuo', () => {
    const runtime = new MockAudioRuntime();
    const events: FootstepPlayback[] = [];
    const system = createSystem(runtime, { walkStrideLength: 1, initialCondition: 'normal' });
    system.subscribe((event) => events.push(event));

    system.update(moving(1), { wetness: 0.4 });
    system.update(moving(1), { condition: 'saturated' });
    system.update(moving(1), { wetness: 1 });

    expect(events.map((event) => event.condition)).toEqual(['damp', 'saturated', 'puddle']);
    expect(conditionFromWetness(-1)).toBe('normal');
    expect(conditionFromWetness(0.25)).toBe('damp');
    expect(conditionFromWetness(0.55)).toBe('saturated');
    expect(conditionFromWetness(0.82)).toBe('puddle');
    expect(conditionFromWetness(Number.NaN)).toBe('normal');
  });

  it('produce la misma variación de buffer, tono y volumen con la misma seed', () => {
    const runtimeA = new MockAudioRuntime();
    const runtimeB = new MockAudioRuntime();
    const systemA = createSystem(runtimeA, { walkStrideLength: 1, seed: 1_337 });
    const systemB = createSystem(runtimeB, { walkStrideLength: 1, seed: 1_337 });
    const eventsA: FootstepPlayback[] = [];
    const eventsB: FootstepPlayback[] = [];
    systemA.subscribe((event) => eventsA.push(event));
    systemB.subscribe((event) => eventsB.push(event));

    systemA.update(moving(3.4, true), { condition: 'puddle' });
    systemB.update(moving(3.4, true), { condition: 'puddle' });

    expect(eventsA).toEqual(eventsB);
    expect(Array.from(runtimeA.buffers[7]?.getChannelData(0) ?? [])).toEqual(
      Array.from(runtimeB.buffers[7]?.getChannelData(0) ?? []),
    );
  });

  it('limita frames anómalos para no dejar una ráfaga pendiente', () => {
    const runtime = new MockAudioRuntime();
    const system = createSystem(runtime, {
      walkStrideLength: 1,
      maxStepsPerUpdate: 3,
    });

    expect(system.update(moving(1_000))).toBe(3);
    expect(system.pendingDistance).toBeLessThan(1);
    expect(system.update(movementFrame())).toBe(0);
    expect(runtime.sources).toHaveLength(3);
  });

  it('mantiene un límite global de voces aunque lleguen muchos frames anómalos', () => {
    const runtime = new MockAudioRuntime();
    const system = createSystem(runtime, {
      walkStrideLength: 1,
      maxStepsPerUpdate: 4,
      maxActiveVoices: 2,
    });

    for (let index = 0; index < 20; index += 1) {
      system.update(moving(4));
    }

    expect(system.activeVoiceCount).toBe(2);
    expect(runtime.sources).toHaveLength(80);
    expect(runtime.sources.slice(0, -2).every((source) => source.stopCount === 1)).toBe(true);
    expect(runtime.sources.slice(0, -2).every((source) => source.disconnectCount === 1)).toBe(true);
  });

  it('desconecta cada voz al terminar y detiene las restantes al disponer', () => {
    const runtime = new MockAudioRuntime();
    const system = createSystem(runtime, { walkStrideLength: 1 });

    system.update(moving(2));
    expect(system.activeVoiceCount).toBe(2);

    runtime.sources[0]?.finish();
    expect(system.activeVoiceCount).toBe(1);
    expect(runtime.sources[0]?.disconnectCount).toBe(1);
    expect(runtime.gains[0]?.disconnectCount).toBe(1);
    expect(runtime.panners[0]?.disconnectCount).toBe(1);

    system.dispose();
    expect(system.activeVoiceCount).toBe(0);
    expect(system.isDisposed).toBe(true);
    expect(runtime.sources[1]?.stopCount).toBe(1);
    expect(runtime.sources[1]?.disconnectCount).toBe(1);
    expect(runtime.gains[1]?.disconnectCount).toBe(1);
    expect(runtime.panners[1]?.disconnectCount).toBe(1);
    expect(system.update(moving(10))).toBe(0);
  });
});
