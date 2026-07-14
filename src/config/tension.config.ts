export const tensionConfig = {
  phases: {
    orientationEndsAtSeconds: 120,
    monotonyEndsAtSeconds: 360,
    disorientationEndsAtSeconds: 600,
    escalationEndsAtSeconds: 960,
    resolutionEndsAtSeconds: 1_200,
  },
  scheduling: {
    firstEventDelaySeconds: [24, 44] as const,
    phaseIntervalsSeconds: {
      monotony: [30, 54] as const,
      disorientation: [24, 46] as const,
      escalation: [21, 40] as const,
      resolution: [20, 36] as const,
    },
    retryDelaySeconds: 6,
    maximumHistory: 96,
  },
  durationsSeconds: {
    'light-dip': [5.5, 9.5] as const,
    silence: [5, 8] as const,
    blackout: [5.5, 7.5] as const,
    'palette-shift': [9, 15] as const,
    'repetition-echo': [8, 13] as const,
    'layout-shift': [0, 0] as const,
  },
  cooldowns: {
    lightSeconds: [20, 45] as const,
    silenceSeconds: [90, 180] as const,
    visualSeconds: [45, 90] as const,
    repetitionSeconds: [300, 300] as const,
    spatialSeconds: [180, 360] as const,
    spatialRooms: [3, 6] as const,
  },
  effects: {
    silenceFactor: 0.94,
    blackoutSilenceFactor: 0.985,
    lightDipVisualScale: 0.58,
    lightDipAudioScale: 0.62,
    blackoutBeaconVisualScale: 0.3,
    reducedFlashingStrengthScale: 0.38,
  },
  limits: {
    activeTransientEvents: 1,
    blackoutPerSession: 1,
    layoutShiftsPerSession: 3,
  },
} as const;
