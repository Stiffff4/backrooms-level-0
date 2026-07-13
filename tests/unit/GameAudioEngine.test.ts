import { describe, expect, it, vi } from 'vitest';
import { GameAudioEngine } from '../../src/audio/GameAudioEngine';
import { audioConfig } from '../../src/config/audio.config';

interface ParamEvent {
  readonly kind: 'cancel' | 'set' | 'linear';
  readonly value: number;
  readonly time: number;
}

class FakeAudioParam {
  public value = 1;
  public readonly events: ParamEvent[] = [];

  public cancelScheduledValues(time: number): FakeAudioParam {
    this.events.push({ kind: 'cancel', value: this.value, time });
    return this;
  }

  public setValueAtTime(value: number, time: number): FakeAudioParam {
    this.value = value;
    this.events.push({ kind: 'set', value, time });
    return this;
  }

  public linearRampToValueAtTime(value: number, time: number): FakeAudioParam {
    this.value = value;
    this.events.push({ kind: 'linear', value, time });
    return this;
  }
}

class FakeAudioNode {
  public readonly connections: unknown[] = [];
  public disconnected = false;

  public constructor(public readonly context: FakeAudioContext) {}

  public connect(destination: unknown): unknown {
    this.connections.push(destination);
    return destination;
  }

  public disconnect(destination?: unknown): void {
    this.disconnected = true;
    if (destination === undefined) {
      this.connections.length = 0;
      return;
    }

    const index = this.connections.indexOf(destination);
    if (index >= 0) {
      this.connections.splice(index, 1);
    }
  }
}

class FakeGainNode extends FakeAudioNode {
  public readonly gain = new FakeAudioParam();
}

class FakeDynamicsCompressorNode extends FakeAudioNode {
  public readonly threshold = new FakeAudioParam();
  public readonly knee = new FakeAudioParam();
  public readonly ratio = new FakeAudioParam();
  public readonly attack = new FakeAudioParam();
  public readonly release = new FakeAudioParam();
}

class FakeAudioListener {
  public readonly positionX = new FakeAudioParam();
  public readonly positionY = new FakeAudioParam();
  public readonly positionZ = new FakeAudioParam();
  public readonly forwardX = new FakeAudioParam();
  public readonly forwardY = new FakeAudioParam();
  public readonly forwardZ = new FakeAudioParam();
  public readonly upX = new FakeAudioParam();
  public readonly upY = new FakeAudioParam();
  public readonly upZ = new FakeAudioParam();
}

class FakeAudioContext {
  public currentTime = 4;
  public state: AudioContextState = 'suspended';
  public readonly listener = new FakeAudioListener();
  public readonly destination: FakeAudioNode;
  public readonly gains: FakeGainNode[] = [];
  public readonly compressors: FakeDynamicsCompressorNode[] = [];
  public resumeCalls = 0;
  public closeCalls = 0;

  public constructor() {
    this.destination = new FakeAudioNode(this);
  }

  public createGain(): GainNode {
    const gain = new FakeGainNode(this);
    this.gains.push(gain);
    return gain as unknown as GainNode;
  }

  public createDynamicsCompressor(): DynamicsCompressorNode {
    const compressor = new FakeDynamicsCompressorNode(this);
    this.compressors.push(compressor);
    return compressor as unknown as DynamicsCompressorNode;
  }

  public async resume(): Promise<void> {
    this.resumeCalls += 1;
    this.state = 'running';
  }

  public async close(): Promise<void> {
    this.closeCalls += 1;
    this.state = 'closed';
  }

  public asAudioContext(): AudioContext {
    return this as unknown as AudioContext;
  }
}

function lastEvent(param: FakeAudioParam): ParamEvent | undefined {
  return param.events.at(-1);
}

