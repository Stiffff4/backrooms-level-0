import type { Vector3Like } from '../procedural/procedural.types';
import type {
  FloatingOriginConfig,
  FloatingOriginMetrics,
  FloatingOriginRebase,
  FloatingOriginReset,
} from './world.types';

export const DEFAULT_FLOATING_ORIGIN_CONFIG: Readonly<FloatingOriginConfig> = Object.freeze({
  rebaseThreshold: 240,
});

function copyVector(vector: Vector3Like): Vector3Like {
  return { x: vector.x, y: vector.y, z: vector.z };
}

function freezeVector(vector: Vector3Like): Vector3Like {
  return Object.freeze(copyVector(vector));
}

function assertFiniteVector(vector: Vector3Like, label: string): void {
  if (![vector.x, vector.y, vector.z].every(Number.isFinite)) {
    throw new Error(`${label} must contain only finite coordinates.`);
  }
}

export function applyWorldDelta(position: Vector3Like, delta: Vector3Like): Vector3Like {
  return {
    x: position.x + delta.x,
    y: position.y + delta.y,
    z: position.z + delta.z,
  };
}

export class FloatingOrigin {
  private readonly configValue: Readonly<FloatingOriginConfig>;
  private offset: Vector3Like = { x: 0, y: 0, z: 0 };
  private metricsSnapshot: FloatingOriginMetrics;

  public constructor(config: Partial<FloatingOriginConfig> = {}) {
    const resolved = { ...DEFAULT_FLOATING_ORIGIN_CONFIG, ...config };
    if (!Number.isFinite(resolved.rebaseThreshold) || resolved.rebaseThreshold <= 0) {
      throw new Error('rebaseThreshold must be a positive finite number.');
    }
    this.configValue = Object.freeze(resolved);
    this.metricsSnapshot = Object.freeze({
      rebaseCount: 0,
      totalShiftDistance: 0,
      lastRebaseDistance: 0,
      originOffset: freezeVector(this.offset),
    });
  }

  public get config(): Readonly<FloatingOriginConfig> {
    return this.configValue;
  }

  public get originOffset(): Vector3Like {
    return copyVector(this.offset);
  }

  public get metrics(): FloatingOriginMetrics {
    return this.metricsSnapshot;
  }

  public shouldRebase(playerLocalPosition: Vector3Like): boolean {
    assertFiniteVector(playerLocalPosition, 'playerLocalPosition');
    return (
      Math.hypot(playerLocalPosition.x, playerLocalPosition.z) >= this.configValue.rebaseThreshold
    );
  }

  public update(playerLocalPosition: Vector3Like): FloatingOriginRebase | null {
    assertFiniteVector(playerLocalPosition, 'playerLocalPosition');
    const distanceBefore = Math.hypot(playerLocalPosition.x, playerLocalPosition.z);
    if (distanceBefore < this.configValue.rebaseThreshold) {
      return null;
    }

    const previousOriginOffset = copyVector(this.offset);
    const horizontalDisplacement = {
      x: playerLocalPosition.x,
      y: 0,
      z: playerLocalPosition.z,
    };
    const worldDelta = {
      x: -horizontalDisplacement.x,
      y: 0,
      z: -horizontalDisplacement.z,
    };
    this.offset = applyWorldDelta(this.offset, horizontalDisplacement);
    const playerLocalAfter = applyWorldDelta(playerLocalPosition, worldDelta);
    const sequence = this.metricsSnapshot.rebaseCount + 1;
    this.metricsSnapshot = Object.freeze({
      rebaseCount: sequence,
      totalShiftDistance: this.metricsSnapshot.totalShiftDistance + distanceBefore,
      lastRebaseDistance: distanceBefore,
      originOffset: freezeVector(this.offset),
    });

    return Object.freeze({
      sequence,
      threshold: this.configValue.rebaseThreshold,
      distanceBefore,
      worldDelta: freezeVector(worldDelta),
      playerLocalBefore: freezeVector(playerLocalPosition),
      playerLocalAfter: freezeVector(playerLocalAfter),
      previousOriginOffset: freezeVector(previousOriginOffset),
      originOffset: freezeVector(this.offset),
    });
  }

  /**
   * Restores local coordinates to the original logical frame. Apply the
   * returned delta to every active world node and to the player in one frame.
   */
  public reset(): FloatingOriginReset {
    const previousOriginOffset = copyVector(this.offset);
    const worldDelta = copyVector(previousOriginOffset);
    this.offset = { x: 0, y: 0, z: 0 };
    this.metricsSnapshot = Object.freeze({
      rebaseCount: 0,
      totalShiftDistance: 0,
      lastRebaseDistance: 0,
      originOffset: freezeVector(this.offset),
    });
    return Object.freeze({
      worldDelta: freezeVector(worldDelta),
      previousOriginOffset: freezeVector(previousOriginOffset),
      originOffset: freezeVector(this.offset),
    });
  }

  public logicalToLocal(logicalPosition: Vector3Like): Vector3Like {
    assertFiniteVector(logicalPosition, 'logicalPosition');
    return {
      x: logicalPosition.x - this.offset.x,
      y: logicalPosition.y - this.offset.y,
      z: logicalPosition.z - this.offset.z,
    };
  }

  public localToLogical(localPosition: Vector3Like): Vector3Like {
    assertFiniteVector(localPosition, 'localPosition');
    return {
      x: localPosition.x + this.offset.x,
      y: localPosition.y + this.offset.y,
      z: localPosition.z + this.offset.z,
    };
  }
}
