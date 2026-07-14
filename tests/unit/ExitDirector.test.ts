import { describe, expect, it } from 'vitest';

import { exitConfig, type ExitDirectorConfig } from '../../src/config/exit.config';
import {
  calculateExitProbability,
  ExitDirector,
  getExitCandidateRejectionReasons,
  isExitEligible,
} from '../../src/exit/ExitDirector';
import type { ExitCandidate } from '../../src/exit/exit.types';

function candidate(roomSequence: number, changes: Partial<ExitCandidate> = {}): ExitCandidate {
  return {
    roomId: `room-${String(roomSequence).padStart(4, '0')}`,
    definitionId: 'room_medium_rect',
    surfaceId: 'north-wall-left',
    roomDepth: roomSequence,
    roomTags: ['common', 'stable', 'exit-candidate'],
    surfaceWidthMeters: 2.6,
    surfaceHeightMeters: 2.45,
    revealDistanceMeters: 7,
    approachDepthMeters: 3.2,
    visibleFromApproach: true,
    approachPathClear: true,
    reachable: true,
    visuallyExhausted: false,
    navigable: true,
    behindPlayer: false,
    ...changes,
  };
}

function withChance(chance: number): ExitDirectorConfig {
  return {
    ...exitConfig,
    probability: {
      ...exitConfig.probability,
      initialChance: chance,
      chancePerMinuteAfterEligibility: 0,
      chancePerRoomStep: 0,
      maximumChancePerCandidate: chance,
    },
  };
}

