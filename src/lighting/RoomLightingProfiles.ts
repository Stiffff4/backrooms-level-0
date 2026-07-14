import { deriveSeed } from '../procedural/SeedBank';
import type { FixtureFlickerProfile } from './lighting.types';

export const ROOM_LIGHTING_PROFILE_IDS = [
  'corridor-standard',
  'corridor-wide',
  'corridor-long',
  'corner-standard',
  'offset-standard',
  'junction-standard',
  'junction-large',
  'room-small',
  'standard-medium',
  'room-large',
  'dead-end',
  'double-offset',
] as const;

export type RoomLightingProfileId = (typeof ROOM_LIGHTING_PROFILE_IDS)[number];

interface WeightedFixtureProfile {
  readonly profile: Exclude<FixtureFlickerProfile, 'off' | 'exit'>;
  readonly weight: number;
}

export interface RoomLightingProfile {
  readonly id: RoomLightingProfileId;
  readonly proxyIntensity: number;
  readonly audioGain: number;
  readonly fixtureProfiles: readonly WeightedFixtureProfile[];
}

function profile(
  id: RoomLightingProfileId,
  proxyIntensity: number,
  audioGain: number,
  fixtureProfiles: readonly WeightedFixtureProfile[],
): Readonly<RoomLightingProfile> {
  const totalWeight = fixtureProfiles.reduce((total, entry) => total + entry.weight, 0);
  if (Math.abs(totalWeight - 1) > 0.000_001) {
    throw new Error(`Room lighting profile ${id} weights must add up to one.`);
  }
  return Object.freeze({
    id,
    proxyIntensity,
    audioGain,
    fixtureProfiles: Object.freeze(fixtureProfiles.map((entry) => Object.freeze({ ...entry }))),
  });
}

const mostlyStable = [
  { profile: 'stable', weight: 0.72 },
  { profile: 'microflicker', weight: 0.24 },
  { profile: 'slow-fluctuation', weight: 0.04 },
] as const;

const subtlyUnstable = [
  { profile: 'stable', weight: 0.52 },
  { profile: 'microflicker', weight: 0.35 },
  { profile: 'slow-fluctuation', weight: 0.12 },
  { profile: 'intermittent-failure', weight: 0.01 },
] as const;

const noticeablyUnstable = [
  { profile: 'stable', weight: 0.35 },
  { profile: 'microflicker', weight: 0.34 },
  { profile: 'slow-fluctuation', weight: 0.24 },
  { profile: 'intermittent-failure', weight: 0.07 },
] as const;

export const roomLightingProfiles: Readonly<
  Record<RoomLightingProfileId, Readonly<RoomLightingProfile>>
> = Object.freeze({
  'corridor-standard': profile('corridor-standard', 0.82, 0.9, mostlyStable),
  'corridor-wide': profile('corridor-wide', 0.86, 0.94, subtlyUnstable),
  'corridor-long': profile('corridor-long', 0.88, 0.96, subtlyUnstable),
  'corner-standard': profile('corner-standard', 0.8, 0.9, mostlyStable),
  'offset-standard': profile('offset-standard', 0.78, 0.88, subtlyUnstable),
  'junction-standard': profile('junction-standard', 0.9, 0.98, mostlyStable),
  'junction-large': profile('junction-large', 0.94, 1, subtlyUnstable),
  'room-small': profile('room-small', 0.76, 0.86, subtlyUnstable),
  'standard-medium': profile('standard-medium', 0.84, 0.92, mostlyStable),
  'room-large': profile('room-large', 0.96, 1, subtlyUnstable),
  'dead-end': profile('dead-end', 0.7, 0.8, noticeablyUnstable),
  'double-offset': profile('double-offset', 0.8, 0.9, subtlyUnstable),
});

export function isRoomLightingProfileId(value: string): value is RoomLightingProfileId {
  return Object.hasOwn(roomLightingProfiles, value);
}

export function getRoomLightingProfile(id: string): Readonly<RoomLightingProfile> {
  if (!isRoomLightingProfileId(id)) {
    throw new Error(`Unknown room lighting profile: ${id}`);
  }
  return roomLightingProfiles[id];
}

export function selectFixtureFlickerProfile(
  roomProfileId: string,
  fixtureSeed: string | number,
): FixtureFlickerProfile {
  const roomProfile = getRoomLightingProfile(roomProfileId);
  const unit = deriveSeed(fixtureSeed, roomProfile.id, 'fixture-profile') / 0x1_0000_0000;
  let cumulative = 0;
  for (const weighted of roomProfile.fixtureProfiles) {
    cumulative += weighted.weight;
    if (unit < cumulative) {
      return weighted.profile;
    }
  }
  return roomProfile.fixtureProfiles.at(-1)?.profile ?? 'stable';
}
