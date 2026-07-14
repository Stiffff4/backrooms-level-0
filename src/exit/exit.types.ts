export const EXIT_FORCE_REASONS = [
  'elapsed-limit',
  'room-limit',
  'late-rejections',
  'short-mode',
  'debug',
] as const;

export type ExitForceReason = (typeof EXIT_FORCE_REASONS)[number];
export type ExitManualForceReason = Extract<ExitForceReason, 'short-mode' | 'debug'>;

export const EXIT_CANDIDATE_REJECTION_REASONS = [
  'no-compatible-surface',
  'surface-too-small',
  'not-visible-from-approach',
  'reveal-distance-out-of-range',
  'insufficient-approach-space',
  'approach-path-blocked',
  'blackout-zone',
  'adjacent-to-spawn',
  'unreachable',
  'visually-exhausted',
  'dangerous-module',
  'not-navigable',
  'behind-player',
] as const;

export type ExitCandidateRejectionReason = (typeof EXIT_CANDIDATE_REJECTION_REASONS)[number];

export interface ExitProgressInput {
  readonly elapsedSeconds: number;
  readonly uniqueRooms: number;
  /** Explicit accessibility/short-session override. */
  readonly shortMode?: boolean;
}

/**
 * Renderer-independent facts about a newly created or revealed room surface.
 * A room must be submitted only when it is revealed; the director de-duplicates
 * by room id so repeated frames can never create additional probability rolls.
 */
export interface ExitCandidate {
  readonly roomId: string;
  readonly definitionId: string;
  readonly surfaceId: string | null;
  readonly roomDepth: number;
  readonly roomTags: readonly string[];
  readonly surfaceWidthMeters: number;
  readonly surfaceHeightMeters: number;
  readonly revealDistanceMeters: number;
  readonly approachDepthMeters: number;
  readonly visibleFromApproach: boolean;
  readonly approachPathClear: boolean;
  readonly reachable: boolean;
  readonly visuallyExhausted: boolean;
  readonly navigable: boolean;
  readonly behindPlayer: boolean;
}

export interface ExitReservation {
  readonly id: string;
  readonly candidateId: string;
  readonly roomId: string;
  readonly definitionId: string;
  readonly surfaceId: string;
  /** Stable visual/audio sub-seed; independent from world and tension streams. */
  readonly seed: number;
  readonly spawnedAtSeconds: number;
  readonly spawnedAtUniqueRooms: number;
  readonly probability: number;
  readonly roll: number | null;
  readonly forced: boolean;
  readonly forceReason: ExitForceReason | null;
  readonly protectFromStreaming: true;
  readonly protectFromLayoutShift: true;
}

export interface ExitSnapshot {
  readonly elapsedSeconds: number;
  readonly uniqueRooms: number;
  readonly eligible: boolean;
  readonly probability: number;
  readonly forcedPending: boolean;
  readonly forceReason: ExitForceReason | null;
  readonly exitSpawned: boolean;
  readonly reservation: ExitReservation | null;
  readonly consideredRoomCount: number;
  readonly validCandidateCount: number;
  readonly invalidCandidateCount: number;
  readonly probabilisticRejectionCount: number;
  readonly lateRejectionCount: number;
  readonly revision: number;
}

export type ExitCandidateDecisionStatus =
  'ineligible' | 'invalid' | 'duplicate' | 'rejected' | 'reserved' | 'already-spawned';

export interface ExitCandidateDecision {
  readonly status: ExitCandidateDecisionStatus;
  readonly candidateId: string;
  readonly probability: number;
  readonly roll: number | null;
  readonly rejectionReasons: readonly ExitCandidateRejectionReason[];
  readonly reservation: ExitReservation | null;
  readonly snapshot: ExitSnapshot;
}
