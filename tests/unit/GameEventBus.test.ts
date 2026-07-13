import { describe, expect, it, vi } from 'vitest';
import { GameEventBus } from '../../src/app/GameEventBus';

describe('GameEventBus', () => {
  it('entrega payloads tipados y permite cancelar la suscripción', () => {
    const bus = new GameEventBus();
    const listener = vi.fn();
    const unsubscribe = bus.on('pointerLockChanged', listener);

    bus.emit('pointerLockChanged', { locked: true });
    unsubscribe();
    bus.emit('pointerLockChanged', { locked: false });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ locked: true });
  });
});
