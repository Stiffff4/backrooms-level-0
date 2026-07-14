import { describe, expect, it } from 'vitest';

import {
  getRoomAudioProfile,
  ROOM_AUDIO_PROFILE_IDS,
  toAmbientProfile,
} from '../../src/audio/RoomAudioProfiles';
import { getRoomDefinitions } from '../../src/procedural/RoomCatalog';

describe('RoomAudioProfiles', () => {
  it('cubre exhaustivamente todos los audioProfile del catálogo', () => {
    const catalogIds = [
      ...new Set(getRoomDefinitions().map((definition) => definition.audioProfile)),
    ].sort();
    expect(catalogIds).toEqual([...ROOM_AUDIO_PROFILE_IDS].sort());
    for (const id of catalogIds) {
      const profile = getRoomAudioProfile(id);
      expect(profile.ambienceGain).toBeGreaterThanOrEqual(0);
      expect(profile.ambienceGain).toBeLessThanOrEqual(1);
      expect(profile.wetness).toBeGreaterThanOrEqual(0);
      expect(profile.wetness).toBeLessThanOrEqual(1);
      expect(toAmbientProfile(profile)).not.toHaveProperty('reverbPreset');
    }
  });

  it('rechaza perfiles desconocidos sin fallback silencioso', () => {
    expect(() => getRoomAudioProfile('unknown-room-audio')).toThrow(/Unknown room audio profile/);
  });
});
