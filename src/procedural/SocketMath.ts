import type {
  QuarterTurn,
  RoomAabb,
  RoomDefinition,
  RoomSocket,
  SocketWorldPose,
  TransformData,
  Vector3Like,
} from './procedural.types';

const EPSILON = 1e-6;

export function normalizeQuarterTurn(value: number): QuarterTurn {
  const normalized = ((Math.round(value) % 4) + 4) % 4;
  return normalized as QuarterTurn;
}

function rotateQuarterTurn(vector: Vector3Like, quarterTurns: QuarterTurn): Vector3Like {
  switch (quarterTurns) {
    case 0:
      return { ...vector };
    case 1:
      return { x: vector.z, y: vector.y, z: -vector.x };
    case 2:
      return { x: -vector.x, y: vector.y, z: -vector.z };
    case 3:
      return { x: -vector.z, y: vector.y, z: vector.x };
  }
}

export function transformPoint(point: Vector3Like, transform: TransformData): Vector3Like {
  const rotated = rotateQuarterTurn(point, transform.rotationQuarterTurns);
  return {
    x: rotated.x + transform.position.x,
    y: rotated.y + transform.position.y,
    z: rotated.z + transform.position.z,
  };
}

export function transformDirection(
  direction: Vector3Like,
  rotationOrTransform: QuarterTurn | TransformData,
): Vector3Like {
  const quarterTurns =
    typeof rotationOrTransform === 'number'
      ? rotationOrTransform
      : rotationOrTransform.rotationQuarterTurns;
  return rotateQuarterTurn(direction, quarterTurns);
}

export function getSocketWorldPose(
  roomSocket: RoomSocket,
  transform: TransformData,
): SocketWorldPose {
  return {
    position: transformPoint(roomSocket.localPosition, transform),
    forward: transformDirection(roomSocket.localForward, transform),
    width: roomSocket.width,
    height: roomSocket.height,
  };
}

export function areSocketsCompatible(first: RoomSocket, second: RoomSocket): boolean {
  const dimensionsMatch =
    Math.abs(first.width - second.width) <= EPSILON &&
    Math.abs(first.height - second.height) <= EPSILON;
  if (!dimensionsMatch) {
    return false;
  }

  const firstPassageTags = first.tags.filter((tag) => tag.startsWith('passage:'));
  const secondPassageTags = second.tags.filter((tag) => tag.startsWith('passage:'));
  return (
    firstPassageTags.length === 0 ||
    secondPassageTags.length === 0 ||
    firstPassageTags.some((tag) => secondPassageTags.includes(tag))
  );
}

function vectorsNearlyEqual(first: Vector3Like, second: Vector3Like, epsilon: number): boolean {
  return (
    Math.abs(first.x - second.x) <= epsilon &&
    Math.abs(first.y - second.y) <= epsilon &&
    Math.abs(first.z - second.z) <= epsilon
  );
}

export function socketsAreAligned(
  first: SocketWorldPose,
  second: SocketWorldPose,
  epsilon = 1e-5,
): boolean {
  return (
    vectorsNearlyEqual(first.position, second.position, epsilon) &&
    vectorsNearlyEqual(
      first.forward,
      { x: -second.forward.x, y: -second.forward.y, z: -second.forward.z },
      epsilon,
    ) &&
    Math.abs(first.width - second.width) <= epsilon &&
    Math.abs(first.height - second.height) <= epsilon
  );
}

export function calculateAttachmentTransform(
  targetPose: SocketWorldPose,
  candidateSocket: RoomSocket,
): TransformData | null {
  const requiredForward = {
    x: -targetPose.forward.x,
    y: -targetPose.forward.y,
    z: -targetPose.forward.z,
  };

  for (const rotationQuarterTurns of [0, 1, 2, 3] as const) {
    const candidateForward = transformDirection(candidateSocket.localForward, rotationQuarterTurns);
    if (!vectorsNearlyEqual(candidateForward, requiredForward, EPSILON)) {
      continue;
    }

    const rotatedPosition = transformDirection(candidateSocket.localPosition, rotationQuarterTurns);
    return {
      position: {
        x: targetPose.position.x - rotatedPosition.x,
        y: targetPose.position.y - rotatedPosition.y,
        z: targetPose.position.z - rotatedPosition.z,
      },
      rotationQuarterTurns,
    };
  }

  return null;
}

export function computeRoomAabb(
  roomDefinition: RoomDefinition,
  transform: TransformData,
): RoomAabb {
  const halfWidth = roomDefinition.footprint.width / 2;
  const halfDepth = roomDefinition.footprint.depth / 2;
  const corners = [
    { x: -halfWidth, y: 0, z: -halfDepth },
    { x: halfWidth, y: 0, z: -halfDepth },
    { x: halfWidth, y: 0, z: halfDepth },
    { x: -halfWidth, y: 0, z: halfDepth },
  ].map((corner) => transformPoint(corner, transform));

  return {
    min: {
      x: Math.min(...corners.map((corner) => corner.x)),
      y: transform.position.y,
      z: Math.min(...corners.map((corner) => corner.z)),
    },
    max: {
      x: Math.max(...corners.map((corner) => corner.x)),
      y: transform.position.y + roomDefinition.footprint.height,
      z: Math.max(...corners.map((corner) => corner.z)),
    },
  };
}

export function roomAabbsOverlap(first: RoomAabb, second: RoomAabb, clearance = 1e-4): boolean {
  return (
    first.min.x < second.max.x - clearance &&
    first.max.x > second.min.x + clearance &&
    first.min.z < second.max.z - clearance &&
    first.max.z > second.min.z + clearance &&
    first.min.y < second.max.y - clearance &&
    first.max.y > second.min.y + clearance
  );
}
