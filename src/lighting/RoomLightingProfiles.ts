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
  'arch-gallery',
  'pillar-hall',
  'low-ceiling',
  'high-ceiling',
  'damp-room',
  'light-failure',
  'blackout-edge',
  'repetition-room',
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

/**
 * Level 0's fixtures remain visibly powered. Most are perfectly steady and a
 * small deterministic subset performs a brief, shallow flicker without ever
 * reading as an extinguished tube.
 */
const uniformlyLit = [
  { profile: 'stable', weight: 0.95 },
  { profile: 'intermittent-failure', weight: 0.05 },
] as const;

export const roomLightingProfiles: Readonly<
  Record<RoomLightingProfileId, Readonly<RoomLightingProfile>>
> = Object.freeze({
  'corridor-standard': profile('corridor-standard', 0.92, 0.95, uniformlyLit),
  'corridor-wide': profile('corridor-wide', 0.92, 0.95, uniformlyLit),
  'corridor-long': profile('corridor-long', 0.92, 0.95, uniformlyLit),
  'corner-standard': profile('corner-standard', 0.92, 0.95, uniformlyLit),
  'offset-standard': profile('offset-standard', 0.92, 0.95, uniformlyLit),
  'junction-standard': profile('junction-standard', 0.92, 0.95, uniformlyLit),
  'junction-large': profile('junction-large', 0.92, 0.95, uniformlyLit),
  'room-small': profile('room-small', 0.92, 0.95, uniformlyLit),
  'standard-medium': profile('standard-medium', 0.92, 0.95, uniformlyLit),
  'room-large': profile('room-large', 0.92, 0.95, uniformlyLit),
  'dead-end': profile('dead-end', 0.92, 0.95, uniformlyLit),
  'double-offset': profile('double-offset', 0.92, 0.95, uniformlyLit),
  'arch-gallery': profile('arch-gallery', 0.92, 0.95, uniformlyLit),
  'pillar-hall': profile('pillar-hall', 0.92, 0.95, uniformlyLit),
  'low-ceiling': profile('low-ceiling', 0.92, 0.95, uniformlyLit),
  'high-ceiling': profile('high-ceiling', 0.92, 0.95, uniformlyLit),
  'damp-room': profile('damp-room', 0.92, 0.95, uniformlyLit),
  'light-failure': profile('light-failure', 0.92, 0.95, uniformlyLit),
  'blackout-edge': profile('blackout-edge', 0.92, 0.95, uniformlyLit),
  'repetition-room': profile('repetition-room', 0.92, 0.95, uniformlyLit),
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
