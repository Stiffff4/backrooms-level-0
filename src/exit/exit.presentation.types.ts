import type { SeedInput, Vector3Like } from '../procedural/procedural.types';

/**
 * Renderer-neutral description of a reserved exit surface in the current
 * floating-origin coordinate system. The normal always points into the room.
 */
export interface ExitWallPlacement {
  readonly roomId: string;
  readonly surfaceId: string;
  readonly center: Vector3Like;
  readonly inwardNormal: Vector3Like;
  readonly width: number;
  readonly height: number;
  readonly seed: SeedInput;
}

export interface ExitWallVisualSample {
  readonly elapsedSeconds: number;
  readonly lightResponse: number;
  readonly emissiveStrength: number;
  readonly glitchStrength: number;
  readonly proximity: number;
  readonly transitionProgress: number;
  readonly reducedFlashingApplied: boolean;
}

export interface ExitTransitionFrame {
  readonly previousPosition: Vector3Like;
  readonly position: Vector3Like;
  readonly forward: Vector3Like;
  /** Desired horizontal velocity; it may remain non-zero while a wall collider blocks movement. */
  readonly velocity: Vector3Like;
  readonly deltaSeconds: number;
}

export interface ExitTransitionSnapshot {
  readonly entered: boolean;
  readonly insideSurface: boolean;
  readonly insideActivationBand: boolean;
  readonly crossedPlane: boolean;
  readonly signedDistance: number;
  readonly lateralDistance: number;
  readonly approachSpeed: number;
  readonly facingAlignment: number;
  readonly approachSeconds: number;
  readonly activationProgress: number;
}

export interface ExitAudioBeaconRuntime {
  readonly context: AudioContext;
  readonly destination: AudioNode;
  /** Optional GameAudioEngine hook so debug node counts include this bounded graph. */
  readonly registerNode?: (node: AudioNode) => () => void;
}

export interface ExitAudioBeaconSnapshot {
  readonly active: boolean;
  readonly disposed: boolean;
  readonly nodeCount: number;
  readonly distance: number;
  readonly modulation: number;
  readonly phaseCancellation: number;
  readonly transitionPlayed: boolean;
  readonly reducedFlashing: boolean;
}
