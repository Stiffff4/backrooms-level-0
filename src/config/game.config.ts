export const gameConfig = {
  movement: {
    walkSpeed: 2.65,
    sprintSpeed: 4.55,
    acceleration: 11,
    // Stops in roughly 95 ms from a walk and 160 ms from a sprint. This keeps
    // the controller smooth without making wet carpet feel like ice.
    braking: 28,
    gravity: 18,
    eyeHeight: 1.7,
    colliderRadius: 0.36,
    colliderHeight: 1.72,
    groundContactGraceSeconds: 0.12,
    walkStepDistance: 1.2,
    sprintStepDistance: 1.42,
    headBobWalkAmplitude: 0.031,
    headBobSprintAmplitude: 0.048,
  },
  camera: {
    defaultFov: 80,
    minFov: 65,
    maxFov: 100,
    defaultSensitivity: 0.5,
  },
  world: {
    logicalRoomCount: 1024,
    activeGraphRadius: 3,
    preloadGraphRadius: 4,
    maxMaterializedRooms: 60,
    pooledRoomViews: 8,
    recentlyLeftProtectionSeconds: 4,
    floatingOriginThreshold: 240,
    fogStart: 16,
    fogEnd: 44,
  },
} as const;
