export interface SessionStatsSnapshot {
  elapsedSeconds: number;
  distanceWalked: number;
  distanceSprinted: number;
}

export class SessionStats {
  private distanceWalked = 0;
  private distanceSprinted = 0;

  public recordMovement(distance: number, sprinting: boolean): void {
    if (!Number.isFinite(distance) || distance <= 0) {
      return;
    }

    if (sprinting) {
      this.distanceSprinted += distance;
    } else {
      this.distanceWalked += distance;
    }
  }

  public snapshot(elapsedSeconds: number): SessionStatsSnapshot {
    return {
      elapsedSeconds: Math.max(0, elapsedSeconds),
      distanceWalked: this.distanceWalked,
      distanceSprinted: this.distanceSprinted,
    };
  }

  public reset(): void {
    this.distanceWalked = 0;
    this.distanceSprinted = 0;
  }
}
