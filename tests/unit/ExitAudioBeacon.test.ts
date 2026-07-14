import { describe, expect, it } from 'vitest';
import type { ExitWallPlacement } from '../../src/exit/exit.presentation.types';
import { ExitAudioBeacon } from '../../src/exit/ExitAudioBeacon';

interface ParamEvent {
  readonly kind: 'cancel' | 'set' | 'linear';
  readonly value: number;
  readonly time: number;
}

class FakeAudioParam {
  public value = 0;
  public readonly events: ParamEvent[] = [];

  public cancelScheduledValues(time: number): void {
    this.events.push({ kind: 'cancel', value: this.value, time });
  }

  public setValueAtTime(value: number, time: number): void {
    this.value = value;
    this.events.push({ kind: 'set', value, time });
  }

  public linearRampToValueAtTime(value: number, time: number): void {
    this.value = value;
    this.events.push({ kind: 'linear', value, time });
  }
}

class FakeAudioNode {
  public readonly connections: FakeAudioNode[] = [];
  public disconnected = false;

  public connect(destination: FakeAudioNode): FakeAudioNode {
    this.connections.push(destination);
    return destination;
  }

  public disconnect(): void {
    this.connections.length = 0;
    this.disconnected = true;
  }
}

class FakeOscillator extends FakeAudioNode {
  public type: OscillatorType = 'sine';
  public readonly frequency = new FakeAudioParam();
  public startCount = 0;
  public stopCount = 0;

  public start(): void {
    this.startCount += 1;
  }

  public stop(): void {
    this.stopCount += 1;
  }
}

class FakeFilter extends FakeAudioNode {
  public type: BiquadFilterType = 'lowpass';
  public readonly frequency = new FakeAudioParam();
  public readonly Q = new FakeAudioParam();
}

class FakeGain extends FakeAudioNode {
  public readonly gain = new FakeAudioParam();
}

class FakeDelay extends FakeAudioNode {
  public readonly delayTime = new FakeAudioParam();
}

class FakePanner extends FakeAudioNode {
  public readonly positionX = new FakeAudioParam();
  public readonly positionY = new FakeAudioParam();
  public readonly positionZ = new FakeAudioParam();
  public panningModel: PanningModelType = 'equalpower';
  public distanceModel: DistanceModelType = 'inverse';
  public refDistance = 1;
  public maxDistance = 10_000;
  public rolloffFactor = 1;
}

class FakeAudioContext {
  public currentTime = 3;
  public readonly oscillators: FakeOscillator[] = [];
  public readonly filters: FakeFilter[] = [];
  public readonly gains: FakeGain[] = [];
  public readonly delays: FakeDelay[] = [];
  public readonly panners: FakePanner[] = [];

  public createOscillator(): OscillatorNode {
    const node = new FakeOscillator();
    this.oscillators.push(node);
    return node as unknown as OscillatorNode;
  }

  public createBiquadFilter(): BiquadFilterNode {
    const node = new FakeFilter();
    this.filters.push(node);
    return node as unknown as BiquadFilterNode;
  }

  public createGain(): GainNode {
    const node = new FakeGain();
    this.gains.push(node);
    return node as unknown as GainNode;
  }

  public createDelay(): DelayNode {
    const node = new FakeDelay();
    this.delays.push(node);
    return node as unknown as DelayNode;
  }

  public createPanner(): PannerNode {
    const node = new FakePanner();
    this.panners.push(node);
    return node as unknown as PannerNode;
  }
}

const placement: ExitWallPlacement = {
  roomId: 'room-audio',
  surfaceId: 'west-wall',
  center: { x: -6, y: 1.225, z: 2 },
  inwardNormal: { x: 1, y: 0, z: 0 },
  width: 2.8,
  height: 2.45,
  seed: 871_303,
};

function createBeacon() {
  const context = new FakeAudioContext();
  const destination = new FakeAudioNode();
  const registered: FakeAudioNode[] = [];
  let unregisterCount = 0;
  const beacon = new ExitAudioBeacon(
    {
      context: context as unknown as AudioContext,
      destination: destination as unknown as AudioNode,
      registerNode: (node) => {
        registered.push(node as unknown as FakeAudioNode);
        return () => {
          unregisterCount += 1;
        };
      },
    },
    placement,
  );
  return {
    beacon,
    context,
    destination,
    registered,
    get unregisterCount() {
      return unregisterCount;
    },
  };
}