describe('GameAudioEngine', () => {
  it('crea y reanuda Web Audio solamente desde el gesto explícito', async () => {
    const context = new FakeAudioContext();
    const factory = vi.fn(() => context.asAudioContext());
    const engine = new GameAudioEngine({ contextFactory: factory });

    engine.setPaused(true);
    engine.setVolume('ambience', 0.31);

    expect(factory).not.toHaveBeenCalled();
    expect(engine.context).toBeNull();
    expect(engine.nodeCount).toBe(0);

    await expect(engine.activateFromUserGesture()).resolves.toBe(true);

    expect(factory).toHaveBeenCalledOnce();
    expect(context.resumeCalls).toBe(1);
    expect(context.gains).toHaveLength(6);
    expect(context.compressors).toHaveLength(1);
    expect(engine.nodeCount).toBe(7);
    expect(engine.ambienceBus?.volume).toBe(0.31);
    expect(engine.masterBus?.targetGain).toBe(0);

    await expect(engine.activateFromUserGesture()).resolves.toBe(true);
    expect(factory).toHaveBeenCalledOnce();
    expect(context.resumeCalls).toBe(1);
  });

  it('encadena buses al master y un DynamicsCompressor configurado como limitador', async () => {
    const context = new FakeAudioContext();
    const engine = new GameAudioEngine({ contextFactory: () => context.asAudioContext() });

    await engine.activateFromUserGesture();

    const master = context.gains[0];
    const limiter = context.compressors[0];
    expect(master?.connections).toEqual([limiter]);
    expect(limiter?.connections).toEqual([context.destination]);
    for (const child of context.gains.slice(1)) {
      expect(child.connections).toEqual([master]);
    }
    expect(limiter?.threshold.value).toBe(audioConfig.limiter.thresholdDb);
    expect(limiter?.knee.value).toBe(audioConfig.limiter.kneeDb);
    expect(limiter?.ratio.value).toBe(audioConfig.limiter.ratio);
    expect(limiter?.attack.value).toBe(audioConfig.limiter.attackSeconds);
    expect(limiter?.release.value).toBe(audioConfig.limiter.releaseSeconds);
  });

  it('conserva volúmenes nominales y compone rampas de pausa y foco', async () => {
    const context = new FakeAudioContext();
    const engine = new GameAudioEngine({ contextFactory: () => context.asAudioContext() });
    await engine.activateFromUserGesture();
    const masterGain = context.gains[0]?.gain;
    if (!masterGain) {
      throw new Error('Expected the master gain node to exist.');
    }

    engine.setVolume('master', 0.4);
    expect(lastEvent(masterGain)).toEqual({
      kind: 'linear',
      value: 0.4,
      time: context.currentTime + audioConfig.ramps.volumeSeconds,
    });

    engine.setPaused(true);
    expect(lastEvent(masterGain)).toEqual({
      kind: 'linear',
      value: 0,
      time: context.currentTime + audioConfig.ramps.pauseSeconds,
    });

    engine.setFocused(false);
    engine.setPaused(false);
    expect(engine.masterBus?.targetGain).toBe(0);

    engine.setFocused(true);
    expect(lastEvent(masterGain)).toEqual({
      kind: 'linear',
      value: 0.4,
      time: context.currentTime + audioConfig.ramps.focusSeconds,
    });

    engine.setVolume('lights', 2);
    expect(engine.getVolume('lights')).toBe(1);
    expect(() => engine.setVolume('ui', Number.NaN)).toThrow(RangeError);
  });

  it('actualiza posición y orientación normalizada del listener', async () => {
    const context = new FakeAudioContext();
    const engine = new GameAudioEngine({ contextFactory: () => context.asAudioContext() });
    await engine.activateFromUserGesture();

    expect(
      engine.updateListener({
        position: { x: 3, y: 1.7, z: -8 },
        forward: { x: 0, y: 0, z: -2 },
      }),
    ).toBe(true);

    expect(context.listener.positionX.value).toBe(3);
    expect(context.listener.positionY.value).toBe(1.7);
    expect(context.listener.positionZ.value).toBe(-8);
    expect(context.listener.forwardZ.value).toBe(-1);
    expect(context.listener.upY.value).toBe(1);
    expect(() =>
      engine.updateListener({
        position: { x: 0, y: 0, z: 0 },
        forward: { x: 0, y: 0, z: 0 },
      }),
    ).toThrow(RangeError);
  });

  it('cuenta nodos futuros y libera grafo, registros y contexto sin leaks', async () => {
    const context = new FakeAudioContext();
    const engine = new GameAudioEngine({ contextFactory: () => context.asAudioContext() });
    await engine.activateFromUserGesture();

    const transient = context.createGain();
    const unregister = engine.registerNode(transient);
    expect(engine.nodeCount).toBe(8);
    unregister();
    unregister();
    expect(engine.nodeCount).toBe(7);
    expect((transient as unknown as FakeGainNode).disconnected).toBe(true);

    const connected = context.createGain();
    const disconnect = engine.connectNode(connected, 'events');
    expect(engine.nodeCount).toBe(8);

    await engine.dispose();
    disconnect();
    await engine.dispose();

    expect(engine.nodeCount).toBe(0);
    expect(engine.context).toBeNull();
    expect(engine.state).toBe('disposed');
    expect(context.closeCalls).toBe(1);
    expect((connected as unknown as FakeGainNode).disconnected).toBe(true);
    expect(context.gains.slice(0, 6).every((node) => node.disconnected)).toBe(true);
    expect(context.compressors[0]?.disconnected).toBe(true);
  });

  it('descarta un grafo parcial y reconstruye desde cero en el siguiente gesto', async () => {
    class BrokenAudioContext extends FakeAudioContext {
      public override createDynamicsCompressor(): DynamicsCompressorNode {
        throw new Error('compressor unavailable');
      }
    }

    const broken = new BrokenAudioContext();
    const healthy = new FakeAudioContext();
    const contexts = [broken, healthy];
    const factory = vi.fn(() => {
      const context = contexts.shift();
      if (!context) {
        throw new Error('Unexpected extra AudioContext request.');
      }
      return context.asAudioContext();
    });
    const engine = new GameAudioEngine({ contextFactory: factory });

    await expect(engine.activateFromUserGesture()).resolves.toBe(false);
    expect(engine.context).toBeNull();
    expect(engine.nodeCount).toBe(0);
    expect(broken.closeCalls).toBe(1);
    expect(broken.gains.every((node) => node.disconnected)).toBe(true);

    await expect(engine.activateFromUserGesture()).resolves.toBe(true);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(engine.context).toBe(healthy.asAudioContext());
    expect(engine.nodeCount).toBe(7);
  });

  it('mantiene noAudio como un no-op seguro sin invocar la fábrica', async () => {
    const factory = vi.fn(() => new FakeAudioContext().asAudioContext());
    const engine = new GameAudioEngine({ enabled: false, contextFactory: factory });

    engine.setVolume('master', 0.2);
    engine.setPaused(true);
    engine.setFocused(false);

    await expect(engine.activateFromUserGesture()).resolves.toBe(false);
    expect(
      engine.updateListener({
        position: { x: 0, y: 0, z: 0 },
        forward: { x: 0, y: 0, z: -1 },
      }),
    ).toBe(false);
    expect(factory).not.toHaveBeenCalled();
    expect(engine.snapshot).toMatchObject({
      enabled: false,
      state: 'disabled',
      nodeCount: 0,
      paused: true,
      focused: false,
    });

    await engine.dispose();
  });
});
