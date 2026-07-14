import { describe, expect, it } from 'vitest';

import { exitConfig } from '../../src/config/exit.config';
import { ExitDirector, getExitCandidateRejectionReasons } from '../../src/exit/ExitDirector';
import type { ExitCandidate, ExitReservation } from '../../src/exit/exit.types';

const SIMULATION_COUNT = 1_000;
const ROOM_INTERVAL_SECONDS = 11;

function candidate(seedIndex: number, roomSequence: number): ExitCandidate {
  const lacksSurface = (seedIndex + roomSequence * 3) % 11 === 0;
  const blackout = (seedIndex * 5 + roomSequence) % 23 === 0;
  const dangerous = (seedIndex + roomSequence * 7) % 37 === 0;
  const blocked = (seedIndex * 3 + roomSequence) % 29 === 0;
  const exhausted = (seedIndex + roomSequence * 13) % 41 === 0;
  const behind = (seedIndex * 11 + roomSequence) % 43 === 0;
  return {
    roomId: `room-${String(roomSequence).padStart(4, '0')}`,
    definitionId: blackout ? 'blackout_edge' : 'room_medium_rect',
    surfaceId: lacksSurface ? null : 'north-wall-left',
    roomDepth: roomSequence,
    roomTags: [
      'exit-candidate',
      ...(blackout ? ['blackout'] : []),
      ...(dangerous ? ['dangerous'] : []),
    ],
    surfaceWidthMeters: 2.6,
    surfaceHeightMeters: 2.45,
    revealDistanceMeters: 6 + ((seedIndex + roomSequence) % 9),
    approachDepthMeters: 2.8,
    visibleFromApproach: true,
    approachPathClear: !blocked,
    reachable: true,
    visuallyExhausted: exhausted,
    navigable: true,
    behindPlayer: behind,
  };
}

interface SimulationResult {
  readonly reservation: ExitReservation;
  readonly firstSafeCandidateAfterGuaranteeSeconds: number;
  readonly firstSafeCandidateAfterGuaranteeRooms: number;
  readonly finalSnapshotSignature: string;
}

function invariantFailure(seed: string, message: string): never {
  throw new Error(`[seed=${seed}] ${message}`);
}

function simulate(seedIndex: number): SimulationResult {
  const seed = `exit-property-${seedIndex}`;
  const director = new ExitDirector(seed);
  let firstSafeCandidateAfterGuaranteeSeconds = Number.POSITIVE_INFINITY;
  let firstSafeCandidateAfterGuaranteeRooms = Number.POSITIVE_INFINITY;
  let reservedCandidate: ExitCandidate | null = null;
  for (let roomSequence = 1; roomSequence <= 140; roomSequence += 1) {
    const elapsedSeconds = roomSequence * ROOM_INTERVAL_SECONDS + (seedIndex % 7);
    const nextCandidate = candidate(seedIndex, roomSequence);
    if (
      elapsedSeconds >= exitConfig.guarantee.forceElapsedSeconds &&
      getExitCandidateRejectionReasons(nextCandidate).length === 0
    ) {
      firstSafeCandidateAfterGuaranteeSeconds = elapsedSeconds;
      firstSafeCandidateAfterGuaranteeRooms = roomSequence;
      break;
    }
  }
  try {
    for (let roomSequence = 1; roomSequence <= 140; roomSequence += 1) {
      const elapsedSeconds = roomSequence * ROOM_INTERVAL_SECONDS + (seedIndex % 7);
      const nextCandidate = candidate(seedIndex, roomSequence);

      const decision = director.considerCandidate(
        { elapsedSeconds, uniqueRooms: roomSequence },
        nextCandidate,
      );
      if (decision.reservation !== null) {
        reservedCandidate = nextCandidate;
        break;
      }
    }

    const reservation = director.current.reservation;
    if (reservation === null || reservedCandidate === null) {
      return invariantFailure(seed, 'exit was not reserved during the bounded traversal');
    }
    if (!Number.isFinite(firstSafeCandidateAfterGuaranteeSeconds)) {
      return invariantFailure(seed, 'simulation did not produce a safe post-guarantee candidate');
    }
    if (
      !reservation.forced &&
      (reservation.spawnedAtSeconds < exitConfig.eligibility.minimumElapsedSeconds ||
        reservation.spawnedAtUniqueRooms < exitConfig.eligibility.minimumUniqueRooms)
    ) {
      return invariantFailure(seed, 'probabilistic exit appeared before both minimums');
    }
    if (
      reservation.spawnedAtSeconds > firstSafeCandidateAfterGuaranteeSeconds ||
      reservation.spawnedAtUniqueRooms > firstSafeCandidateAfterGuaranteeRooms
    ) {
      return invariantFailure(seed, 'exit missed the first safe candidate after hard guarantee');
    }
    if (getExitCandidateRejectionReasons(reservedCandidate).length > 0) {
      return invariantFailure(seed, 'exit was reserved on an invalid candidate');
    }
    if (
      !reservation.protectFromStreaming ||
      !reservation.protectFromLayoutShift ||
      reservedCandidate.roomTags.includes('blackout') ||
      !reservedCandidate.reachable ||
      !reservedCandidate.navigable
    ) {
      return invariantFailure(seed, 'reserved exit is not protected and reachable');
    }

    return {
      reservation,
      firstSafeCandidateAfterGuaranteeSeconds,
      firstSafeCandidateAfterGuaranteeRooms,
      finalSnapshotSignature: JSON.stringify(director.current),
    };
  } finally {
    director.dispose();
  }
}

describe('ExitDirector property sweep', () => {
  it(`cumple invariantes y determinismo en ${SIMULATION_COUNT.toLocaleString('en-US')} simulaciones`, () => {
    let probabilisticExits = 0;
    let forcedExits = 0;
    for (let seedIndex = 0; seedIndex < SIMULATION_COUNT; seedIndex += 1) {
      const first = simulate(seedIndex);
      const repeated = simulate(seedIndex);
      const message = `seed=exit-property-${seedIndex}`;
      expect(repeated.reservation, message).toEqual(first.reservation);
      expect(repeated.finalSnapshotSignature, message).toBe(first.finalSnapshotSignature);
      expect(first.reservation.spawnedAtSeconds, message).toBeLessThanOrEqual(
        first.firstSafeCandidateAfterGuaranteeSeconds,
      );
      expect(first.reservation.spawnedAtUniqueRooms, message).toBeLessThanOrEqual(
        first.firstSafeCandidateAfterGuaranteeRooms,
      );
      if (first.reservation.forced) forcedExits += 1;
      else probabilisticExits += 1;
    }
    expect(probabilisticExits).toBeGreaterThan(0);
    expect(forcedExits).toBeGreaterThan(0);
    expect(probabilisticExits + forcedExits).toBe(SIMULATION_COUNT);
  }, 30_000);
});
