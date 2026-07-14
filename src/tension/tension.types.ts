import type { QualityPresetName } from '../config/rendering.config';

export const TENSION_PHASES = [
  'orientation',
  'monotony',
  'disorientation',
  'escalation',
  'resolution',
] as const;

export type TensionPhase = (typeof TENSION_PHASES)[number];

export const TENSION_EVENT_TYPES = [
  'light-dip',
  'silence',
  'blackout',
  'palette-shift',
  'repetition-echo',
  'layout-shift',
] as const;

export type TensionEventType = (typeof TENSION_EVENT_TYPES)[number];
export type TensionEventFamily = 'light' | 'audio' | 'visual' | 'repetition' | 'spatial';

export interface TensionEvent {
  readonly id: string;
  readonly type: TensionEventType;
  readonly family: TensionEventFamily;
  readonly targetRoomId: string;
  readonly startedAtSeconds: number;
  readonly endsAtSeconds: number;
  readonly roomSequence: number;
  readonly forced: boolean;
}

export interface TensionUpdateInput {
  readonly elapsedSeconds: number;
  readonly uniqueRooms: number;
  readonly currentRoomId: string | null;
  readonly currentDefinitionId: string | null;
  readonly currentDefinitionTags: readonly string[];
  readonly playerSpeed: number;
  readonly secondsSinceMovement: number;
  readonly quality: QualityPresetName;
  readonly reducedFlashing: boolean;
  readonly exitDistance: number | null;
  /** Loaded rooms that are outside every protected/visible set. */
  readonly layoutShiftCandidates: readonly string[];
}

export interface TensionSnapshot {
  readonly phase: TensionPhase;
  readonly intensity: number;
  readonly activeEvents: readonly TensionEvent[];
  readonly activeEventType: TensionEventType | null;
  readonly silenceFactor: number;
  readonly visualEffectStrength: number;
  readonly visualEffectPhase: number;
  readonly secondsWithoutVariation: number;
  readonly nextEventAtSeconds: number;
  readonly eventCount: number;
  readonly blackoutCount: number;
  readonly layoutShiftCount: number;
  readonly lastEventType: TensionEventType | null;
  readonly revision: number;
}

export interface TensionUpdateResult {
  readonly snapshot: TensionSnapshot;
  readonly startedEvents: readonly TensionEvent[];
  readonly endedEvents: readonly TensionEvent[];
}
