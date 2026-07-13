import { describe, expect, it, vi } from 'vitest';
import { GameStateMachine } from '../../src/app/GameStateMachine';

describe('GameStateMachine', () => {
  it('permite únicamente transiciones explícitas', () => {
    const machine = new GameStateMachine();

    expect(machine.canTransition('loading')).toBe(true);
    expect(machine.canTransition('playing')).toBe(false);
    expect(() => machine.transition('playing')).toThrow('Transición inválida');
  });

  it('notifica la transición con estado anterior y nuevo', () => {
    const machine = new GameStateMachine();
    const listener = vi.fn();
    machine.subscribe(listener);

    machine.transition('loading');

    expect(listener).toHaveBeenCalledWith('loading', 'boot');
    expect(machine.state).toBe('loading');
  });
});
