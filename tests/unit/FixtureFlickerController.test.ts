import { describe, expect, it } from 'vitest';

import { lightingConfig } from '../../src/config/lighting.config';
import { FixtureFlickerController } from '../../src/lighting/FixtureFlickerController';
import {
  FIXTURE_FLICKER_PROFILES,
  type FixtureFlickerDescriptor,
  type FixtureFlickerProfile,
} from '../../src/lighting/lighting.types';

function fixture(
  id: string,
  profile: FixtureFlickerProfile = 'slow-fluctuation',
  seed: string | number = 'fixture-seed',
  roomId = 'room-a',
  enabled = true,
): FixtureFlickerDescriptor {
  return { id, roomId, profile, enabled, seed };
}

function range(values: readonly number[]): number {
  return Math.max(...values) - Math.min(...values);
}

function sampledTimes(durationSeconds: number, samplesPerSecond: number): number[] {
  return Array.from(
    { length: durationSeconds * samplesPerSecond + 1 },
    (_value, index) => index / samplesPerSecond,
  );
}

describe('FixtureFlickerController', () => {
  it('expone los seis perfiles obligatorios con estados estables, apagados y deshabilitados exactos', () => {
    expect(FIXTURE_FLICKER_PROFILES).toEqual([
      'stable',
      'microflicker',
      'slow-fluctuation',
      'intermittent-failure',
      'off',
      'exit',
    ]);

    const controller = new FixtureFlickerController();
    controller.syncDescriptors([
      fixture('stable', 'stable'),
      fixture('off', 'off'),
      fixture('disabled', 'microflicker', 7, 'room-a', false),
    ]);

    for (const time of [0, 0.016, 10, 10_000.25]) {
      expect(controller.evaluate('stable', time)).toMatchObject({
        visualIntensity: 1,
        audioIntensity: 1,
        failureActive: false,
      });
      expect(controller.evaluate('off', time)).toMatchObject({
        visualIntensity: 0,
        audioIntensity: 0,
        failureActive: false,
      });
      expect(controller.evaluate('disabled', time)).toMatchObject({
        enabled: false,
        visualIntensity: 0,
        audioIntensity: 0,
      });
    }
  });

  it('es determinista por descriptor y distingue seeds sin usar estado de frame', () => {
    const first = new FixtureFlickerController();
    const repeated = new FixtureFlickerController();
    const otherSeed = new FixtureFlickerController();
    first.register(fixture('tube', 'slow-fluctuation', 'same-seed'));
    repeated.register(fixture('tube', 'slow-fluctuation', 'same-seed'));
    otherSeed.register(fixture('tube', 'slow-fluctuation', 'different-seed'));
    const times = [0, 0.125, 1.75, 19.375, 937.125];

    const firstSamples = times.map((time) => first.evaluate('tube', time));
    expect(times.map((time) => repeated.evaluate('tube', time))).toEqual(firstSamples);
    expect(times.map((time) => otherSeed.evaluate('tube', time))).not.toEqual(firstSamples);
  });

  it('produce el mismo valor objetivo con pasos de tiempo distintos y en cualquier orden', () => {
    const direct = new FixtureFlickerController();
    const stepped = new FixtureFlickerController();
    const descriptor = fixture('failure', 'intermittent-failure', 128_991);
    direct.register(descriptor);
    stepped.register(descriptor);

    const expected = direct.evaluate('failure', 77.125);
    for (const time of [0, 1 / 30, 0.25, 3.5, 76.9, 12, 77]) {
      stepped.evaluate('failure', time);
    }
    expect(stepped.evaluate('failure', 77.125)).toEqual(expected);
    expect(stepped.evaluate('failure', 3.5)).toEqual(direct.evaluate('failure', 3.5));
  });

  it('mantiene intensidades visuales y de audio acotadas para todos los perfiles, seeds y tiempos', () => {
    const controller = new FixtureFlickerController();
    controller.syncDescriptors(
      FIXTURE_FLICKER_PROFILES.flatMap((profile, profileIndex) =>
        Array.from({ length: 8 }, (_value, seed) =>
          fixture(`${profile}-${String(seed)}`, profile, profileIndex * 10_000 + seed),
        ),
      ),
    );

    for (const time of [0, 1 / 240, 0.1, 1, 7.25, 121.75, 1_000_000.125]) {
      for (const sample of controller.evaluateAll(time)) {
        expect(Number.isFinite(sample.visualIntensity)).toBe(true);
        expect(Number.isFinite(sample.audioIntensity)).toBe(true);
        expect(sample.visualIntensity).toBeGreaterThanOrEqual(0);
        expect(sample.visualIntensity).toBeLessThanOrEqual(1);
        expect(sample.audioIntensity).toBeGreaterThanOrEqual(0);
        expect(sample.audioIntensity).toBeLessThanOrEqual(1);
      }
    }
  });

  it('diferencia microflicker, fluctuación lenta, fallo intermitente y salida con audio sincronizado', () => {
    const controller = new FixtureFlickerController();
    controller.syncDescriptors([
      fixture('micro', 'microflicker', 'profile-shape'),
      fixture('slow', 'slow-fluctuation', 'profile-shape'),
      fixture('failure', 'intermittent-failure', 'profile-shape'),
      fixture('exit', 'exit', 'profile-shape'),
    ]);
    const times = sampledTimes(180, 60);
    const micro = times.map((time) => controller.evaluate('micro', time).visualIntensity);
    const slow = times.map((time) => controller.evaluate('slow', time).visualIntensity);
    const failures = times.map((time) => controller.evaluate('failure', time));
    const exit = times.map((time) => controller.evaluate('exit', time));

    expect(Math.min(...micro)).toBeGreaterThanOrEqual(0.965);
    expect(range(micro)).toBeGreaterThan(0.02);
    expect(range(slow)).toBeGreaterThan(0.03);
    expect(Math.min(...failures.map((sample) => sample.visualIntensity))).toBeLessThan(0.95);
    expect(Math.min(...failures.map((sample) => sample.visualIntensity))).toBeGreaterThanOrEqual(
      0.84,
    );
    expect(failures.some((sample) => sample.failureActive)).toBe(true);
    expect(range(exit.map((sample) => sample.visualIntensity))).toBeGreaterThan(0.1);
    expect(Math.min(...exit.map((sample) => sample.visualIntensity))).toBeGreaterThanOrEqual(0.84);

    for (const sample of failures.filter((candidate) => candidate.visualIntensity < 0.96)) {
      expect(sample.failureActive).toBe(true);
      expect(sample.audioIntensity).toBeLessThan(0.98);
    }
  });

  it('reduced flashing elimina cortes profundos sin borrar la fluctuación ni alterar off', () => {
    const normal = new FixtureFlickerController();
    const reduced = new FixtureFlickerController({ reducedFlashing: true });
    const descriptor = fixture('failure', 'intermittent-failure', 'reduced-seed');
    normal.register(descriptor);
    reduced.register(descriptor);
    normal.register(fixture('off', 'off'));
    reduced.register(fixture('off', 'off'));
    const times = sampledTimes(240, 60);
    const normalSamples = times.map((time) => normal.evaluate('failure', time));
    const reducedSamples = times.map((time) => reduced.evaluate('failure', time));
    const reducedVisual = reducedSamples.map((sample) => sample.visualIntensity);

    expect(Math.min(...normalSamples.map((sample) => sample.visualIntensity))).toBeLessThan(0.95);
    expect(
      Math.min(...normalSamples.map((sample) => sample.visualIntensity)),
    ).toBeGreaterThanOrEqual(0.84);
    expect(Math.min(...reducedVisual)).toBeGreaterThanOrEqual(
      lightingConfig.curves['intermittent-failure'].reducedVisualFloor,
    );
    expect(range(reducedVisual)).toBeGreaterThan(0.005);
    expect(reducedSamples.some((sample) => sample.failureActive)).toBe(true);
    expect(reducedSamples.every((sample) => sample.reducedFlashingApplied)).toBe(true);
    expect(reduced.evaluate('off', 12).visualIntensity).toBe(0);

    reduced.setReducedFlashing(false);
    expect(reduced.evaluate('failure', 91.25)).toEqual(normal.evaluate('failure', 91.25));
  });

  it('combina overrides de sala y fixture sin apagar la sala y reset los retira idempotentemente', () => {
    const controller = new FixtureFlickerController();
    controller.syncDescriptors([
      fixture('a', 'stable', 'a', 'room-blackout'),
      fixture('b', 'slow-fluctuation', 'b', 'room-blackout'),
    ]);
    expect(controller.setRoomOverride('room-blackout', lightingConfig.blackoutOverride)).toBe(true);
    expect(controller.evaluate('a', 4)).toMatchObject({
      effectiveProfile: 'microflicker',
      enabled: true,
      overrideScope: 'room',
    });
    expect(controller.evaluate('a', 4).visualIntensity).toBeGreaterThanOrEqual(0.965);
    expect(controller.evaluate('b', 4).visualIntensity).toBeGreaterThanOrEqual(0.965);

    expect(controller.setFixtureOverride('a', lightingConfig.exitOverride)).toBe(true);
    expect(controller.evaluate('a', 4)).toMatchObject({
      effectiveProfile: 'exit',
      enabled: true,
      overrideScope: 'room-and-fixture',
    });
    expect(controller.evaluate('a', 4).visualIntensity).toBeGreaterThan(0.84);

    controller.reset();
    expect(controller.metrics).toMatchObject({
      fixtureCount: 2,
      fixtureOverrideCount: 0,
      roomOverrideCount: 0,
      sampleCount: 0,
      lastAbsoluteTimeSeconds: null,
    });
    expect(controller.evaluate('a', 4)).toMatchObject({
      effectiveProfile: 'stable',
      visualIntensity: 1,
      overrideScope: 'none',
    });
    controller.reset();
    controller.reset();
    expect(controller.metrics.fixtureCount).toBe(2);
  });

  it('sincroniza altas/cambios/bajas atómicamente, poda overrides y ordena evaluateAll por id', () => {
    const controller = new FixtureFlickerController();
    expect(
      controller.syncDescriptors([
        fixture('b', 'stable', 1, 'room-b'),
        fixture('a', 'stable', 2, 'room-a'),
      ]),
    ).toEqual({ added: 2, updated: 0, removed: 0, unchanged: 0, total: 2 });
    controller.setRoomOverride('room-b', lightingConfig.blackoutOverride);
    controller.setFixtureOverride('b', { visualScale: 0.5 });

    expect(
      controller.syncDescriptors([
        fixture('a', 'microflicker', 2, 'room-a'),
        fixture('c', 'exit', 3, 'room-c'),
      ]),
    ).toEqual({ added: 1, updated: 1, removed: 1, unchanged: 0, total: 2 });
    expect(controller.metrics).toMatchObject({
      fixtureCount: 2,
      roomCount: 2,
      fixtureOverrideCount: 0,
      roomOverrideCount: 0,
    });
    expect(controller.evaluateAll(1).map((sample) => sample.id)).toEqual(['a', 'c']);

    expect(() =>
      controller.syncDescriptors([fixture('duplicate'), fixture('duplicate', 'exit')]),
    ).toThrow(/Duplicate fixture flicker descriptor/);
    expect(controller.evaluateAll(1).map((sample) => sample.id)).toEqual(['a', 'c']);
  });

  it('limita frecuencia y pendiente del fallo; reduced flashing suaviza aún más sin spam', () => {
    const normal = new FixtureFlickerController();
    const reduced = new FixtureFlickerController({ reducedFlashing: true });
    const descriptor = fixture('failure', 'intermittent-failure', 'transition-audit');
    normal.register(descriptor);
    reduced.register(descriptor);
    const times = sampledTimes(180, 120);
    const normalSamples = times.map((time) => normal.evaluate('failure', time));
    const reducedSamples = times.map((time) => reduced.evaluate('failure', time));
    const starts: number[] = [];
    const runLengths: number[] = [];
    let currentRun = 0;
    let maxNormalDelta = 0;
    let maxReducedDelta = 0;

    for (let index = 0; index < normalSamples.length; index += 1) {
      const current = normalSamples[index];
      const previous = normalSamples[index - 1];
      const reducedCurrent = reducedSamples[index];
      const reducedPrevious = reducedSamples[index - 1];
      if (current?.failureActive) {
        currentRun += 1;
        if (!previous?.failureActive) {
          starts.push(index);
        }
      } else if (currentRun > 0) {
        runLengths.push(currentRun);
        currentRun = 0;
      }
      if (current !== undefined && previous !== undefined) {
        maxNormalDelta = Math.max(
          maxNormalDelta,
          Math.abs(current.visualIntensity - previous.visualIntensity),
        );
      }
      if (reducedCurrent !== undefined && reducedPrevious !== undefined) {
        maxReducedDelta = Math.max(
          maxReducedDelta,
          Math.abs(reducedCurrent.visualIntensity - reducedPrevious.visualIntensity),
        );
      }
    }
    if (currentRun > 0) {
      runLengths.push(currentRun);
    }

    expect(starts.length).toBeGreaterThan(0);
    expect(starts.length).toBeLessThanOrEqual(16);
    expect(Math.min(...runLengths)).toBeGreaterThan(10);
    expect(maxNormalDelta).toBeLessThan(0.14);
    expect(maxReducedDelta).toBeLessThan(0.035);
  });

  it('publica métricas útiles y dispose/reset son seguros e idempotentes', () => {
    const controller = new FixtureFlickerController();
    controller.register(fixture('a'));
    controller.register(fixture('b', 'off', 2, 'room-b', false));
    controller.evaluateAll(2.5);
    controller.evaluate('a', 3);
    expect(controller.metrics).toMatchObject({
      fixtureCount: 2,
      enabledFixtureCount: 1,
      roomCount: 2,
      sampleCount: 3,
      lastAbsoluteTimeSeconds: 3,
      lastEvaluationFixtureCount: 1,
      disposed: false,
    });

    controller.dispose();
    const disposed = controller.metrics;
    expect(disposed).toMatchObject({
      fixtureCount: 0,
      roomCount: 0,
      sampleCount: 0,
      disposed: true,
    });
    controller.dispose();
    controller.reset();
    expect(controller.metrics).toEqual(disposed);
    expect(() => controller.evaluate('a', 0)).toThrow(/disposed/);
    expect(() => controller.register(fixture('c'))).toThrow(/disposed/);
  });

  it('rechaza descriptores, tiempos y overrides inválidos sin contaminar el estado', () => {
    const controller = new FixtureFlickerController();
    expect(() => controller.register(fixture(' ', 'stable'))).toThrow(/cannot be empty/);
    expect(() => controller.register(fixture('bad-seed', 'stable', Number.NaN))).toThrow(/finite/);
    controller.register(fixture('valid'));
    expect(() => controller.evaluate('valid', -1)).toThrow(/non-negative/);
    expect(() => controller.setFixtureOverride('valid', {})).toThrow(/at least one field/);
    expect(() => controller.setFixtureOverride('valid', { visualScale: 1.1 })).toThrow(
      /between 0 and 1/,
    );
    expect(() =>
      controller.setRoomOverride('missing-room', lightingConfig.blackoutOverride),
    ).toThrow(/unknown fixture room/);
    expect(controller.metrics.fixtureCount).toBe(1);
  });
});
