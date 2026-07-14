import type { FixtureFlickerProfile } from '../lighting/lighting.types';

export interface IntermittentFailureCurve {
  readonly cycleSeconds: number;
  readonly eventChance: number;
  readonly holdSecondsMin: number;
  readonly holdSecondsMax: number;
  readonly attackSeconds: number;
  readonly releaseSeconds: number;
  readonly visualTargetMin: number;
  readonly visualTargetMax: number;
  readonly audioTargetMin: number;
  readonly audioTargetMax: number;
}

export interface FixtureFlickerCurve {
  readonly visualMin: number;
  readonly visualMax: number;
  readonly audioMin: number;
  readonly audioMax: number;
  readonly primaryFrequencyHz: number;
  readonly secondaryFrequencyHz: number;
  readonly secondaryMix: number;
  readonly frequencyJitter: number;
  readonly reducedVisualDepthScale: number;
  readonly reducedAudioDepthScale: number;
  readonly reducedVisualFloor: number;
  readonly reducedAudioFloor: number;
  readonly failure: Readonly<IntermittentFailureCurve> | null;
}

function curve(value: FixtureFlickerCurve): Readonly<FixtureFlickerCurve> {
  return Object.freeze({
    ...value,
    failure: value.failure === null ? null : Object.freeze({ ...value.failure }),
  });
}

export const fixtureFlickerCurves: Readonly<
  Record<FixtureFlickerProfile, Readonly<FixtureFlickerCurve>>
> = Object.freeze({
  stable: curve({
    visualMin: 1,
    visualMax: 1,
    audioMin: 1,
    audioMax: 1,
    primaryFrequencyHz: 0,
    secondaryFrequencyHz: 0,
    secondaryMix: 0,
    frequencyJitter: 0,
    reducedVisualDepthScale: 0,
    reducedAudioDepthScale: 0,
    reducedVisualFloor: 1,
    reducedAudioFloor: 1,
    failure: null,
  }),
  microflicker: curve({
    visualMin: 0.976,
    visualMax: 1,
    audioMin: 0.989,
    audioMax: 1,
    primaryFrequencyHz: 7.1,
    secondaryFrequencyHz: 13.7,
    secondaryMix: 0.28,
    frequencyJitter: 0.08,
    reducedVisualDepthScale: 0.35,
    reducedAudioDepthScale: 0.35,
    reducedVisualFloor: 0.992,
    reducedAudioFloor: 0.996,
    failure: null,
  }),
  'slow-fluctuation': curve({
    visualMin: 0.79,
    visualMax: 1,
    audioMin: 0.87,
    audioMax: 1,
    primaryFrequencyHz: 0.11,
    secondaryFrequencyHz: 0.029,
    secondaryMix: 0.34,
    frequencyJitter: 0.12,
    reducedVisualDepthScale: 0.5,
    reducedAudioDepthScale: 0.55,
    reducedVisualFloor: 0.895,
    reducedAudioFloor: 0.925,
    failure: null,
  }),
  'intermittent-failure': curve({
    visualMin: 0.94,
    visualMax: 1,
    audioMin: 0.93,
    audioMax: 1,
    primaryFrequencyHz: 3.8,
    secondaryFrequencyHz: 8.3,
    secondaryMix: 0.24,
    frequencyJitter: 0.1,
    reducedVisualDepthScale: 0.2,
    reducedAudioDepthScale: 0.26,
    reducedVisualFloor: 0.78,
    reducedAudioFloor: 0.82,
    failure: {
      cycleSeconds: 7.25,
      eventChance: 0.42,
      holdSecondsMin: 0.28,
      holdSecondsMax: 0.72,
      attackSeconds: 0.11,
      releaseSeconds: 0.2,
      visualTargetMin: 0.08,
      visualTargetMax: 0.3,
      audioTargetMin: 0.16,
      audioTargetMax: 0.4,
    },
  }),
  off: curve({
    visualMin: 0,
    visualMax: 0,
    audioMin: 0,
    audioMax: 0,
    primaryFrequencyHz: 0,
    secondaryFrequencyHz: 0,
    secondaryMix: 0,
    frequencyJitter: 0,
    reducedVisualDepthScale: 0,
    reducedAudioDepthScale: 0,
    reducedVisualFloor: 0,
    reducedAudioFloor: 0,
    failure: null,
  }),
  exit: curve({
    visualMin: 0.84,
    visualMax: 1,
    audioMin: 0.75,
    audioMax: 0.96,
    primaryFrequencyHz: 0.38,
    secondaryFrequencyHz: 0.073,
    secondaryMix: 0.32,
    frequencyJitter: 0.06,
    reducedVisualDepthScale: 0.48,
    reducedAudioDepthScale: 0.52,
    reducedVisualFloor: 0.92,
    reducedAudioFloor: 0.86,
    failure: null,
  }),
});

export const lightingConfig = Object.freeze({
  flickerHashNamespace: 'threshold.fixture-flicker.v1',
  curves: fixtureFlickerCurves,
  blackoutOverride: Object.freeze({
    profile: 'off',
    enabled: false,
  } satisfies FixtureFlickerOverrideConfig),
  exitOverride: Object.freeze({
    profile: 'exit',
    enabled: true,
  } satisfies FixtureFlickerOverrideConfig),
});

interface FixtureFlickerOverrideConfig {
  readonly profile: FixtureFlickerProfile;
  readonly enabled: boolean;
}
