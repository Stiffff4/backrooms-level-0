export const FIXTURE_FLICKER_PROFILES = [
  'stable',
  'microflicker',
  'slow-fluctuation',
  'intermittent-failure',
  'off',
  'exit',
] as const;

export type FixtureFlickerProfile = (typeof FIXTURE_FLICKER_PROFILES)[number];

export type FixtureFlickerSeed = string | number;

export interface FixtureFlickerDescriptor {
  readonly id: string;
  readonly roomId: string;
  readonly profile: FixtureFlickerProfile;
  readonly enabled: boolean;
  readonly seed: FixtureFlickerSeed;
}

/**
 * A room override establishes a shared policy; a fixture override replaces its
 * profile/enabled fields and multiplies its intensity scales afterwards.
 */
export interface FixtureFlickerOverride {
  readonly profile?: FixtureFlickerProfile;
  readonly enabled?: boolean;
  readonly visualScale?: number;
  readonly audioScale?: number;
}

export type FixtureFlickerOverrideScope = 'none' | 'room' | 'fixture' | 'room-and-fixture';

export interface FixtureFlickerSample {
  readonly id: string;
  readonly roomId: string;
  readonly sourceProfile: FixtureFlickerProfile;
  readonly effectiveProfile: FixtureFlickerProfile;
  readonly enabled: boolean;
  readonly visualIntensity: number;
  readonly audioIntensity: number;
  readonly failureActive: boolean;
  /** Stable identity for a deterministic failure window, used to deduplicate audio cues. */
  readonly eventId: string | null;
  readonly reducedFlashingApplied: boolean;
  readonly overrideScope: FixtureFlickerOverrideScope;
}

export interface FixtureFlickerSyncResult {
  readonly added: number;
  readonly updated: number;
  readonly removed: number;
  readonly unchanged: number;
  readonly total: number;
}

export interface FixtureFlickerMetrics {
  readonly fixtureCount: number;
  readonly enabledFixtureCount: number;
  readonly roomCount: number;
  readonly fixtureOverrideCount: number;
  readonly roomOverrideCount: number;
  readonly sampleCount: number;
  readonly lastAbsoluteTimeSeconds: number | null;
  readonly lastEvaluationFixtureCount: number;
  readonly revision: number;
  readonly reducedFlashing: boolean;
  readonly disposed: boolean;
}

export interface FixtureFlickerControllerOptions {
  readonly reducedFlashing?: boolean;
}
