import type { Vector3Like } from '../procedural/procedural.types';
import type { ExitWallPlacement } from './exit.presentation.types';

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be finite.`);
  }
}

function copyFiniteVector(vector: Vector3Like, label: string): Vector3Like {
  assertFinite(vector.x, `${label}.x`);
  assertFinite(vector.y, `${label}.y`);
  assertFinite(vector.z, `${label}.z`);
  return { x: vector.x, y: vector.y, z: vector.z };
}

export function normalizeExitWallPlacement(placement: ExitWallPlacement): ExitWallPlacement {
  if (placement.roomId.trim().length === 0 || placement.surfaceId.trim().length === 0) {
    throw new Error('Exit placement roomId and surfaceId cannot be empty.');
  }
  assertFinite(placement.width, 'exit placement width');
  assertFinite(placement.height, 'exit placement height');
  if (placement.width <= 0 || placement.height <= 0) {
    throw new RangeError('Exit placement dimensions must be positive.');
  }

  const center = copyFiniteVector(placement.center, 'exit placement center');
  const sourceNormal = copyFiniteVector(placement.inwardNormal, 'exit placement inwardNormal');
  const horizontalLength = Math.hypot(sourceNormal.x, sourceNormal.z);
  if (horizontalLength <= Number.EPSILON || Math.abs(sourceNormal.y) > 1e-4) {
    throw new RangeError('Exit placement inwardNormal must be a horizontal non-zero vector.');
  }

  return Object.freeze({
    ...placement,
    center: Object.freeze(center),
    inwardNormal: Object.freeze({
      x: sourceNormal.x / horizontalLength,
      y: 0,
      z: sourceNormal.z / horizontalLength,
    }),
  });
}

export function translateExitWallPlacement(
  placement: ExitWallPlacement,
  delta: Vector3Like,
): ExitWallPlacement {
  const finiteDelta = copyFiniteVector(delta, 'exit placement translation');
  return Object.freeze({
    ...placement,
    center: Object.freeze({
      x: placement.center.x + finiteDelta.x,
      y: placement.center.y + finiteDelta.y,
      z: placement.center.z + finiteDelta.z,
    }),
  });
}

/**
 * Moves a nominal room-boundary placement onto the visible interior face of
 * the room wall. Room catalog exit surfaces live on the logical footprint
 * boundary, while rendered walls extend inward by their full thickness.
 */
export function insetExitWallPlacement(
  placement: ExitWallPlacement,
  inwardDistance: number,
): ExitWallPlacement {
  const normalized = normalizeExitWallPlacement(placement);
  assertFinite(inwardDistance, 'exit placement inwardDistance');
  if (inwardDistance < 0) {
    throw new RangeError('Exit placement inwardDistance must be non-negative.');
  }
  return Object.freeze({
    ...normalized,
    center: Object.freeze({
      x: normalized.center.x + normalized.inwardNormal.x * inwardDistance,
      y: normalized.center.y + normalized.inwardNormal.y * inwardDistance,
      z: normalized.center.z + normalized.inwardNormal.z * inwardDistance,
    }),
  });
}
