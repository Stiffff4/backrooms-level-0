import { describe, expect, it } from 'vitest';
import { SessionStats } from '../../src/game/SessionStats';

describe('SessionStats', () => {
  it('separa distancia caminada y corrida e ignora deltas inválidos', () => {
    const stats = new SessionStats();
    stats.recordMovement(1.25, false);
    stats.recordMovement(2.5, true);
    stats.recordMovement(Number.NaN, true);
    stats.recordMovement(-2, false);
    expect(stats.recordRoomVisit('room-1')).toBe(true);
    expect(stats.recordRoomVisit('room-1')).toBe(false);
    expect(stats.recordRoomVisit(' ')).toBe(false);

    expect(stats.snapshot(4)).toEqual({
      elapsedSeconds: 4,
      distanceWalked: 1.25,
      distanceSprinted: 2.5,
      roomsVisited: 1,
    });

    stats.reset();
    expect(stats.snapshot(0).roomsVisited).toBe(0);
  });
});
