import type { AudioVolumeMap } from '../audio/audio.types';

/** Balance values live here so later audio directors do not hide tuning in classes. */
export const audioConfig = {
  defaultVolumes: {
    master: 0.82,
    ambience: 0.78,
    lights: 0.8,
    footsteps: 0.76,
    events: 0.88,
    ui: 0.72,
  } satisfies AudioVolumeMap,
  limiter: {
    thresholdDb: -3,
    kneeDb: 6,
    ratio: 20,
    attackSeconds: 0.003,
    releaseSeconds: 0.25,
  },
  ramps: {
    volumeSeconds: 0.04,
    pauseSeconds: 0.12,
    focusSeconds: 0.08,
  },
  muteOnFocusLoss: true,
  listenerUp: {
    x: 0,
    y: 1,
    z: 0,
  },
} as const;