describe('ExitDirector', () => {
  it('exige tiempo y exploración mínimos y calcula la curva configurada', () => {
    expect(isExitEligible({ elapsedSeconds: 359, uniqueRooms: 30 })).toBe(false);
    expect(isExitEligible({ elapsedSeconds: 360, uniqueRooms: 29 })).toBe(false);
    expect(isExitEligible({ elapsedSeconds: 360, uniqueRooms: 30 })).toBe(true);
    expect(calculateExitProbability({ elapsedSeconds: 359, uniqueRooms: 30 })).toBe(0);
    expect(calculateExitProbability({ elapsedSeconds: 360, uniqueRooms: 30 })).toBeCloseTo(0.02);
    expect(calculateExitProbability({ elapsedSeconds: 420, uniqueRooms: 40 })).toBeCloseTo(0.03);
    expect(calculateExitProbability({ elapsedSeconds: 3_600, uniqueRooms: 500 })).toBe(0.16);
  });

  it('evalúa cada habitación una vez y nunca reevalúa candidatos prematuros', () => {
    const director = new ExitDirector('no-premature-exit', withChance(1));
    try {
      const premature = director.considerCandidate(
        { elapsedSeconds: 300, uniqueRooms: 29 },
        candidate(29),
      );
      expect(premature.status).toBe('ineligible');
      expect(premature.roll).toBeNull();
      expect(premature.snapshot.exitSpawned).toBe(false);

      const duplicate = director.considerCandidate(
        { elapsedSeconds: 360, uniqueRooms: 30 },
        candidate(29),
      );
      expect(duplicate.status).toBe('duplicate');
      expect(duplicate.snapshot.exitSpawned).toBe(false);

      const eligible = director.considerCandidate(
        { elapsedSeconds: 361, uniqueRooms: 31 },
        candidate(31),
      );
      expect(eligible.status).toBe('reserved');
      expect(eligible.reservation?.forced).toBe(false);
    } finally {
      director.dispose();
    }
  });

  it('rechaza superficies inseguras, agotadas, oscuras o inalcanzables', () => {
    const invalid = candidate(40, {
      surfaceId: null,
      roomTags: ['blackout', 'dangerous'],
      surfaceWidthMeters: 1,
      surfaceHeightMeters: 1,
      revealDistanceMeters: 30,
      approachDepthMeters: 0.5,
      visibleFromApproach: false,
      approachPathClear: false,
      reachable: false,
      visuallyExhausted: true,
      navigable: false,
      behindPlayer: true,
    });
    expect(getExitCandidateRejectionReasons(invalid)).toEqual([
      'no-compatible-surface',
      'surface-too-small',
      'not-visible-from-approach',
      'reveal-distance-out-of-range',
      'insufficient-approach-space',
      'approach-path-blocked',
      'blackout-zone',
      'unreachable',
      'visually-exhausted',
      'dangerous-module',
      'not-navigable',
      'behind-player',
    ]);

    const director = new ExitDirector('invalid-candidates', withChance(1));
    try {
      const decision = director.considerCandidate(
        { elapsedSeconds: 600, uniqueRooms: 40 },
        invalid,
      );
      expect(decision.status).toBe('invalid');
      expect(decision.snapshot.invalidCandidateCount).toBe(1);
      expect(decision.snapshot.validCandidateCount).toBe(0);
      expect(decision.snapshot.exitSpawned).toBe(false);
    } finally {
      director.dispose();
    }
  });

  it('consume RNG solo por candidato apto nuevo y conserva determinismo', () => {
    const first = new ExitDirector('roll-isolation', withChance(0));
    const second = new ExitDirector('roll-isolation', withChance(0));
    try {
      const progress = { elapsedSeconds: 600, uniqueRooms: 50 };
      const firstRoll = first.considerCandidate(progress, candidate(50));
      const secondRoll = second.considerCandidate(progress, candidate(50));
      expect(firstRoll.roll).toBe(secondRoll.roll);

      for (let frame = 0; frame < 120; frame += 1) {
        first.update({ elapsedSeconds: 600 + frame / 60, uniqueRooms: 50 });
      }
      first.considerCandidate({ elapsedSeconds: 602, uniqueRooms: 50 }, candidate(50));
      first.considerCandidate(
        { elapsedSeconds: 603, uniqueRooms: 51 },
        candidate(51, { surfaceId: null }),
      );

      const nextFirst = first.considerCandidate(
        { elapsedSeconds: 604, uniqueRooms: 52 },
        candidate(52),
      );
      const nextSecond = second.considerCandidate(
        { elapsedSeconds: 604, uniqueRooms: 52 },
        candidate(52),
      );
      expect(nextFirst.roll).toBe(nextSecond.roll);
      expect(nextFirst.status).toBe('rejected');
    } finally {
      first.dispose();
      second.dispose();
    }
  });

  it('reserva una salida reproducible y protege su sala', () => {
    const first = new ExitDirector('certain-exit', withChance(1));
    const second = new ExitDirector('certain-exit', withChance(1));
    try {
      const progress = { elapsedSeconds: 600, uniqueRooms: 50 };
      const firstDecision = first.considerCandidate(progress, candidate(50));
      const secondDecision = second.considerCandidate(progress, candidate(50));
      expect(firstDecision.status).toBe('reserved');
      expect(firstDecision.reservation).toEqual(secondDecision.reservation);
      expect(firstDecision.reservation).toMatchObject({
        roomId: 'room-0050',
        surfaceId: 'north-wall-left',
        forced: false,
        forceReason: null,
        protectFromStreaming: true,
        protectFromLayoutShift: true,
      });
      expect(firstDecision.reservation?.roll).toBeTypeOf('number');
      expect(firstDecision.reservation?.seed).toBeTypeOf('number');
    } finally {
      first.dispose();
      second.dispose();
    }
  });

  it('activa garantías por tiempo, salas y cinco rechazos tardíos', () => {
    const noChance = withChance(0);
    const elapsed = new ExitDirector('elapsed-guarantee', noChance);
    const rooms = new ExitDirector('rooms-guarantee', noChance);
    const lateConfig: ExitDirectorConfig = {
      ...noChance,
      guarantee: {
        ...noChance.guarantee,
        forceElapsedSeconds: 5_000,
        forceUniqueRooms: 500,
      },
    };
    const late = new ExitDirector('late-guarantee', lateConfig);
    try {
      expect(
        elapsed.considerCandidate({ elapsedSeconds: 1_080, uniqueRooms: 80 }, candidate(80))
          .reservation?.forceReason,
      ).toBe('elapsed-limit');
      expect(
        rooms.considerCandidate({ elapsedSeconds: 800, uniqueRooms: 120 }, candidate(120))
          .reservation?.forceReason,
      ).toBe('room-limit');

      for (let index = 0; index < 5; index += 1) {
        const decision = late.considerCandidate(
          { elapsedSeconds: 900 + index, uniqueRooms: 60 + index },
          candidate(60 + index),
        );
        expect(decision.status).toBe('rejected');
      }
      expect(late.current.forcedPending).toBe(true);
      expect(late.current.forceReason).toBe('late-rejections');
      const forced = late.considerCandidate(
        { elapsedSeconds: 906, uniqueRooms: 66 },
        candidate(66),
      );
      expect(forced.status).toBe('reserved');
      expect(forced.reservation?.roll).toBeNull();
      expect(forced.reservation?.forceReason).toBe('late-rejections');
    } finally {
      elapsed.dispose();
      rooms.dispose();
      late.dispose();
    }
  });

  it('mantiene la fuerza pendiente hasta hallar un candidato seguro', () => {
    const director = new ExitDirector('short-mode-safety', withChance(0));
    try {
      const unsafe = director.considerCandidate(
        { elapsedSeconds: 5, uniqueRooms: 1, shortMode: true },
        candidate(1, { behindPlayer: true }),
      );
      expect(unsafe.status).toBe('invalid');
      expect(unsafe.snapshot.forcedPending).toBe(true);
      expect(unsafe.snapshot.forceReason).toBe('short-mode');

      const safe = director.considerCandidate(
        { elapsedSeconds: 6, uniqueRooms: 2, shortMode: true },
        candidate(2),
      );
      expect(safe.status).toBe('reserved');
      expect(safe.reservation?.forceReason).toBe('short-mode');
    } finally {
      director.dispose();
    }
  });

  it('reinicia la secuencia y rechaza regresiones de reloj o exploración', () => {
    const director = new ExitDirector('reset-exit', withChance(0));
    try {
      const first = director.considerCandidate(
        { elapsedSeconds: 600, uniqueRooms: 50 },
        candidate(50),
      );
      director.reset();
      const repeated = director.considerCandidate(
        { elapsedSeconds: 600, uniqueRooms: 50 },
        candidate(50),
      );
      expect(repeated.roll).toBe(first.roll);
      expect(() => director.update({ elapsedSeconds: 599, uniqueRooms: 50 })).toThrow(
        /cannot move backwards/i,
      );
      expect(() => director.update({ elapsedSeconds: 601, uniqueRooms: 49 })).toThrow(
        /cannot decrease/i,
      );
      director.dispose();
      expect(() => director.update({ elapsedSeconds: 602, uniqueRooms: 51 })).toThrow(/disposed/i);
    } finally {
      director.dispose();
    }
  });
});
