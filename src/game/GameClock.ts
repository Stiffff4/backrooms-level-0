export interface ClockSource {
  now(): number;
}

const performanceClock: ClockSource = {
  now: () => performance.now(),
};

export class GameClock {
  private accumulatedMs = 0;
  private startedAt: number | null = null;

  public constructor(private readonly source: ClockSource = performanceClock) {}

  public get elapsedMs(): number {
    if (this.startedAt === null) {
      return this.accumulatedMs;
    }
    return this.accumulatedMs + (this.source.now() - this.startedAt);
  }

  public get elapsedSeconds(): number {
    return this.elapsedMs / 1000;
  }

  public start(): void {
    if (this.startedAt === null) {
      this.startedAt = this.source.now();
    }
  }

  public pause(): void {
    if (this.startedAt === null) {
      return;
    }
    this.accumulatedMs += this.source.now() - this.startedAt;
    this.startedAt = null;
  }

  public reset(): void {
    this.accumulatedMs = 0;
    this.startedAt = null;
  }
}
