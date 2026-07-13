export type GameState =
  | 'boot'
  | 'loading'
  | 'title'
  | 'entering'
  | 'playing'
  | 'paused'
  | 'exitTransition'
  | 'ended'
  | 'fatalError';

const transitions: Readonly<Record<GameState, readonly GameState[]>> = {
  boot: ['loading', 'fatalError'],
  loading: ['title', 'fatalError'],
  title: ['entering', 'fatalError'],
  entering: ['playing', 'title', 'fatalError'],
  playing: ['paused', 'exitTransition', 'title', 'fatalError'],
  paused: ['playing', 'title', 'fatalError'],
  exitTransition: ['ended', 'fatalError'],
  ended: ['loading', 'title', 'fatalError'],
  fatalError: ['loading'],
};

export type StateListener = (next: GameState, previous: GameState) => void;

export class GameStateMachine {
  private currentState: GameState;
  private readonly listeners = new Set<StateListener>();

  public constructor(initialState: GameState = 'boot') {
    this.currentState = initialState;
  }

  public get state(): GameState {
    return this.currentState;
  }

  public canTransition(next: GameState): boolean {
    return transitions[this.currentState].includes(next);
  }

  public transition(next: GameState): void {
    if (!this.canTransition(next)) {
      throw new Error(`Transición inválida: ${this.currentState} → ${next}`);
    }

    const previous = this.currentState;
    this.currentState = next;
    for (const listener of this.listeners) {
      listener(next, previous);
    }
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