describe('ExitAudioBeacon', () => {
  it('prealoca un único grafo posicional acotado y lo registra para métricas', () => {
    const fixture = createBeacon();
    expect(fixture.context.oscillators).toHaveLength(3);
    expect(fixture.context.filters).toHaveLength(2);
    expect(fixture.context.gains).toHaveLength(6);
    expect(fixture.context.delays).toHaveLength(1);
    expect(fixture.context.panners).toHaveLength(1);
    expect(fixture.registered).toHaveLength(13);
    expect(fixture.beacon.nodeCount).toBe(13);
    expect(fixture.context.oscillators.every((oscillator) => oscillator.startCount === 1)).toBe(
      true,
    );
    expect(fixture.context.panners[0]).toMatchObject({
      panningModel: 'HRTF',
      distanceModel: 'inverse',
      maxDistance: 23,
    });
    expect(fixture.context.panners[0]?.positionX.value).toBe(-6);
    fixture.beacon.dispose();
  });

  it('produce modulación determinista, direccional y cancelación creciente al acercarse', () => {
    const first = createBeacon();
    const second = createBeacon();
    const firstFar = { ...first.beacon.update(11.25, 22) };
    const secondFar = { ...second.beacon.update(11.25, 22) };
    expect(firstFar).toEqual(secondFar);
    const near = { ...first.beacon.update(11.25, 0.8) };
    expect(near.phaseCancellation).toBeGreaterThan(firstFar.phaseCancellation);
    expect(first.context.gains[4]?.gain.value).toBeCloseTo(-near.phaseCancellation, 6);

    first.beacon.setActive(true, 0.2);
    first.beacon.update(11.3, 0.8);
    expect(first.context.gains[2]?.gain.value).toBeGreaterThan(0);
    expect(first.context.gains[2]?.gain.events.at(-1)?.time).toBeCloseTo(
      first.context.currentTime + 0.045,
      6,
    );
    first.beacon.dispose();
    second.beacon.dispose();
  });

  it('reduce profundidad de modulación, sigue rebase y valida entradas', () => {
    const { beacon, context } = createBeacon();
    const normal = { ...beacon.update(4.4, 3) };
    beacon.setReducedFlashing(true);
    const reduced = { ...beacon.update(4.4, 3) };
    expect(Math.abs(reduced.modulation - 0.82)).toBeLessThan(Math.abs(normal.modulation - 0.82));
    beacon.translate({ x: 240, y: 0, z: -18 });
    expect(context.panners[0]?.positionX.value).toBe(234);
    expect(context.panners[0]?.positionZ.value).toBe(-16);
    expect(() => beacon.update(1, -1)).toThrow(RangeError);
    expect(() => beacon.setPosition({ x: Number.NaN, y: 0, z: 0 })).toThrow(RangeError);
    beacon.dispose();
  });

  it('corta buzzing, reproduce una sola cola grave y libera todo sin leaks', () => {
    const fixture = createBeacon();
    fixture.beacon.update(6, 1);
    fixture.beacon.setActive(true, 0);
    fixture.beacon.beginTransition();
    const transitionEvents = fixture.context.gains[5]?.gain.events.length;
    expect(fixture.beacon.snapshot).toMatchObject({
      active: false,
      transitionPlayed: true,
      disposed: false,
    });
    expect(fixture.context.gains[2]?.gain.value).toBe(0);
    expect(fixture.context.gains[5]?.gain.value).toBe(0);
    fixture.beacon.beginTransition();
    expect(fixture.context.gains[5]?.gain.events).toHaveLength(transitionEvents ?? 0);

    fixture.beacon.dispose();
    fixture.beacon.dispose();
    expect(fixture.beacon.snapshot).toMatchObject({ disposed: true, nodeCount: 0 });
    expect(fixture.context.oscillators.every((oscillator) => oscillator.stopCount === 1)).toBe(
      true,
    );
    expect(fixture.registered.every((node) => node.disconnected)).toBe(true);
    expect(fixture.unregisterCount).toBe(13);
  });
});
