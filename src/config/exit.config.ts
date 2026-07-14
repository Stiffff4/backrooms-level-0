export interface ExitDirectorConfig {
  readonly eligibility: {
    readonly minimumElapsedSeconds: number;
    readonly minimumUniqueRooms: number;
  };
  readonly probability: {
    readonly initialChance: number;
    readonly chancePerMinuteAfterEligibility: number;
    readonly uniqueRoomsPerStep: number;
    readonly chancePerRoomStep: number;
    readonly maximumChancePerCandidate: number;
  };
  readonly guarantee: {
    readonly forceElapsedSeconds: number;
    readonly forceUniqueRooms: number;
    readonly lateRejectionsStartSeconds: number;
    readonly maximumLateRejections: number;
  };
  readonly candidate: {
    readonly minimumSurfaceWidthMeters: number;
    readonly minimumSurfaceHeightMeters: number;
    readonly minimumApproachDepthMeters: number;
    readonly maximumRevealDistanceMeters: number;
    readonly minimumRoomDepthFromSpawn: number;
  };
}

export const exitConfig: ExitDirectorConfig = {
  eligibility: {
    minimumElapsedSeconds: 6 * 60,
    minimumUniqueRooms: 30,
  },
  probability: {
    initialChance: 0.02,
    chancePerMinuteAfterEligibility: 0.007,
    uniqueRoomsPerStep: 10,
    chancePerRoomStep: 0.003,
    maximumChancePerCandidate: 0.16,
  },
  guarantee: {
    forceElapsedSeconds: 18 * 60,
    forceUniqueRooms: 120,
    lateRejectionsStartSeconds: 15 * 60,
    maximumLateRejections: 5,
  },
  candidate: {
    minimumSurfaceWidthMeters: 2.2,
    minimumSurfaceHeightMeters: 2.3,
    minimumApproachDepthMeters: 1.4,
    maximumRevealDistanceMeters: 24,
    minimumRoomDepthFromSpawn: 2,
  },
};
