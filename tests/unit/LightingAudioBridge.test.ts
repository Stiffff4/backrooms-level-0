import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { describe, expect, it } from 'vitest';

import type { AmbientDirector } from '../../src/audio/AmbientDirector';
import {
  LIGHTING_AUDIO_MAX_VOICES,
  LightingAudioBridge,
} from '../../src/audio/LightingAudioBridge';
import type { ProceduralAudioBank } from '../../src/audio/ProceduralAudioBank';
import type { LightingFrameSnapshot } from '../../src/lighting/LightingDirector';

class FakeAudioParam {
  public value = 0;
  public cancelCount = 0;

  public cancelScheduledValues(): void {
    this.cancelCount += 1;
  }

  public setValueAtTime(value: number): void {
    this.value = value;
  }

  public linearRampToValueAtTime(value: number): void {
    this.value = value;
  }
}

class FakeAudioNode {
  public connections: FakeAudioNode[] = [];
  public disconnected = false;

  public connect(destination: FakeAudioNode): FakeAudioNode {
    this.connections.push(destination);
    return destination;
  }

  public disconnect(): void {
    this.connections = [];
    this.disconnected = true;
  }
}

class FakeBufferSource extends FakeAudioNode {
  public buffer: AudioBuffer | null = null;
  public loop = false;
  public readonly playbackRate = new FakeAudioParam();
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
  public currentTime = 2;
  public readonly sources: FakeBufferSource[] = [];
  public readonly filters: FakeFilter[] = [];
  public readonly gains: FakeGain[] = [];
  public readonly panners: FakePanner[] = [];

  public createBufferSource(): AudioBufferSourceNode {
    const node = new FakeBufferSource();
    this.sources.push(node);
    return node as unknown as AudioBufferSourceNode;
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

  public createPanner(): PannerNode {
    const node = new FakePanner();
    this.panners.push(node);
    return node as unknown as PannerNode;
  }
}

class FakeAmbientDirector {
  public readonly modulations: number[] = [];
  public readonly popGains: number[] = [];

  public setLightingModulation(value: number): void {
    this.modulations.push(value);
  }

  public playFluorescentPop(_when: number, gain: number): boolean {
    this.popGains.push(gain);
    return true;
  }
}

function frame(
  ids: readonly string[],
  eventId: string | null = null,
  globalAudioIntensity = 0.8,
): LightingFrameSnapshot {
  return {
    globalAudioIntensity,
    spatialSources: ids.map((fixtureId, index) => ({
      fixtureId,
      position: new Vector3(index + 1, 2.8, -index),
      intensity: 0.5 + index * 0.1,
      eventId: index === 0 ? eventId : null,
    })),
    events:
      eventId === null
        ? []
        : [
            {
              fixtureId: ids[0] ?? 'fixture',
              position: new Vector3(1, 2.8, 0),
              intensity: 0.5,
              eventId,
            },
          ],
    metrics: {} as LightingFrameSnapshot['metrics'],
  };
}

describe('LightingAudioBridge', () => {
  it('prealoca cuatro voces, reasigna un máximo acotado y modula el hum global', () => {
    const context = new FakeAudioContext();
    const destination = new FakeAudioNode();
    const ambient = new FakeAmbientDirector();
    const bank = { buzzNoise: {} as AudioBuffer } as ProceduralAudioBank;
    const bridge = new LightingAudioBridge(
      {
        context: context as unknown as AudioContext,
        lightsBus: destination as unknown as AudioNode,
      },
      bank,
      ambient as unknown as AmbientDirector,
      3,
    );

    expect(context.sources).toHaveLength(LIGHTING_AUDIO_MAX_VOICES);
    expect(context.filters).toHaveLength(LIGHTING_AUDIO_MAX_VOICES);
    expect(context.gains).toHaveLength(LIGHTING_AUDIO_MAX_VOICES);
    expect(context.panners).toHaveLength(LIGHTING_AUDIO_MAX_VOICES);
    expect(context.sources.every((source) => source.startCount === 1 && source.loop)).toBe(true);
    expect(bridge.nodeCount).toBe(16);

    const first = frame(['a', 'b', 'c', 'd'], 'failure:a:1');
    bridge.update(first);
    expect(bridge.voiceSnapshots.map((voice) => voice.fixtureId)).toEqual(['a', 'b', 'c']);
    expect(bridge.voiceSnapshots[0]?.x).toBeCloseTo(1, 5);
    expect(bridge.voiceSnapshots[0]?.y).toBeCloseTo(2.8, 5);
    expect(bridge.voiceSnapshots[0]?.z).toBeCloseTo(0, 5);
    expect(ambient.modulations.at(-1)).toBeCloseTo(0.8, 5);
    expect(ambient.popGains).toHaveLength(0);

    bridge.update(first);
    expect(bridge.metrics.updateCount).toBe(1);
    expect(ambient.popGains).toHaveLength(0);
    bridge.update(frame(['a', 'b', 'c'], 'failure:a:1'));
    expect(ambient.popGains).toHaveLength(0);
    bridge.update(frame(['d', 'b', 'c'], 'failure:d:2'));
    expect(ambient.popGains).toHaveLength(0);
    expect(bridge.metrics.popCount).toBe(0);
    expect(bridge.metrics.reassignmentCount).toBeGreaterThan(0);

    bridge.setVoiceBudget(2);
    expect(bridge.voiceSnapshots.length).toBeLessThanOrEqual(2);
    expect(() => bridge.setVoiceBudget(1 as 2)).toThrow(/2, 3 or 4/);
    expect(context.sources).toHaveLength(4);

    bridge.reset();
    expect(bridge.voiceSnapshots).toHaveLength(0);
    expect(ambient.modulations.at(-1)).toBe(1);
    bridge.dispose();
    bridge.dispose();
    expect(bridge.nodeCount).toBe(0);
    expect(context.sources.every((source) => source.stopCount === 1)).toBe(true);
    expect(destination.connections).toHaveLength(0);
  });
});
