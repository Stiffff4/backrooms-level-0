export interface SessionStatsSnapshot {
  elapsedSeconds: number;
  distanceWalked: number;
  distanceSprinted: number;
  roomsVisited: number;
}

export class SessionStats {
  private distanceWalked = 0;
  private distanceSprinted = 0;
  private readonly visitedRoomIds = new Set<string>();

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

  public recordRoomVisit(roomId: string): boolean {
    const normalized = roomId.trim();
    if (!normalized || this.visitedRoomIds.has(normalized)) {
      return false;
    }
    this.visitedRoomIds.add(normalized);
    return true;
  }

  public snapshot(elapsedSeconds: number): SessionStatsSnapshot {
    return {
      elapsedSeconds: Math.max(0, elapsedSeconds),
      distanceWalked: this.distanceWalked,
      distanceSprinted: this.distanceSprinted,
      roomsVisited: this.visitedRoomIds.size,
    };
  }

  public reset(): void {
    this.distanceWalked = 0;
    this.distanceSprinted = 0;
    this.visitedRoomIds.clear();
  }
}
