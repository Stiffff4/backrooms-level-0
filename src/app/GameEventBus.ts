import type { GameState } from './GameStateMachine';
import type { Vector3Like } from '../procedural/procedural.types';

export interface GameEvents {
  stateChanged: { next: GameState; previous: GameState };
  pointerLockChanged: { locked: boolean };
  roomEntered: { roomId: string; definitionId: string; firstVisit: boolean };
  originRebased: {
    sequence: number;
    worldDelta: Vector3Like;
    originOffset: Vector3Like;
  };
  settingsChanged: { key: string };
  fatalError: { error: unknown };
}

type EventName = keyof GameEvents;
type EventListener<K extends EventName> = (payload: GameEvents[K]) => void;

export class GameEventBus {
  private readonly listeners = new Map<EventName, Set<(payload: never) => void>>();

  public on<K extends EventName>(event: K, listener: EventListener<K>): () => void {
    const current = this.listeners.get(event) ?? new Set<(payload: never) => void>();
    current.add(listener as (payload: never) => void);
    this.listeners.set(event, current);
    return () => current.delete(listener as (payload: never) => void);
  }

  public emit<K extends EventName>(event: K, payload: GameEvents[K]): void {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(payload as never);
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}
