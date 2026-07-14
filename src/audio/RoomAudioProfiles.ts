import type { AmbientProfile } from './AmbientDirector';

export const ROOM_AUDIO_PROFILE_IDS = [
  'narrow-office',
  'wide-office',
  'long-office',
  'corner-office',
  'offset-office',
  'junction-office',
  'junction-open',
  'small-office',
  'medium-office',
  'large-open-office',
  'dead-end-office',
] as const;

export type RoomAudioProfileId = (typeof ROOM_AUDIO_PROFILE_IDS)[number];

export const ROOM_REVERB_PRESETS = [
  'narrow-corridor',
  'medium-office',
  'large-room',
  'pillar-hall',
  'wet-blackout',
] as const;

export type RoomReverbPreset = (typeof ROOM_REVERB_PRESETS)[number];

export interface RoomAudioProfile extends AmbientProfile {
  readonly reverbPreset: RoomReverbPreset;
}

/**
 * The catalog is intentionally explicit: adding an audioProfile to RoomCatalog
 * must be accompanied by a tuned entry here and by the exhaustiveness test.
 */
export const ROOM_AUDIO_PROFILES: Readonly<Record<RoomAudioProfileId, RoomAudioProfile>> = {
  'narrow-office': {
    ambienceGain: 0.16,
    buzzBrightness: 0.4,
    humFrequencyOffset: 0.7,
    reverbPreset: 'narrow-corridor',
    wetness: 0.24,
    silenceFactor: 0.02,
  },
  'wide-office': {
    ambienceGain: 0.19,
    buzzBrightness: 0.48,
    humFrequencyOffset: -0.2,
    reverbPreset: 'medium-office',
    wetness: 0.3,
    silenceFactor: 0,
  },
  'long-office': {
    ambienceGain: 0.17,
    buzzBrightness: 0.43,
    humFrequencyOffset: -0.8,
    reverbPreset: 'narrow-corridor',
    wetness: 0.29,
    silenceFactor: 0.05,
  },
  'corner-office': {
    ambienceGain: 0.18,
    buzzBrightness: 0.44,
    humFrequencyOffset: 0.25,
    reverbPreset: 'narrow-corridor',
    wetness: 0.27,
    silenceFactor: 0.02,
  },
  'offset-office': {
    ambienceGain: 0.16,
    buzzBrightness: 0.39,
    humFrequencyOffset: 0.55,
    reverbPreset: 'medium-office',
    wetness: 0.35,
    silenceFactor: 0.06,
  },
  'junction-office': {
    ambienceGain: 0.2,
    buzzBrightness: 0.51,
    humFrequencyOffset: 0,
    reverbPreset: 'medium-office',
    wetness: 0.31,
    silenceFactor: 0,
  },
  'junction-open': {
    ambienceGain: 0.21,
    buzzBrightness: 0.56,
    humFrequencyOffset: -0.55,
    reverbPreset: 'pillar-hall',
    wetness: 0.38,
    silenceFactor: 0.01,
  },
  'small-office': {
    ambienceGain: 0.16,
    buzzBrightness: 0.38,
    humFrequencyOffset: 0.85,
    reverbPreset: 'medium-office',
    wetness: 0.21,
    silenceFactor: 0.03,
  },
  'medium-office': {
    ambienceGain: 0.2,
    buzzBrightness: 0.46,
    humFrequencyOffset: 0,
    reverbPreset: 'medium-office',
    wetness: 0.32,
    silenceFactor: 0,
  },
  'large-open-office': {
    ambienceGain: 0.23,
    buzzBrightness: 0.58,
    humFrequencyOffset: -1.2,
    reverbPreset: 'large-room',
    wetness: 0.43,
    silenceFactor: 0.01,
  },
  'dead-end-office': {
    ambienceGain: 0.1,
    buzzBrightness: 0.27,
    humFrequencyOffset: -1.6,
    reverbPreset: 'wet-blackout',
    wetness: 0.52,
    silenceFactor: 0.34,
  },
};

const ROOM_AUDIO_PROFILE_ID_SET: ReadonlySet<string> = new Set(ROOM_AUDIO_PROFILE_IDS);

export function isRoomAudioProfileId(value: string): value is RoomAudioProfileId {
  return ROOM_AUDIO_PROFILE_ID_SET.has(value);
}

export function getRoomAudioProfile(id: string): RoomAudioProfile {
  if (!isRoomAudioProfileId(id)) {
    throw new Error(`Unknown room audio profile: ${id}`);
  }
  return ROOM_AUDIO_PROFILES[id];
}

export function toAmbientProfile(profile: RoomAudioProfile): AmbientProfile {
  return {
    ambienceGain: profile.ambienceGain,
    buzzBrightness: profile.buzzBrightness,
    humFrequencyOffset: profile.humFrequencyOffset,
    wetness: profile.wetness,
    silenceFactor: profile.silenceFactor,
  };
}
