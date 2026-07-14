import type { Vector3Like } from '../procedural/procedural.types';
import { exitPresentationConfig } from './exit.presentation.config';
import type {
  ExitTransitionFrame,
  ExitTransitionSnapshot,
  ExitWallPlacement,
} from './exit.presentation.types';
import { normalizeExitWallPlacement, translateExitWallPlacement } from './ExitPlacement';

const EMPTY_SNAPSHOT: ExitTransitionSnapshot = Object.freeze({
  entered: false,
  insideSurface: false,
  insideActivationBand: false,
  crossedPlane: false,
  signedDistance: Number.POSITIVE_INFINITY,
  lateralDistance: Number.POSITIVE_INFINITY,
  approachSpeed: 0,
  facingAlignment: 0,
  approachSeconds: 0,
  activationProgress: 0,
});

function dotHorizontal(first: Vector3Like, second: Vector3Like): number {
  return first.x * second.x + first.z * second.z;
}

function normalizeHorizontal(vector: Vector3Like): Vector3Like | null {
  const length = Math.hypot(vector.x, vector.z);
  if (!Number.isFinite(length) || length <= Number.EPSILON) {
    return null;
  }
  return { x: vector.x / length, y: 0, z: vector.z / length };
}

function finiteDeltaSeconds(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError('Exit trigger deltaSeconds must be finite and non-negative.');
  }
  return Math.min(value, exitPresentationConfig.trigger.maximumDeltaSeconds);
}

/**
 * Pure swept-plane/contact trigger. It accepts desired velocity so the short
 * approach still completes when the room wall collider prevents actual motion.
 */
export class ExitTransitionTrigger {
  private placementValue: ExitWallPlacement;
  private approachSecondsValue = 0;
  private crossedPlaneValue = false;
  private enteredValue = false;
  private snapshotValue = EMPTY_SNAPSHOT;

  public constructor(placement: ExitWallPlacement) {
    this.placementValue = normalizeExitWallPlacement(placement);
    if (this.placementValue.width <= exitPresentationConfig.trigger.edgeInset * 2) {
      throw new RangeError('Exit surface is too narrow for its trigger edge inset.');
    }
  }

  public get placement(): ExitWallPlacement {
    return this.placementValue;
  }

  public get snapshot(): ExitTransitionSnapshot {
    return this.snapshotValue;
  }

  public update(frame: ExitTransitionFrame): ExitTransitionSnapshot {
    if (this.enteredValue) {
      return this.snapshotValue;
    }

    const deltaSeconds = finiteDeltaSeconds(frame.deltaSeconds);
    const { center, inwardNormal, width, height } = this.placementValue;
    const relative = {
      x: frame.position.x - center.x,
      y: frame.position.y - center.y,
      z: frame.position.z - center.z,
    };
    const previousRelative = {
      x: frame.previousPosition.x - center.x,
      y: frame.previousPosition.y - center.y,
      z: frame.previousPosition.z - center.z,
    };
    const signedDistance = dotHorizontal(relative, inwardNormal);
    const previousSignedDistance = dotHorizontal(previousRelative, inwardNormal);
    const lateral = { x: inwardNormal.z, y: 0, z: -inwardNormal.x };
    const lateralDistance = Math.abs(dotHorizontal(relative, lateral));
    const insideSurface =
      lateralDistance <= width / 2 - exitPresentationConfig.trigger.edgeInset &&
      Math.abs(relative.y) <= height / 2 + exitPresentationConfig.trigger.verticalTolerance;
    const insideActivationBand =
      signedDistance <= exitPresentationConfig.trigger.activationDistance &&
      signedDistance >= -exitPresentationConfig.trigger.rearTolerance;
    const crossedThisFrame = previousSignedDistance > 0 && signedDistance <= 0 && insideSurface;
    this.crossedPlaneValue ||= crossedThisFrame;

    const outwardNormal = {
      x: -inwardNormal.x,
      y: 0,
      z: -inwardNormal.z,
    };
    const approachSpeed = Math.max(0, dotHorizontal(frame.velocity, outwardNormal));
    const normalizedForward = normalizeHorizontal(frame.forward);
    const facingAlignment =
      normalizedForward === null ? 0 : dotHorizontal(normalizedForward, outwardNormal);
    const validApproach =
      insideSurface &&
      (insideActivationBand || this.crossedPlaneValue) &&
      approachSpeed >= exitPresentationConfig.trigger.minimumApproachSpeed &&
      facingAlignment >= exitPresentationConfig.trigger.minimumFacingAlignment;

    if (validApproach) {
      this.approachSecondsValue += deltaSeconds;
    } else {
      this.approachSecondsValue = Math.max(
        0,
        this.approachSecondsValue -
          deltaSeconds * exitPresentationConfig.trigger.invalidApproachDecay,
      );
      if (!insideSurface || signedDistance > exitPresentationConfig.trigger.activationDistance) {
        this.crossedPlaneValue = false;
      }
    }

    const activationProgress = Math.min(
      1,
      this.approachSecondsValue / exitPresentationConfig.trigger.minimumApproachSeconds,
    );
    this.enteredValue = activationProgress >= 1;
    this.snapshotValue = Object.freeze({
      entered: this.enteredValue,
      insideSurface,
      insideActivationBand,
      crossedPlane: this.crossedPlaneValue,
      signedDistance,
      lateralDistance,
      approachSpeed,
      facingAlignment,
      approachSeconds: this.approachSecondsValue,
      activationProgress,
    });
    return this.snapshotValue;
  }

  public translate(delta: Vector3Like): void {
    this.placementValue = translateExitWallPlacement(this.placementValue, delta);
  }

  public reset(): void {
    this.approachSecondsValue = 0;
    this.crossedPlaneValue = false;
    this.enteredValue = false;
    this.snapshotValue = EMPTY_SNAPSHOT;
  }
}
