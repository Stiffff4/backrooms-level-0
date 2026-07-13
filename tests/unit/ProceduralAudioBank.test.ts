import { describe, expect, it, vi } from 'vitest';
import {
  ProceduralAudioBank,
  createDeterministicAudioSequence,
  hashAudioSeed,
  type AudioBufferFactory,
  type ProceduralAudioBankOptions,
  type ProceduralAudioBufferName,
} from '../../src/audio/ProceduralAudioBank';

class FakeAudioBuffer {
  public readonly duration: number;
  public readonly numberOfChannels: number;
  public readonly sampleRate: number;
  public readonly length: number;
  private readonly channels: Float32Array[];

  public constructor(numberOfChannels: number, length: number, sampleRate: number) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }

  public getChannelData(channel: number): Float32Array {
    const data = this.channels[channel];
    if (!data) {
      throw new RangeError(`Missing channel ${channel}.`);
    }
    return data;
  }
}

class FakeAudioContext implements AudioBufferFactory {
  public constructor(public readonly sampleRate = 8_000) {}

  public createBuffer(numberOfChannels: number, length: number, sampleRate: number): AudioBuffer {
    return new FakeAudioBuffer(numberOfChannels, length, sampleRate) as unknown as AudioBuffer;
  }
}

const QUICK_OPTIONS: ProceduralAudioBankOptions = {
  seed: 'unit-test-seed',
  ambienceLoopSeconds: 0.31,
  ballastLoopSeconds: 0.27,
  buzzLoopSeconds: 0.23,
  popDurationSeconds: 0.12,
};

const BUFFER_NAMES: readonly ProceduralAudioBufferName[] = [
  'ambienceNoise',
  'ballastNoise',
  'buzzNoise',
  'fluorescentPop',
];

function samplesOf(bank: ProceduralAudioBank, name: ProceduralAudioBufferName): Float32Array {
  return bank.getBuffer(name).getChannelData(0);
}

function average(samples: Float32Array): number {
  let total = 0;
  for (const sample of samples) {
    total += sample;
  }
  return total / samples.length;
}

function peak(samples: Float32Array): number {
  let result = 0;
  for (const sample of samples) {
    result = Math.max(result, Math.abs(sample));
  }
  return result;
}

describe('ProceduralAudioBank', () => {
  it('genera exactamente los mismos buffers y secuencias para la misma semilla', () => {
    const first = new ProceduralAudioBank(new FakeAudioContext(), QUICK_OPTIONS);
    const second = new ProceduralAudioBank(new FakeAudioContext(), QUICK_OPTIONS);

    for (const name of BUFFER_NAMES) {
      expect(samplesOf(first, name)).toEqual(samplesOf(second, name));
    }

    const firstSequence = first.createSequence('pops');
    const secondSequence = second.createSequence('pops');
    expect(Array.from({ length: 12 }, () => firstSequence.next())).toEqual(
      Array.from({ length: 12 }, () => secondSequence.next()),
    );
  });

  it('separa semillas y streams sin depender de Math.random', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Math.random must not be used by procedural audio.');
    });

    try {
      const first = new ProceduralAudioBank(new FakeAudioContext(), QUICK_OPTIONS);
      const second = new ProceduralAudioBank(new FakeAudioContext(), {
        ...QUICK_OPTIONS,
        seed: 'another-seed',
      });

      expect(samplesOf(first, 'ballastNoise')).not.toEqual(samplesOf(second, 'ballastNoise'));
      const pops = first.createSequence('pops');
      const modulation = first.createSequence('modulation');
      expect(pops.next()).not.toBe(modulation.next());
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('mantiene los loops centrados, acotados y suaves en la costura', () => {
    const bank = new ProceduralAudioBank(new FakeAudioContext(), QUICK_OPTIONS);

    for (const name of ['ambienceNoise', 'ballastNoise', 'buzzNoise'] as const) {
      const samples = samplesOf(bank, name);
      const first = samples[0] ?? 0;
      const last = samples[samples.length - 1] ?? 0;

      expect(Math.abs(average(samples))).toBeLessThan(1e-6);
      expect(peak(samples)).toBeLessThanOrEqual(0.721);
      expect(Math.abs(first - last)).toBeLessThan(0.025);
    }
  });

  it('crea un pop con ataque y liberación a cero, sin clipping', () => {
    const bank = new ProceduralAudioBank(new FakeAudioContext(), QUICK_OPTIONS);
    const samples = samplesOf(bank, 'fluorescentPop');

    expect(samples[0]).toBe(0);
    expect(samples[samples.length - 1]).toBe(0);
    expect(Math.abs(samples[1] ?? 0)).toBeLessThan(0.01);
    expect(peak(samples)).toBeGreaterThan(0.2);
    expect(peak(samples)).toBeLessThanOrEqual(0.881);
  });

  it('aplica duraciones solicitadas y conserva audio mono', () => {
    const context = new FakeAudioContext(10_000);
    const bank = new ProceduralAudioBank(context, QUICK_OPTIONS);

    expect(bank.ambienceNoise.length).toBe(3_100);
    expect(bank.ballastNoise.length).toBe(2_700);
    expect(bank.buzzNoise.length).toBe(2_300);
    expect(bank.fluorescentPop.length).toBe(1_200);
    expect(bank.ambienceNoise.numberOfChannels).toBe(1);
    expect(bank.nodeCount).toBe(0);
  });

  it('libera referencias de forma idempotente y rechaza uso posterior', () => {
    const bank = new ProceduralAudioBank(new FakeAudioContext(), QUICK_OPTIONS);

    bank.dispose();
    bank.dispose();

    expect(bank.isDisposed).toBe(true);
    expect(() => bank.ambienceNoise).toThrow(/disposed/i);
    expect(() => bank.createSequence('late')).toThrow(/disposed/i);
  });
});

describe('deterministic audio seed helpers', () => {
  it('producen hashes estables no nulos y valores normalizados', () => {
    expect(hashAudioSeed('same')).toBe(hashAudioSeed('same'));
    expect(hashAudioSeed('same')).not.toBe(hashAudioSeed('different'));
    expect(hashAudioSeed(12)).not.toBe(hashAudioSeed('12'));

    const sequence = createDeterministicAudioSequence('range');
    const values = Array.from({ length: 64 }, () => sequence.next());
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
  });
});
