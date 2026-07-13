import { describe, expect, it } from 'vitest';
import { GameClock, type ClockSource } from '../../src/game/GameClock';

class FakeClock implements ClockSource {
  public value = 0;

  public now(): number {
    return this.value;
  }
}

describe('GameClock', () => {
  it('cuenta solamente mientras la sesión está activa', () => {
    const source = new FakeClock();
    const clock = new GameClock(source);

    clock.start();
    source.value = 1_500;
    clock.pause();
    source.value = 9_000;

    expect(clock.elapsedSeconds).toBe(1.5);

    clock.start();
    source.value = 10_000;
    expect(clock.elapsedSeconds).toBe(2.5);
  });
});
