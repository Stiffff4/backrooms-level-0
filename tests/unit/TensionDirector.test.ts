import { describe, expect, it } from 'vitest';

import { TensionDirector } from '../../src/tension/TensionDirector';
import { TENSION_EVENT_TYPES, type TensionUpdateInput } from '../../src/tension/tension.types';

function input(
  elapsedSeconds: number,
  roomSequence: number,
  changes: Partial<TensionUpdateInput> = {},
): TensionUpdateInput {
  return {
    elapsedSeconds,
    uniqueRooms: roomSequence + 1,
    currentRoomId: `room-${String(roomSequence).padStart(4, '0')}`,
    currentDefinitionId:
      roomSequence % 4 === 0 ? 'room_medium_rect' : `definition-${roomSequence % 7}`,
    currentDefinitionTags: [],
    playerSpeed: 2.65,
    secondsSinceMovement: 0,
    quality: 'default',
    reducedFlashing: false,
    exitDistance: null,
    layoutShiftCandidates: [`hidden-${roomSequence}`],
    ...changes,
  };
}

function simulate(director: TensionDirector): readonly string[] {
  const signatures: string[] = [];
  let roomSequence = 0;
  for (let seconds = 0; seconds <= 1_200; seconds += 5) {
    const result = director.update(input(seconds, roomSequence));
    roomSequence += 1;
    expect(result.snapshot.activeEvents.length).toBeLessThanOrEqual(1);
    signatures.push(
      ...result.startedEvents.map(
        (event) => `${event.type}@${event.startedAtSeconds}:${event.targetRoomId}`,
      ),
    );
  }
  return signatures;
}

describe('TensionDirector', () => {
  it('mantiene orientación estable durante los primeros dos minutos', () => {
    const director = new TensionDirector('stable-opening');
    try {
      let lastIntensity = 0;
      for (let seconds = 0, room = 0; seconds < 120; seconds += 4, room += 1) {
        const result = director.update(input(seconds, room));
        expect(result.startedEvents).toEqual([]);
        expect(result.snapshot.phase).toBe('orientation');
        expect(result.snapshot.eventCount).toBe(0);
        expect(result.snapshot.intensity).toBeGreaterThanOrEqual(lastIntensity);
        expect(result.snapshot.intensity).toBeLessThan(0.14);
        lastIntensity = result.snapshot.intensity;
      }
    } finally {
      director.dispose();
    }
  });

  it('atraviesa las cinco fases y eleva la tensión sin saltos fuera de rango', () => {
    const director = new TensionDirector('phase-curve');
    try {
      const samples = [
        director.update(input(0, 0)).snapshot,
        director.update(input(120, 1)).snapshot,
        director.update(input(360, 2)).snapshot,
        director.update(input(600, 3)).snapshot,
        director.update(input(960, 4)).snapshot,
        director.update(input(1_200, 5)).snapshot,
      ];
      expect(samples.map((sample) => sample.phase)).toEqual([
        'orientation',
        'monotony',
        'disorientation',
        'escalation',
        'resolution',
        'resolution',
      ]);
      for (const sample of samples) {
        expect(sample.intensity).toBeGreaterThanOrEqual(0);
        expect(sample.intensity).toBeLessThanOrEqual(1);
      }
      expect(samples.map((sample) => sample.intensity)).toEqual(
        [...samples.map((sample) => sample.intensity)].sort((left, right) => left - right),
      );
    } finally {
      director.dispose();
    }
  });

  it('produce una secuencia determinista con cooldowns, sin spam ni cues de entidades', () => {
    const first = new TensionDirector('twenty-minute-soak');
    const second = new TensionDirector('twenty-minute-soak');
    try {
      expect(simulate(first)).toEqual(simulate(second));
      const history = first.eventHistory;
      expect(history.length).toBeGreaterThan(8);
      expect(history.length).toBeLessThan(36);
      expect(history.every((event) => TENSION_EVENT_TYPES.includes(event.type))).toBe(true);
      expect(history.filter((event) => event.type === 'blackout')).toHaveLength(
        first.current.blackoutCount,
      );
      expect(first.current.blackoutCount).toBeLessThanOrEqual(1);
      expect(first.current.layoutShiftCount).toBeLessThanOrEqual(3);
      for (let index = 1; index < history.length; index += 1) {
        expect(history[index]?.type).not.toBe(history[index - 1]?.type);
      }
      const silence = history.filter((event) => event.type === 'silence');
      for (let index = 1; index < silence.length; index += 1) {
        expect(
          (silence[index]?.startedAtSeconds ?? 0) - (silence[index - 1]?.startedAtSeconds ?? 0),
        ).toBeGreaterThanOrEqual(90);
      }
      const repetitions = history.filter((event) => event.type === 'repetition-echo');
      for (let index = 1; index < repetitions.length; index += 1) {
        expect(
          (repetitions[index]?.startedAtSeconds ?? 0) -
            (repetitions[index - 1]?.startedAtSeconds ?? 0),
        ).toBeGreaterThanOrEqual(300);
      }
    } finally {
      first.dispose();
      second.dispose();
    }
  });

  it('fuerza efectos contextuales y limita la distorsión con reduced flashing', () => {
    const standard = new TensionDirector('forced-effects');
    const accessible = new TensionDirector('forced-effects');
    try {
      const standardPalette = standard.forceEvent('palette-shift', input(620, 40)).snapshot;
      const accessiblePalette = accessible.forceEvent(
        'palette-shift',
        input(620, 40, { reducedFlashing: true }),
      ).snapshot;
      expect(standardPalette.visualEffectStrength).toBeGreaterThan(0);
      expect(accessiblePalette.visualEffectStrength).toBeLessThan(
        standardPalette.visualEffectStrength / 2,
      );

      const cleared = standard.clearTransientEvents(input(621, 40));
      expect(cleared.endedEvents).toHaveLength(1);
      const layout = standard.forceEvent(
        'layout-shift',
        input(622, 41, { layoutShiftCandidates: ['hidden-safe-room'] }),
      );
      expect(layout.startedEvents[0]?.targetRoomId).toBe('hidden-safe-room');
      expect(layout.snapshot.layoutShiftCount).toBe(1);
      expect(layout.snapshot.activeEvents).toEqual([]);

      standard.forceEvent('blackout', input(623, 42));
      expect(standard.current.silenceFactor).toBeGreaterThan(0.98);
      expect(standard.current.blackoutCount).toBe(1);
    } finally {
      standard.dispose();
      accessible.dispose();
    }
  });

  it('reinicia la seed, rechaza tiempo inverso y no conserva eventos', () => {
    const director = new TensionDirector('reset-sequence');
    try {
      const first = simulate(director);
      director.reset();
      const repeated = simulate(director);
      expect(repeated).toEqual(first);
      expect(() => director.update(input(1_199, 999))).toThrow(/cannot move backwards/i);
    } finally {
      director.dispose();
    }
  });
});
