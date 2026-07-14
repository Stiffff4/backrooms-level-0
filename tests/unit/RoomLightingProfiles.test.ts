import { describe, expect, it } from 'vitest';

import { getRoomDefinitions } from '../../src/procedural/RoomCatalog';
import {
  getRoomLightingProfile,
  ROOM_LIGHTING_PROFILE_IDS,
  selectFixtureFlickerProfile,
} from '../../src/lighting/RoomLightingProfiles';

describe('RoomLightingProfiles', () => {
  it('cubre exhaustivamente los perfiles declarados por el catálogo de salas', () => {
    const catalogProfiles = [
      ...new Set(getRoomDefinitions().map((definition) => definition.lightingProfile)),
    ].sort();
    expect(catalogProfiles).toEqual([...ROOM_LIGHTING_PROFILE_IDS].sort());
    for (const id of catalogProfiles) {
      const resolved = getRoomLightingProfile(id);
      expect(resolved.proxyIntensity).toBeCloseTo(0.92, 6);
      expect(resolved.audioGain).toBeCloseTo(0.95, 6);
      expect(
        resolved.fixtureProfiles.reduce((total, entry) => total + entry.weight, 0),
      ).toBeCloseTo(1, 6);
    }
  });

  it('selecciona perfiles deterministas sin reservar exit ni apagar fixtures habilitados', () => {
    for (const id of ROOM_LIGHTING_PROFILE_IDS) {
      const first = Array.from({ length: 256 }, (_, seed) => selectFixtureFlickerProfile(id, seed));
      const repeated = Array.from({ length: 256 }, (_, seed) =>
        selectFixtureFlickerProfile(id, seed),
      );
      expect(repeated).toEqual(first);
      expect(first).not.toContain('exit');
      expect(first).not.toContain('off');
    }
  });

  it('rechaza IDs desconocidos en vez de aplicar un fallback silencioso', () => {
    expect(() => getRoomLightingProfile('missing-profile')).toThrow(
      /Unknown room lighting profile/,
    );
  });
});
